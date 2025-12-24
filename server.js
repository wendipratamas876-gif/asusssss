const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARE - HARUS PERTAMA
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// LOG SEMUA REQUEST
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    console.log('Body:', req.body);
    next();
});

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API ROUTES
app.get('/api/health', (req, res) => {
    console.log('Health check OK');
    res.json({ 
        status: 'OK', 
        message: 'KelvinVMXZ API is running',
        timestamp: new Date().toISOString()
    });
});

// LOGIN ENDPOINT - SIMPLE VERSION
app.post('/api/login', (req, res) => {
    console.log('=== LOGIN ATTEMPT ===');
    console.log('Username received:', req.body.username);
    console.log('Password received:', req.body.password);
    console.log('Full body:', req.body);
    
    // Cek jika request body kosong
    if (!req.body || !req.body.username || !req.body.password) {
        console.log('Missing username or password');
        return res.status(400).json({ 
            error: 'Username and password required',
            received: req.body
        });
    }
    
    const { username, password } = req.body;
    
    // TRIM dan lowercase untuk aman
    const user = username.toString().trim().toLowerCase();
    const pass = password.toString().trim();
    
    console.log('Checking:', user, 'vs admin');
    console.log('Password:', pass, 'vs kelvinvmxz');
    
    // SIMPLE CHECK - TANPA JWT DULU
    if (user === 'admin' && pass === 'kelvinvmxz') {
        console.log('✅ LOGIN SUCCESS');
        
        // Return simple token dulu
        return res.json({
            success: true,
            message: 'Login successful',
            token: 'kelvinvmxz_demo_token_' + Date.now(),
            user: {
                id: 1,
                username: 'admin',
                role: 'owner',
                plan: 'ultimate',
                maxConcurrent: 10,
                maxDuration: 3600,
                createdAt: new Date().toISOString()
            }
        });
    }
    
    console.log('❌ LOGIN FAILED');
    console.log('Expected: admin / kelvinvmxz');
    console.log('Received:', user, '/', pass);
    
    return res.status(401).json({ 
        success: false,
        error: 'Invalid username or password',
        hint: 'Use admin / kelvinvmxz',
        received: { username: user, password_length: pass.length }
    });
});

// ALL OTHER ROUTES GO TO INDEX.HTML
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// START SERVER
app.listen(PORT, () => {
    console.log('\n=========================================');
    console.log('🚀 KELVINVMXZ BOTNET CONTROL PANEL');
    console.log(`📡 Server running on port ${PORT}`);
    console.log(`🌐 http://localhost:${PORT}`);
    console.log('🔑 Login: admin / kelvinvmxz');
    console.log('=========================================\n');
});
