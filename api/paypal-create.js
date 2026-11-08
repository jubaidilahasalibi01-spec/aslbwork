const {db,pp,parsePrice,findProject,body,fail}=require('./_lib');
module.exports=async(req,res)=>{
 if(req.method!=='POST')return res.status(405).json({error:'Metode tidak didukung.'});
 const b=body(req);
 try{
  let cid,name,price;
  if(b.projectTitle){
   const t=String(b.projectTitle).slice(0,100),x=await findProject(t);price=x?parsePrice(x.price):0;
   if(!price)return res.status(404).json({error:'Proyek tidak ditemukan atau belum berharga.'});
   cid='pj:'+t;name=t;
  }else{
   const id=String(b.productId||'');
   if(!/^[A-Za-z0-9_-]{1,40}$/.test(id))return res.status(400).json({error:'Produk tidak valid.'});
   const p=(await db().ref('products/'+id).get()).val();
   if(!p||!(Number(p.price)>0)||p.active===false)return res.status(404).json({error:'Produk tidak ditemukan.'});
   cid=id;name=String(p.name);price=Number(p.price);
  }
  const o=await pp('/v2/checkout/orders','POST',{intent:'CAPTURE',purchase_units:[{custom_id:cid,description:name.slice(0,120),amount:{currency_code:'USD',value:price.toFixed(2)}}]});
  res.json({id:o.id});
 }catch(e){fail(res,e,'Gagal membuat pesanan PayPal. Coba lagi sebentar.')}
};
