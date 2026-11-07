const admin=require('firebase-admin');
if(!admin.apps.length)admin.initializeApp({credential:admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT)),databaseURL:process.env.FIREBASE_DB_URL});
const base=()=>process.env.PAYPAL_ENV==='live'?'https://api-m.paypal.com':'https://api-m.sandbox.paypal.com';
async function pp(path,method,body){
 const auth=Buffer.from(process.env.PAYPAL_CLIENT_ID+':'+process.env.PAYPAL_SECRET).toString('base64');
 const t=await (await fetch(base()+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+auth,'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'})).json();
 const r=await fetch(base()+path,{method,headers:{Authorization:'Bearer '+t.access_token,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const j=await r.json();if(!r.ok)throw new Error('paypal');return j;
}
function parsePrice(v){var s=String(v==null?'':v).replace(/[^\d.,]/g,'');if(!s)return 0;var lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
 if(lc>-1&&ld>-1){s=lc>ld?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'')}
 else if(lc>-1){s=(/,\d{1,2}$/.test(s)&&s.split(',').length===2)?s.replace(',','.'):s.replace(/,/g,'')}
 else if(ld>-1){if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'')}
 var n=parseFloat(s);return isFinite(n)&&n>0&&n<1e7?Math.round(n*100)/100:0}
async function findProject(title){const v=(await admin.database().ref('profile/projects').get()).val();const l=Array.isArray(v)?v:Object.values(v||{});return l.find(z=>z&&String(z.t)===title)||null}
module.exports={admin,pp,parsePrice,findProject};
