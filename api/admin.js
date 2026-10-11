import {neon} from '@neondatabase/serverless';
import {passwordMatches,newToken,hashToken} from '../server/auth.js';
import {readBotSettings} from '../server/bot-settings.js';
import {validateBotSettings} from '../src/bot-settings.js';
const COOKIE='__Host-forja_admin';
const fail=(res,status,error)=>res.status(status).json({error});
const cookie=(res,token,age=28800)=>res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Strict; Max-Age=${age}`);
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return fail(res,405,'Método no permitido.');
 if(!process.env.DATABASE_URL||!process.env.ADMIN_PASSWORD_HASH)return fail(res,503,'Administración no configurada.');
 if(req.method==='POST'){
  let origin;try{origin=new URL(req.headers.origin||'').host;}catch{return fail(res,403,'Origen no permitido.');}
  if(origin!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')return fail(res,403,'Origen no permitido.');
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return fail(res,415,'Se requiere JSON.');
 }
 try{
  const sql=neon(process.env.DATABASE_URL);
  let body=req.body||{};if(typeof body==='string'){if(body.length>8192)return fail(res,413,'Solicitud demasiado grande.');try{body=JSON.parse(body);}catch{return fail(res,400,'JSON inválido.');}}
  if(!body||JSON.stringify(body).length>8192)return fail(res,400,'Solicitud inválida.');
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const validToken=token&&/^[a-f0-9]{64}$/.test(token);
  if(req.method==='POST'&&body.action==='login'){
   if(typeof body.password!=='string'||body.password.length>128)return fail(res,400,'Contraseña inválida.');
   const ip=String(req.headers['x-real-ip']||req.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
   const rate=await sql`insert into forja_game.auth_limits(key,attempts) values (${hashToken('admin:'+ip)},1) on conflict(key) do update set attempts=case when forja_game.auth_limits.window_start<now()-interval '10 minutes' then 1 else forja_game.auth_limits.attempts+1 end,window_start=case when forja_game.auth_limits.window_start<now()-interval '10 minutes' then now() else forja_game.auth_limits.window_start end where forja_game.auth_limits.window_start<now()-interval '10 minutes' or forja_game.auth_limits.attempts<5 returning key`;
   if(!rate.length)return fail(res,429,'Demasiados intentos. Espera diez minutos.');
   if(!await passwordMatches(body.password,process.env.ADMIN_PASSWORD_HASH))return fail(res,401,'Contraseña incorrecta.');
   const fresh=newToken();await sql`insert into forja_game.admin_sessions(token_hash) values (${hashToken(fresh)})`;
   if(validToken)await sql`delete from forja_game.admin_sessions where token_hash=${hashToken(token)}`;
   cookie(res,fresh);return res.status(200).json({authenticated:true,...await readBotSettings(sql)});
  }
  const session=validToken?(await sql`select token_hash from forja_game.admin_sessions where token_hash=${hashToken(token)} and expires_at>now()`)[0]:null;
  if(!session)return fail(res,401,'Inicia sesión como administrador.');
  if(req.method==='GET')return res.status(200).json({authenticated:true,...await readBotSettings(sql)});
  if(body.action==='logout'){await sql`delete from forja_game.admin_sessions where token_hash=${hashToken(token)}`;cookie(res,'',0);return res.status(200).json({authenticated:false});}
  if(body.action==='save'){
   let settings;try{settings=validateBotSettings(body.settings);}catch(e){return fail(res,400,e.message);}
   if(!Number.isInteger(body.revision)||body.revision<0)return fail(res,400,'Revisión inválida.');
   const updated=body.revision===0
    ?await sql`insert into forja_game.bot_settings(id,settings,revision) values (true,${JSON.stringify(settings)}::jsonb,1) on conflict(id) do nothing returning revision`
    :await sql`update forja_game.bot_settings set settings=${JSON.stringify(settings)}::jsonb,revision=revision+1,updated_at=now() where id=true and revision=${body.revision} returning revision`;
   if(!updated.length)return fail(res,409,'Otra sesión cambió los ajustes. Recarga el panel.');
   return res.status(200).json({authenticated:true,settings,revision:updated[0].revision});
  }
  return fail(res,400,'Acción desconocida.');
 }catch(e){console.error('forja_admin_error',e.code||'server_error');return fail(res,503,'No se pudo completar la operación.');}
}
