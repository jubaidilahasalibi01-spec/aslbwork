const crypto = require('crypto');
const { admin, pp, parsePrice, findProject } = require('./_lib');
module.exports = async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method tidak diizinkan.' });
  const { orderID, name, email } = req.body || {};
  if (!/^[A-Z0-9]{10,30}$/i.test(orderID || '') || !String(name || '').trim() || !/^\S+@\S+\.\S+$/.test(email || '')) {
    return res.status(400).json({ error: 'Nama, email, atau nomor pesanan tidak valid.' });
  }
  const db = admin.database();
  try {
    const existing = (await db.ref('paypal/' + orderID).get()).val();
    if (existing && existing.code) return res.status(200).json({ code: existing.code });
    let order;
    try { order = await pp('/v2/checkout/orders/' + encodeURIComponent(orderID) + '/capture', 'POST'); }
    catch (captureError) {
      // If a previous request captured the payment but failed before issuing the code,
      // read the order and safely finish license issuance instead of failing permanently.
      order = await pp('/v2/checkout/orders/' + encodeURIComponent(orderID), 'GET');
    }
    const unit = order.purchase_units && order.purchase_units[0];
    const capture = unit && unit.payments && unit.payments.captures && unit.payments.captures[0];
    const productId = String((unit && unit.custom_id) || '');
    let item = null;
    if (productId.startsWith('pj:')) {
      const project = await findProject(productId.slice(3));
      const price = project ? parsePrice(project.price) : 0;
      if (price) item = { name: String(project.t), price, site: false };
    } else if (/^[A-Za-z0-9_-]{1,40}$/.test(productId)) {
      const product = (await db.ref('products/' + productId).get()).val();
      const price = product ? Number(product.price) : 0;
      if (product && Number.isFinite(price) && price > 0 && product.active !== false) item = { name: String(product.name), price, site: product.site === true };
    }
    if (order.status !== 'COMPLETED' || !capture || capture.status !== 'COMPLETED' || !item || !capture.amount || capture.amount.currency_code !== 'USD' || Number(capture.amount.value).toFixed(2) !== item.price.toFixed(2)) {
      return res.status(402).json({ error: 'Pembayaran belum terverifikasi selesai. Simpan nomor pesanan: ' + orderID });
    }
    // Reserve one code per PayPal order atomically to prevent duplicate licenses on retries.
    const codeRef = db.ref('paypal/' + orderID);
    const proposed = 'ASLB-' + crypto.randomBytes(10).toString('hex').toUpperCase().match(/.{4}/g).join('-');
    const tx = await codeRef.transaction(current => current && current.code ? current : { code: proposed, orderId: orderID, ts: admin.database.ServerValue.TIMESTAMP });
    const code = tx.snapshot.val().code;
    const licenseRef = db.ref('licenses/' + code);
    const license = (await licenseRef.get()).val();
    if (!license) {
      await licenseRef.set({
        name: String(name).trim().slice(0, 80), email: String(email).trim().slice(0, 120),
        orderId: orderID, productId, productName: item.name.slice(0, 120), site: item.site,
        status: 'active', ts: admin.database.ServerValue.TIMESTAMP
      });
    }
    return res.status(200).json({ code });
  } catch (error) {
    console.error('[paypal-capture]', error && error.message);
    return res.status(502).json({ error: 'Pembayaran belum dapat diverifikasi. Simpan nomor pesanan ' + orderID + ' dan hubungi pemilik website.' });
  }
};
