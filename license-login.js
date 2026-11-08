const {db,auth,body,fail}=require('./_lib');
const ORIGINS=['https://aslb.vercel.app','https://aslbadmin.vercel.app','https://aslbwork.vercel.app'];
module.exports=async(req,res)=>{
 const o=req.headers.origin;
 if(ORIGINS.includes(o)){res.setHeader('Access-Control-Allow-Origin',o);res.setHeader('Vary','Origin');res.setHeader('Access-Control-Allow-Headers','Content-Type');res.setHeader('Access-Control-Allow-Methods','POST,OPTIONS')}
 if(req.method==='OPTIONS')return res.status(204).end();
 if(req.method!=='POST')return res.status(405).end();
 const code=String(body(req).code||'').toUpperCase();
 if(!/^ASLB-([0-9A-F]{4}-){4}[0-9A-F]{4}$/.test(code))return res.status(400).json({error:'Kode tidak valid.'});
 try{
  const l=(await db().ref('licenses/'+code).get()).val();
  if(!l||l.status!=='active'||l.site!==true)return res.status(404).json({error:'Kode tidak ditemukan.'});
  const token=await auth().createCustomToken('buyer_'+code,{tenant:code});
  res.json({token});
 }catch(e){fail(res,e,'Gagal.')}
};
