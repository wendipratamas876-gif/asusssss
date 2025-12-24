const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Login endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body || {};
  
  const userLower = (username || '').toString().toLowerCase().trim();
  const pass = (password || '').toString().trim();
  
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
        maxDuration: 3600
      }
    });
  }
  
  return res.status(401).json({ 
    error: 'Invalid username or password'
  });
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
});

// Static files fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
