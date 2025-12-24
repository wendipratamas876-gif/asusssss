const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3000;
const JWT_SECRET = process.env.JWT_SECRET || 'kelvinvmxz_super_secret_key_2024_change_this_in_production';

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from public directory
app.use(express.static(path.join(__dirname, 'public')));

// API Routes
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Login attempt:', username, password); // Debug log
    
    // Default admin credentials - PAKAI BCRYPT COMPARE
    if (username === 'admin') {
        // Hash dari password 'kelvinvmxz'
        const hashedPassword = 'admin';
        
        try {
            const validPassword = await bcrypt.compare(password, hashedPassword);
            
            if (validPassword) {
                const token = jwt.sign(
                    { id: 1, username: 'admin', role: 'owner', plan: 'ultimate' },
                    JWT_SECRET,
                    { expiresIn: '24h' }
                );
                
                return res.json({
                    token,
                    user: {
                        id: 1,
                        username: 'admin',
                        role: 'owner',
                        plan: 'ultimate',
                        maxConcurrent: 10,
                        maxDuration: 3600
                    }
                });
            }
        } catch (error) {
            console.error('Bcrypt error:', error);
        }
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
});

// Simpan untuk testing tanpa bcrypt (temporary):
app.post('/api/login-simple', (req, res) => {
    const { username, password } = req.body;
    
    if (username === 'admin' && password === 'kelvinvmxz') {
        const token = jwt.sign(
            { id: 1, username: 'admin', role: 'owner', plan: 'ultimate' },
            JWT_SECRET,
            { expiresIn: '24h' }
        );
        
        return res.json({
            token,
            user: {
                id: 1,
                username: 'admin',
                role: 'owner',
                plan: 'ultimate',
                maxConcurrent: 10,
                maxDuration: 3600
            }
        });
    }
    
    res.status(401).json({ error: 'Invalid credentials' });
});

// Handle 404 for API routes
app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'API endpoint not found' });
});

// Serve index.html for all other routes (SPA routing)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
    console.log(`KelvinVMXZ Web Panel running on port ${PORT}`);
    console.log(`Access: http://localhost:${PORT}`);
    console.log(`Default login: admin / kelvinvmxz`);
});
