module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.status(200).json({
    status: 'ok',
    message: 'Infinity HQ - ADI Command Center',
    version: '0.2.0',
    features: ['adi-chat', 'auth', 'serverless'],
    timestamp: new Date().toISOString()
  });
};
