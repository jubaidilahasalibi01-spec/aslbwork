const { admin } = require('./_lib');

const ORIGINS = ['https://aslb.vercel.app', 'https://aslbwork.vercel.app'];

module.exports = async (req, res) => {
  const origin = req.headers.origin;

  // 1. Handle CORS & Blokir origin yang tidak diizinkan
  if (ORIGINS.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  } else if (origin) {
    // Tolak request jika origin ada tapi tidak terdaftar
    return res.status(403).json({ error: 'Origin tidak diizinkan.' });
  }

  // 2. Handle Preflight (OPTIONS)
  if (req.method === 'OPTIONS') {
    return res.status(204).end();
  }

  // 3. Hanya izinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed.' });
  }

  // 4. Safe body parsing (jaga-jaga jika req.body berupa string/buffer)
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch (e) {
      body = {};
    }
  }

  const code = String((body || {}).code || '').toUpperCase();

  // 5. Validasi format kode license
  const regex = /^ASLB-([0-9A-F]{4}-){4}[0-9A-F]{4}$/;
  if (!regex.test(code)) {
    return res.status(400).json({ error: 'Kode tidak valid.' });
  }

  try {
    // 6. Cek keberadaan dan status license di Firebase
    const snapshot = await admin.database().ref('licenses/' + code).get();
    const licenseData = snapshot.val();

    if (!licenseData || licenseData.status !== 'active' || licenseData.site !== true) {
      return res.status(404).json({ error: 'Kode tidak ditemukan atau tidak aktif.' });
    }

    // 7. Buat Firebase Custom Token
    const uid = 'buyer_' + code;
    const token = await admin.auth().createCustomToken(uid, { tenant: code });

    // 8. Return token
    return res.status(200).json({ token });

  } catch (error) {
    // 9. Log error ke console Vercel untuk debugging
    console.error('Error pada validasi license:', error);
    return res.status(500).json({ error: 'Terjadi kesalahan pada server.' });
  }
};
     
