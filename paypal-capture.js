const crypto=require('crypto');const {admin,pp,parsePrice,findProject}=require('./_lib');
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).end();
 const {orderID,name,email}=req.body||{};
 if(!/^[A-Z0-9]{10,30}$/i.test(orderID||'')||!String(name||'').trim()||!/^\S+@\S+\.\S+$/.test(email||''))return res.status(400).json({error:'Data tidak valid.'});
 const db=admin.database();
 try{
  const old=(await db.ref('paypal/'+orderID).get()).val();
  if(old)return res.json({code:old.code});
  const cap=await pp('/v2/checkout/orders/'+orderID+'/capture','POST');
  const u=cap.purchase_units&&cap.purchase_units[0],c=u&&u.payments.captures[0];
  const pid=String((u&&u.custom_id)||'');
  let item=null;
  if(pid.startsWith('pj:')){const x=await findProject(pid.slice(3)),pr=x?parsePrice(x.price):0;if(pr)item={name:String(x.t),price:pr,site:false}}
  else if(pid){const p=(await db.ref('products/'+pid).get()).val();if(p)item={name:String(p.name),price:Number(p.price),site:p.site===true}}
  if(cap.status!=='COMPLETED'||!c||c.status!=='COMPLETED'||!item||c.amount.currency_code!=='USD'||Number(c.amount.value)<item.price)return res.status(402).json({error:'Pembayaran belum lengkap. Simpan nomor pesanan: '+orderID});
  const h=crypto.randomBytes(10).toString('hex').toUpperCase(),code='ASLB-'+h.match(/.{4}/g).join('-');
  await db.ref().update({['licenses/'+code]:{name:String(name).trim().slice(0,80),email:String(email).slice(0,120),orderId:orderID,productId:pid,productName:item.name.slice(0,120),site:item.site,status:'active',ts:admin.database.ServerValue.TIMESTAMP},['paypal/'+orderID]:{code}});
  res.json({code});
 }catch(e){res.status(500).json({error:'Gagal memproses. Simpan nomor pesanan: '+orderID})}
};
