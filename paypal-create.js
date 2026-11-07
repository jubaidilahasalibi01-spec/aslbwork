const { admin, pp, parsePrice, findProject } = require('./_lib');

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  const b = req.body || {};
  try {
    let cid, name, price;
    if (b.projectTitle) {
      const t = String(b.projectTitle).slice(0, 100), x = await findProject(t);
      price = x ? parsePrice(x.price) : 0;
      if (!price) return res.status(404).json({ error: 'Proyek tidak ditemukan.' });
      cid = 'pj:' + t; name = t;
    } else {
      const id = String(b.productId || '');
      if (!/^[A-Za-z0-9_-]{1,40}$/.test(id)) return res.status(400).json({ error: 'Produk tidak valid.' });
      const p = (await admin.database().ref('products/' + id).get()).val();
      if (!p || !(Number(p.price) > 0) || p.active === false) return res.status(404).json({ error: 'Produk tidak ditemukan.' });
      cid = id; name = String(p.name); price = Number(p.price);
    }

    // PEMBERSIH UTAMA: Hapus total semua simbol aneh, angka acak, atau karakter khusus, sisakan huruf, spasi, titik, dan strip saja.
    const cleanName = name.replace(/[^\w\s.-]/gi, ' ').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Digital Product';

    const o = await pp('/v2/checkout/orders', 'POST', {
      intent: 'CAPTURE',
      purchase_units: [{
        custom_id: cid,
        description: cleanName,
        amount: { currency_code: 'USD', value: price.toFixed(2) }
      }]
    });
    
    if (!o || !o.id) {
      return res.status(500).json({ error: 'Gagal membuat pesanan ke PayPal.' });
    }

    res.json({ id: o.id });
  } catch (e) {
    res.status(500).json({ error: 'Gagal terhubung ke server PayPal.' });
  }
};
                                                               
