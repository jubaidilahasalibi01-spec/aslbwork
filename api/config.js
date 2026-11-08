module.exports=(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 res.json({clientId:String(process.env.PAYPAL_CLIENT_ID||'').trim()||null,name:process.env.PRODUCT_NAME||'Asalibi Studio'});
};
