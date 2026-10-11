import{neon}from'@neondatabase/serverless';
import{createHash,randomBytes}from'node:crypto';
import{validateProfile}from'../server/profile.js';
const COOKIE='__Host-forja_session';
const hash=v=>createHash('sha256').update(v).digest('hex');
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method)){res.setHeader('Allow','GET, POST');return res.status(405).json({error:'Método no permitido.'});}
 if(!process.env.DATABASE_URL)return res.status(503).json({error:'Guardado remoto pendiente de configuración.'});
 if(req.method==='POST'){
  const host=req.headers.host;let origin;try{origin=new URL(req.headers.origin||'').host;}catch{return res.status(403).json({error:'Origen no permitido.'});}
  if(origin!==host||req.headers['sec-fetch-site']==='cross-site')return res.status(403).json({error:'Origen no permitido.'});
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return res.status(415).json({error:'Se requiere JSON.'});
 }
 try{
  const sql=neon(process.env.DATABASE_URL);
  const raw=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  let token=raw&&/^[a-f0-9]{64}$/.test(raw)?raw:null;
  let session=token?(await sql`select token_hash from forja_training.sessions where token_hash=${hash(token)} and expires_at>now()`)[0]:null;
  if(!session){
   if(req.method==='GET')return res.status(200).json({configured:true,profile:null,mode:'anonymous-training'});
   token=randomBytes(32).toString('hex');await sql`insert into forja_training.sessions(token_hash) values (${hash(token)})`;
   res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`);
  }
  const tokenHash=hash(token);
  if(req.method==='GET'){const rows=await sql`select profile,updated_at from forja_training.saves where token_hash=${tokenHash}`;return res.status(200).json({configured:true,profile:rows[0]?.profile||null,mode:'anonymous-training'});}
  let body=req.body;if(typeof body==='string'){if(body.length>16384)return res.status(413).json({error:'Datos demasiado grandes.'});try{body=JSON.parse(body);}catch{return res.status(400).json({error:'JSON inválido.'});}}
  if(JSON.stringify(body||{}).length>16384)return res.status(413).json({error:'Datos demasiado grandes.'});
  let profile;try{profile=validateProfile(body?.profile);}catch(e){return res.status(400).json({error:e.message});}
  const limited=await sql`update forja_training.sessions set writes=case when write_window<now()-interval '1 minute' then 1 else writes+1 end,write_window=case when write_window<now()-interval '1 minute' then now() else write_window end where token_hash=${tokenHash} and (write_window<now()-interval '1 minute' or writes<20) returning token_hash`;
  if(!limited.length){res.setHeader('Retry-After','60');return res.status(429).json({error:'Demasiados guardados. Espera un minuto.'});}
  await sql`insert into forja_training.saves(token_hash,profile) values (${tokenHash},${JSON.stringify(profile)}::jsonb) on conflict(token_hash) do update set profile=excluded.profile,updated_at=now()`;
  return res.status(200).json({saved:true,mode:'anonymous-training'});
 }catch(e){console.error('forja_storage_error',e.code||'database_error');return res.status(503).json({error:'No se pudo acceder al guardado. Tu progreso local está disponible.'});}
}
