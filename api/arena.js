import {leaderboard,rankingPage} from '../server/leaderboard.js';
import {randomInt} from 'node:crypto';
import {levelFromXp,leveledStats,SCENARIOS,validCosmetics} from '../src/progression.js';
import {neon} from '@neondatabase/serverless';
import {credentials,passwordHash,passwordMatches,newToken,hashToken} from '../server/auth.js';
import {replay} from '../server/replay.js';
import {builds,RULES_VERSION} from '../src/combat.js';
const COOKIE='__Host-forja_account';
const LIMIT=10;
const fail=(res,status,error)=>res.status(status).json({error});
function sessionCookie(res,token,age=2592000){res.setHeader('Set-Cookie',`${COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${age}`);}
async function state(sql,user){
 const quota=await sql`select used from forja_game.daily_usage where user_id=${user.id} and day=(now() at time zone 'America/Hermosillo')::date`;
 const history=await sql`select result,duration,created_at,snapshot from forja_game.matches where user_id=${user.id} and status='finished' order by created_at desc limit 12`;
 return {user:{id:user.id,name:user.username,archetype:user.archetype,mask:user.mask,hat:user.hat,level:levelFromXp(user.xp),stats:leveledStats(builds[user.archetype],levelFromXp(user.xp)),xp:user.xp,wins:user.wins,matches:user.matches,history:history.map(h=>({at:h.created_at,result:h.result==='player'?'Victoria':h.result==='draw'?'Empate':'Derrota',seconds:Number(h.duration),build:builds[h.snapshot.build].name,rival:h.snapshot.enemyName}))},quota:{limit:LIMIT,used:quota[0]?.used||0,remaining:LIMIT-(quota[0]?.used||0),timezone:'America/Hermosillo'}};
}
export default async function handler(req,res){
 res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');
 if(!['GET','POST'].includes(req.method))return fail(res,405,'Método no permitido.');
 if(!process.env.DATABASE_URL)return fail(res,503,'Servidor no configurado.');
 if(req.method==='POST'){
  let origin;try{origin=new URL(req.headers.origin||'').host;}catch{return fail(res,403,'Origen no permitido.');}
  if(origin!==req.headers.host||req.headers['sec-fetch-site']==='cross-site')return fail(res,403,'Origen no permitido.');
  if(!String(req.headers['content-type']||'').startsWith('application/json'))return fail(res,415,'Se requiere JSON.');
 }
 try{
  const sql=neon(process.env.DATABASE_URL);
  const token=(req.headers.cookie||'').split(';').map(x=>x.trim()).find(x=>x.startsWith(COOKIE+'='))?.slice(COOKIE.length+1);
  const validToken=token&&/^[a-f0-9]{64}$/.test(token);
  let user=validToken?(await sql`select u.* from forja_game.users u join forja_game.sessions s on u.id=s.user_id where s.token_hash=${hashToken(token)} and s.expires_at>now()`)[0]:null;
  if(req.method==='GET'){
   const action=req.query?.action;
   if(action==='leaderboard'){
    let page;try{page=rankingPage(req.query?.page);}catch(e){return fail(res,400,e.message);}
    return res.status(200).json(await leaderboard(sql,page,user?.id||null));
   }
   if(action==='players'){
    if(!user)return fail(res,401,'Inicia sesión para ver rivales.');
    const players=await sql`select id,username as name,archetype,mask,hat,xp,wins,matches from forja_game.users where id<>${user.id} and floor(xp/100.0)=floor(${user.xp}::numeric/100.0) order by created_at desc limit 50`;
    return res.status(200).json({level:levelFromXp(user.xp),players:players.map(p=>({...p,level:levelFromXp(p.xp)}))});
   }
   return res.status(200).json({configured:true,...(user?await state(sql,user):{user:null,quota:{limit:LIMIT,used:0,remaining:LIMIT,timezone:'America/Hermosillo'}})});
  }
  let body=req.body;if(typeof body==='string'){if(body.length>32768)return fail(res,413,'Solicitud demasiado grande.');try{body=JSON.parse(body);}catch{return fail(res,400,'JSON inválido.');}}
  if(!body||JSON.stringify(body).length>32768)return fail(res,400,'Solicitud inválida.');
  const action=body.action;
  if(['register','login'].includes(action)){
   let input;try{input=credentials(body);}catch(e){return fail(res,400,e.message);}
   const ip=String(req.headers['x-real-ip']||req.headers['x-forwarded-for']||'unknown').split(',')[0].trim();
   const rate=await sql`insert into forja_game.auth_limits(key,attempts) values (${hashToken(ip)},1) on conflict(key) do update set attempts=case when forja_game.auth_limits.window_start<now()-interval '10 minutes' then 1 else forja_game.auth_limits.attempts+1 end,window_start=case when forja_game.auth_limits.window_start<now()-interval '10 minutes' then now() else forja_game.auth_limits.window_start end where forja_game.auth_limits.window_start<now()-interval '10 minutes' or forja_game.auth_limits.attempts<30 returning key`;
   if(!rate.length)return fail(res,429,'Demasiados intentos. Espera diez minutos.');
   if(action==='register'){
    const archetype=Object.hasOwn(builds,body.archetype)?body.archetype:'balanced';
    const digest=await passwordHash(input.password);
    user=(await sql`insert into forja_game.users(username,password_hash,archetype) values (${input.username},${digest},${archetype}) returning *`)[0];
   }else{
    user=(await sql`select * from forja_game.users where username=${input.username}`)[0];
    const digest=user?.password_hash||await passwordHash('not-the-user-password');
    if(!await passwordMatches(input.password,digest)||!user)return fail(res,401,'Usuario o contraseña incorrectos.');
   }
   const fresh=newToken();await sql`insert into forja_game.sessions(token_hash,user_id) values (${hashToken(fresh)},${user.id})`;
   if(validToken)await sql`delete from forja_game.sessions where token_hash=${hashToken(token)}`;
   sessionCookie(res,fresh);return res.status(200).json(await state(sql,user));
  }
  if(!user)return fail(res,401,'Crea tu cuenta o inicia sesión para combatir.');
  if(action==='logout'){await sql`delete from forja_game.sessions where token_hash=${hashToken(token)}`;sessionCookie(res,'',0);return res.status(200).json({loggedOut:true});}
  if(action==='cosmetics'){
   if(!validCosmetics(body.mask,body.hat))return fail(res,400,'Accesorio inválido.');
   user=(await sql`update forja_game.users set mask=${body.mask},hat=${body.hat} where id=${user.id} returning *`)[0];
   return res.status(200).json(await state(sql,user));
  }
  if(action==='style'){
   if(!Object.hasOwn(builds,body.build))return fail(res,400,'Estilo inválido.');
   user=(await sql`update forja_game.users set archetype=${body.build} where id=${user.id} returning *`)[0];
   return res.status(200).json(await state(sql,user));
  }
  if(action==='start'){
   if(!Object.hasOwn(builds,body.build)||!['normal','hard'].includes(body.difficulty))return fail(res,400,'Configuración inválida.');
   let opponent=null;
   if(body.opponentId){
    if(typeof body.opponentId!=='string'||!/^[a-f0-9-]{36}$/i.test(body.opponentId)||body.opponentId===user.id)return fail(res,400,'Rival inválido.');
    opponent=(await sql`select id,username,archetype,xp,mask,hat from forja_game.users where id=${body.opponentId}`)[0];
    if(!opponent)return fail(res,404,'Ese jugador ya no está disponible.');
    if(levelFromXp(opponent.xp)!==levelFromXp(user.xp))return fail(res,409,'El rival cambió de nivel. Actualiza la lista para encontrar rivales de tu nivel.');
   }
   const snapshot={playerLevel:levelFromXp(user.xp),enemyLevel:levelFromXp(opponent?.xp??user.xp),scenario:SCENARIOS[randomInt(SCENARIOS.length)].id,playerCosmetics:{mask:user.mask,hat:user.hat},enemyCosmetics:{mask:opponent?.mask||'none',hat:opponent?.hat||'none'},rulesVersion:RULES_VERSION,build:body.build,difficulty:opponent?'normal':body.difficulty,enemyBuild:opponent?.archetype||null,enemyName:opponent?.username||'Centinela R-01'};
   const rows=await sql`with quota as (
    insert into forja_game.daily_usage(user_id,day,used) values (${user.id},(now() at time zone 'America/Hermosillo')::date,1)
    on conflict(user_id,day) do update set used=forja_game.daily_usage.used+1 where forja_game.daily_usage.used<10 returning used
   ) insert into forja_game.matches(user_id,opponent_id,snapshot,rules_version) select ${user.id},${opponent?.id||null},${JSON.stringify(snapshot)}::jsonb,${RULES_VERSION} from quota returning id`;
   if(!rows.length)return fail(res,429,'Agotaste tus 10 combates. Se renuevan a medianoche de Sonora.');
   return res.status(200).json({matchId:rows[0].id,snapshot,...await state(sql,user)});
  }
  if(action==='finish'){
   if(typeof body.matchId!=='string'||!/^[a-f0-9-]{36}$/i.test(body.matchId))return fail(res,400,'Combate inválido.');
   const match=(await sql`select * from forja_game.matches where id=${body.matchId} and user_id=${user.id}`)[0];
   if(!match)return fail(res,404,'Combate no encontrado.');
   if(match.status==='finished')return res.status(200).json({verified:true,result:match.result,...await state(sql,user)});
   if(new Date(match.expires_at).getTime()<Date.now())return fail(res,410,'El combate expiró. Cada duelo puede finalizarse durante 15 minutos.');
   let outcome;try{outcome=replay(match.snapshot,body.commands);}catch(e){return fail(res,400,e.message);}
   const updated=await sql`with finalized as (
    update forja_game.matches set status='finished',result=${outcome.result},actions=${JSON.stringify(body.commands)}::jsonb,duration=${outcome.duration}
    where id=${match.id} and user_id=${user.id} and status='started' and expires_at>now() returning id
   ) update forja_game.users set xp=xp+${outcome.reward},wins=wins+${outcome.result==='player'?1:0},matches=matches+1 where id=${user.id} and exists(select 1 from finalized) returning *`;
   user=updated[0]||(await sql`select * from forja_game.users where id=${user.id}`)[0];
   return res.status(200).json({verified:true,result:outcome.result,reward:outcome.reward,...await state(sql,user)});
  }
  return fail(res,400,'Acción desconocida.');
 }catch(e){if(e.code==='23505')return fail(res,409,'Ese nombre de usuario ya está registrado.');console.error('forja_arena_error',e.code||'server_error');return fail(res,503,'No se pudo completar la operación. Intenta de nuevo.');}
}
