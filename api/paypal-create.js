const {admin,pp}=require('./_lib');
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).end();
 const id=String((req.body||{}).productId||'');
 if(!/^[A-Za-z0-9_-]{1,40}$/.test(id))return res.status(400).json({error:'Produk tidak valid.'});
 try{
  const p=(await admin.database().ref('products/'+id).get()).val();
  if(!p||!(Number(p.price)>0)||p.active===false)return res.status(404).json({error:'Produk tidak ditemukan.'});
  const o=await pp('/v2/checkout/orders','POST',{intent:'CAPTURE',purchase_units:[{custom_id:id,description:String(p.name).slice(0,120),amount:{currency_code:'USD',value:Number(p.price).toFixed(2)}}]});
  res.json({id:o.id});
 }catch(e){res.status(500).json({error:'Gagal membuat pesanan.'})}
};
