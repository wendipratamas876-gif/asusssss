// api/login/index.js
const express = require('express');

const app = express();
app.use(express.json());

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  console.log('=== LOGIN REQUEST RECEIVED ===');
  console.log('Body:', req.body);
  
  const { username, password } = req.body || {};
  
  const userLower = (username || '').toString().toLowerCase().trim();
  const pass = (password || '').toString().trim();
  
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
  
  return res.status(401).json({ 
    error: 'Invalid username or password',
    hint: 'Use: admin / kelvinvmxz'
  });
};
