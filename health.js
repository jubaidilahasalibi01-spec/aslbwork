const {db,getToken,listProjects,init}=require('./_lib');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');
 const has=n=>!!(process.env[n]&&String(process.env[n]).trim()),r={};
 r.PAYPAL_CLIENT_ID=has('PAYPAL_CLIENT_ID')?'ada':'KOSONG';
 r.PAYPAL_SECRET=has('PAYPAL_SECRET')?'ada':'KOSONG';
 r.PAYPAL_ENV=String(process.env.PAYPAL_ENV||'').toLowerCase()==='live'?'live':'sandbox (PAYPAL_ENV bukan "live")';
 r.FIREBASE_SERVICE_ACCOUNT=has('FIREBASE_SERVICE_ACCOUNT')?'ada':'KOSONG';
 try{init();await db().ref('profile/name').get();r.firebase='OK'}catch(e){r.firebase='GAGAL: '+(e.pub||e.message)}
 try{const x=await getToken();r.paypal='OK (mode '+x.env+')'}catch(e){r.paypal='GAGAL: '+(e.pub||e.message)}
 try{const l=await listProjects();r.proyek=l.length;r.proyek_berharga=l.filter(x=>Number(String(x.price||'').replace(/[^\d.]/g,''))>0).length}catch(e){r.proyek='GAGAL: '+(e.pub||e.message)}
 r.siap=r.firebase==='OK'&&String(r.paypal).indexOf('OK')===0&&has('PAYPAL_CLIENT_ID');
 res.status(200).json(r);
};
