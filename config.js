module.exports=(req,res)=>res.json({clientId:process.env.PAYPAL_CLIENT_ID,name:process.env.PRODUCT_NAME||'Toko'});
