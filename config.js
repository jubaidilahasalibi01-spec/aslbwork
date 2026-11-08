module.exports = (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const clientId = process.env.PAYPAL_CLIENT_ID || '';
  const mode = String(process.env.PAYPAL_ENV || '').toLowerCase();
  res.status(200).json({ clientId, mode: (mode === 'live' || mode === 'sandbox') ? mode : null, name: process.env.PRODUCT_NAME || 'Asalibi Studio' });
};
