const express = require('express');
const cors = require('cors');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'kelvinvmxz_super_secret_key_2024';

// Middleware - HARUS SEBELUM ROUTES
app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// Debug middleware
app.use((req, res, next) => {
    console.log(`${req.method} ${req.url}`);
    next();
});

// API Routes
app.get('/api/health', (req, res) => {
    console.log('Health check called');
    res.json({ 
        status: 'OK', 
        timestamp: new Date().toISOString(),
        message: 'KelvinVMXZ API is running'
    });
});

// SIMPLE LOGIN - NO BCRYPT FOR NOW
app.post('/api/login', (req, res) => {
    console.log('Login attempt received:', req.body);
    
    const { username, password } = req.body;
    
    // SIMPLE CHECK - NO BCRYPT
    if (username === 'admin' && password === 'kelvinvmxz') {
        console.log('Login SUCCESS');
        
        const token = jwt.sign(
            { 
                id: 1, 
                username: 'admin', 
                role: 'owner', 
                plan: 'ultimate' 
            },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        return res.json({
            success: true,
            token: token,
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
    
    console.log('Login FAILED');
    res.status(401).json({ 
        success: false,
        error: 'Invalid username or password' 
    });
});

// Handle preflight OPTIONS
app.options('*', (req, res) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.sendStatus(200);
});

// Serve SPA
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Error handling
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
    console.log('=========================================');
    console.log('🚀 KelvinVMXZ Botnet Control Panel');
    console.log(`📡 Port: ${PORT}`);
    console.log('🔗 URL: http://localhost:' + PORT);
    console.log('🔑 Login: admin / kelvinvmxz');
    console.log('=========================================');
});
