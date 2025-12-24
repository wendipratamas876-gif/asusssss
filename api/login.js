export default function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Credentials', true);
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Handle OPTIONS preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Only POST allowed
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    console.log('Login request body:', req.body);
    
    const { username, password } = req.body;
    
    // Validate
    if (!username || !password) {
      return res.status(400).json({ 
        error: 'Username and password required' 
      });
    }
    
    // Trim and lowercase
    const user = username.toString().toLowerCase().trim();
    const pass = password.toString().trim();
    
    console.log(`Login attempt: ${user} / ${pass}`);
    
    // CHECK CREDENTIALS - CASE SENSITIVE FOR PASSWORD
    if (user === 'admin' && pass === 'kelvinvmxz') {
      console.log('✅ Login successful');
      
      return res.status(200).json({
        success: true,
        token: 'kelvinvmxz_vercel_token_' + Date.now(),
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
    
    console.log(`❌ Login failed: ${user} / ${pass}`);
    
    return res.status(401).json({
      success: false,
      error: 'Invalid username or password',
      hint: 'Use: admin (lowercase) / kelvinvmxz (exact)'
    });
    
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ error: 'Internal server error' });
  }
}
