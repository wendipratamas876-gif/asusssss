// api/login.js
const express = require('express');

module.exports = async (req, res) => {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    // Parse JSON body
    let body = '';
    req.on('data', chunk => body += chunk);
    
    req.on('end', () => {
      try {
        const data = JSON.parse(body || '{}');
        console.log('Login attempt:', data);
        
        const { username, password } = data;
        
        // Process
        const userLower = (username || '').toString().toLowerCase().trim();
        const pass = (password || '').toString().trim();
        
        console.log(`Received: "${userLower}" / "${pass}"`);
        console.log(`Expected: "admin" / "kelvinvmxz"`);
        
        // Check credentials
        if (userLower === 'admin' && pass === 'kelvinvmxz') {
          console.log('✅ LOGIN SUCCESS');
          
          return res.status(200).json({
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
          hint: 'Use: admin / kelvinvmxz',
          debug: {
            received_username: userLower,
            received_password_length: pass.length
          }
        });
        
      } catch (parseError) {
        console.error('JSON parse error:', parseError);
        return res.status(400).json({ error: 'Invalid JSON' });
      }
    });
    
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
};
