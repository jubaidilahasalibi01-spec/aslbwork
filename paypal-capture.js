const crypto=require('crypto');
const {db,stamp,pp,parsePrice,findProject,body,fail}=require('./_lib');
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Metode tidak didukung.'});
 const {orderID,name,email}=body(req);
 if(!/^[A-Z0-9]{10,30}$/i.test(orderID||'')||!String(name||'').trim()||!/^\S+@\S+\.\S+$/.test(email||''))return res.status(400).json({error:'Data tidak valid.'});
 try{
  const d=db();
  const old=(await d.ref('paypal/'+orderID).get()).val();
  if(old&&old.code)return res.json({code:old.code});
  let cap;
  try{cap=await pp('/v2/checkout/orders/'+orderID+'/capture','POST')}
  catch(e){if(e.pp&&JSON.stringify(e.pp).indexOf('ORDER_ALREADY_CAPTURED')>-1)cap=await pp('/v2/checkout/orders/'+orderID,'GET');else throw e}
  const u=cap.purchase_units&&cap.purchase_units[0],c=u&&u.payments&&u.payments.captures&&u.payments.captures[0];
  const pid=String((u&&u.custom_id)||'');
  let item=null;
  if(pid.indexOf('pj:')===0){const x=await findProject(pid.slice(3)),pr=x?parsePrice(x.price):0;if(pr)item={name:String(x.t),price:pr,site:false}}
  else if(pid){const p=(await d.ref('products/'+pid).get()).val();if(p)item={name:String(p.name),price:Number(p.price),site:p.site===true}}
  if(cap.status!=='COMPLETED'||!c||c.status!=='COMPLETED'||!item||c.amount.currency_code!=='USD'||Number(c.amount.value)<item.price)return res.status(402).json({error:'Pembayaran belum lengkap. Simpan nomor pesanan: '+orderID});
  const h=crypto.randomBytes(10).toString('hex').toUpperCase(),code='ASLB-'+h.match(/.{4}/g).join('-');
  await d.ref().update({['licenses/'+code]:{name:String(name).trim().slice(0,80),email:String(email).slice(0,120),orderId:orderID,productId:pid,productName:item.name.slice(0,120),amount:String(c.amount.value),site:item.site,status:'active',ts:stamp()},['paypal/'+orderID]:{code}});
  res.json({code});
 }catch(e){console.error('capture',orderID,e&&e.stack||e);res.status(500).json({error:(e&&e.pub)||'Gagal memproses. Simpan nomor pesanan: '+orderID})}
};
