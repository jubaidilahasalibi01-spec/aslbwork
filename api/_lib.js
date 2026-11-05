const
admin=require('firebase-admin');
if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),databaseURL:process.env.FIREBASE_DB_URL});
const base=()=>process.env.PAYPAL_ENV==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';
async function pp(path,method,body){
 const auth=Buffer.from(process.env.PAYPAL_CLIENT_ID+':'+process.env.PAYPAL_SECRET).toString('base64');
 const t=await (await fetch(base()+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})).json();
 const r=await fetch(base()+path,{method,headers:{Authorization:'Bearer '+t.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const j=await r.json();if(!r.ok)throw new Error('paypal');return j;
}
module.exports={admin,pp};
