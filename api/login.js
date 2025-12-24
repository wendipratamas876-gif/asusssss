export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }
    
    const userLower = String(username).toLowerCase().trim();
    const pass = String(password).trim();
    
    // Hardcoded credentials
    if (userLower === 'admin' && pass === 'kelvinvmxz') {
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
    
    return res.status(401).json({
      error: 'Invalid username or password'
    });
    
  } catch (error) {
    return res.status(500).json({ error: 'Internal server error' });
  }
}
