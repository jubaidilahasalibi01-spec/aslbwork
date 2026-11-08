const { admin, pp, parsePrice, findProject } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method tidak diizinkan.' });
  try {
    const body = req.body || {};
    let customId, title, price;
    if (body.projectTitle) {
      title = String(body.projectTitle).trim().slice(0, 100);
      const project = await findProject(title);
      price = project ? parsePrice(project.price) : 0;
      if (!price) return res.status(404).json({ error: 'Proyek tidak ditemukan atau belum memiliki harga.' });
      customId = 'pj:' + title;
    } else {
      const id = String(body.productId || '');
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return res.status(400).json({ error: 'Produk tidak valid.' });
      const product = (await admin.database().ref('products/' + id).get()).val();
      price = product ? Number(product.price) : 0;
      if (!product || !Number.isFinite(price) || price <= 0 || product.active === false) return res.status(404).json({ error: 'Produk tidak ditemukan atau tidak aktif.' });
      title = String(product.name || 'Produk').slice(0, 120);
      customId = id;
    }
    const order = await pp('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE',
      purchase_units: [{ custom_id: customId, description: title, amount: { currency_code: 'USD', value: price.toFixed(2) } }]
    });
    if (!order.id) throw new Error('PayPal did not return an order ID.');
    return res.status(200).json({ id: order.id });
  } catch (error) {
    console.error('[paypal-create]', error && error.message);
    const msg = String(error && error.message || '');
    const config = /PAYPAL_ENV|PAYPAL_CLIENT_ID|PAYPAL_SECRET|FIREBASE_SERVICE_ACCOUNT|FIREBASE_DB_URL/.test(msg);
    return res.status(config ? 503 : 502).json({ error: config ? 'Konfigurasi pembayaran di server belum benar. Periksa Environment Variables Vercel.' : 'PayPal gagal membuat pesanan. Periksa mode Sandbox/Live dan kredensial PayPal.' });
  }
};
