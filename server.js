const express = require('express');
const cors = require('cors');

const app = express();

// CORS middleware HARUS di awal
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// LOG middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} ${req.method} ${req.path}`);
  if (req.method === 'POST' && req.path === '/api/login') {
    console.log('Login body:', JSON.stringify(req.body));
  }
  next();
});

// Simple login endpoint
app.post('/api/login', (req, res) => {
  console.log('=== LOGIN REQUEST RECEIVED ===');
  console.log('Body:', req.body);
  
  // Check if body exists
  if (!req.body) {
    console.log('No body received');
    return res.status(400).json({ error: 'No data received' });
  }
  
  const { username, password } = req.body;
  
  console.log(`Username: "${username}", Password: "${password}"`);
  console.log(`Username type: ${typeof username}, Password type: ${typeof password}`);
  
  // Case insensitive check for username
  const userLower = (username || '').toString().toLowerCase().trim();
  const pass = (password || '').toString().trim();
  
  console.log(`After processing - Username: "${userLower}", Password: "${pass}"`);
  
  // HARDCODED CREDENTIALS
  if (userLower === 'admin' && pass === 'kelvinvmxz') {
    console.log('✅ LOGIN SUCCESSFUL');
    
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
        maxDuration: 3600
      }
    });
  }
  
  console.log('❌ LOGIN FAILED');
  console.log(`Expected: admin / kelvinvmxz`);
  console.log(`Got: ${userLower} / ${pass}`);
  
  return res.status(401).json({ 
    error: 'Invalid username or password',
    hint: 'Use: admin / kelvinvmxz',
    received: {
      username: userLower,
      password_length: pass.length
    }
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'KelvinVMXZ API is running',
    timestamp: new Date().toISOString()
  });
});

// Handle OPTIONS preflight
app.options('*', (req, res) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.sendStatus(200);
});

// 404 for unknown API routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

module.exports = app;
