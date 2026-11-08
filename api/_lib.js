const admin=require('firebase-admin');
const DBURL='https://aslb-189b4-default-rtdb.asia-southeast1.firebasedatabase.app';
function need(n){const v=process.env[n];if(!v||!String(v).trim()){const e=new Error('ENV_'+n);e.pub='Variabel '+n+' belum diisi di Vercel (Settings > Environment Variables).';throw e}return String(v).trim()}
function init(){
 if(admin.apps.length)return;
 let sa;
 try{sa=JSON.parse(need('FIREBASE_SERVICE_ACCOUNT'))}catch(e){if(e.pub)throw e;const x=new Error('SA_JSON');x.pub='FIREBASE_SERVICE_ACCOUNT bukan JSON yang valid. Tempel ulang seluruh isi file service account.';throw x}
 if(sa.private_key)sa.private_key=String(sa.private_key).replace(/\\n/g,'\n');
 admin.initializeApp({credential:admin.credential.cert(sa),databaseURL:(process.env.FIREBASE_DB_URL||DBURL).trim()});
}
const db=()=>{init();return admin.database()};
const auth=()=>{init();return admin.auth()};
const stamp=()=>admin.database.ServerValue.TIMESTAMP;

const HOST={live:'https://api-m.paypal.com',sandbox:'https://api-m.sandbox.paypal.com'};
let envCache=null;
async function tokenFor(env){
 const id=need('PAYPAL_CLIENT_ID'),sec=need('PAYPAL_SECRET');
 const r=await fetch(HOST[env]+'/v1/oauth2/token',{method:'POST',headers:{Authorization:'Basic '+Buffer.from(id+':'+sec).toString('base64'),'Content-Type':'application/x-www-form-urlencoded'},body:'grant_type=client_credentials'});
 const j=await r.json().catch(()=>({}));
 if(!r.ok||!j.access_token){const e=new Error('PP_AUTH_'+env+'_'+(j.error||r.status));e.isAuth=true;throw e}
 return j.access_token;
}
async function getToken(){
 const pref=String(process.env.PAYPAL_ENV||'').trim().toLowerCase()==='live'?'live':'sandbox';
 const order=envCache?[envCache]:[pref,pref==='live'?'sandbox':'live'];
 for(const env of order){
  try{const t=await tokenFor(env);envCache=env;return{t,env}}
  catch(e){if(!e.isAuth)throw e}
 }
 envCache=null;
 const x=new Error('PP_AUTH');x.pub='PayPal menolak Client ID / Secret. Pastikan PAYPAL_CLIENT_ID dan PAYPAL_SECRET berasal dari aplikasi PayPal yang sama.';throw x;
}
async function pp(path,method,body){
 const {t,env}=await getToken();
 const r=await fetch(HOST[env]+path,{method:method||'GET',headers:{Authorization:'Bearer '+t,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
 const j=await r.json().catch(()=>({}));
 if(!r.ok){console.error('PayPal API error',path,r.status,JSON.stringify(j).slice(0,600));const e=new Error('PP_'+r.status);e.pp=j;e.status=r.status;throw e}
 return j;
}
function parsePrice(v){var s=String(v==null?'':v).replace(/[^\d.,]/g,'');if(!s)return 0;var lc=s.lastIndexOf(','),ld=s.lastIndexOf('.');
 if(lc>-1&&ld>-1){s=lc>ld?s.replace(/\./g,'').replace(',','.'):s.replace(/,/g,'')}
 else if(lc>-1){s=(/,\d{1,2}$/.test(s)&&s.split(',').length===2)?s.replace(',','.'):s.replace(/,/g,'')}
 else if(ld>-1){if(/^\d{1,3}(\.\d{3})+$/.test(s))s=s.replace(/\./g,'')}
 var n=parseFloat(s);return isFinite(n)&&n>0&&n<1e7?Math.round(n*100)/100:0}
async function listProjects(){const v=(await db().ref('profile/projects').get()).val();return(Array.isArray(v)?v:Object.values(v||{})).filter(z=>z&&z.t)}
async function findProject(title){const t=String(title).trim();return(await listProjects()).find(z=>String(z.t).trim()===t)||null}
function body(req){let b=req.body;if(typeof b==='string'){try{b=JSON.parse(b)}catch(e){b={}}}return b&&typeof b==='object'?b:{}}
function fail(res,e,def){console.error(e&&e.stack||e);return res.status(500).json({error:(e&&e.pub)||def})}
module.exports={admin,db,auth,stamp,init,pp,getToken,parsePrice,listProjects,findProject,body,fail};
