// api/health.js
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.json({
    status: 'OK',
    message: 'API is running',
    timestamp: new Date().toISOString()
  });
};
