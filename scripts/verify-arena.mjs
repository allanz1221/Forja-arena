import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {randomBytes} from 'node:crypto';
import handler from '../api/arena.js';
import {createCombat,tick,activate} from '../src/combat.js';
import {hashToken} from '../server/auth.js';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for hidden verification input.');
const input=await new Promise(resolve=>{let value='';process.stdin.on('data',c=>{value+=c;if(value.includes('\n')){process.stdin.pause();resolve(value.split('\n')[0]);}});});
process.env.DATABASE_URL=JSON.parse(input).connectionString;
const sql=neon(process.env.DATABASE_URL),suffix=randomBytes(5).toString('hex'),names=['qa_'+suffix,'qb_'+suffix],ip='test_'+suffix;
async function request(action,body={},cookie=''){
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
 await handler({method:action==='players'||action==='state'?'GET':'POST',query:{action},headers:{host:'forja.test',origin:'https://forja.test','content-type':'application/json',cookie,'x-real-ip':ip},body:{action,...body}},res);return res;
}
try{
 const a=await request('register',{username:names[0],password:'test_password_123',archetype:'heavy'}),b=await request('register',{username:names[1],password:'test_password_123',archetype:'quick'});assert.equal(a.code,200);assert.equal(b.code,200);
 const cookie=a.headers['Set-Cookie'].split(';')[0],other=b.headers['Set-Cookie'].split(';')[0];
 const list=await request('players',{},cookie);assert.ok(list.body.players.some(p=>p.id===b.body.user.id));assert.ok(!list.body.players.some(p=>p.id===a.body.user.id));assert.ok(!JSON.stringify(list.body).includes('password'));
 const start=await request('start',{build:'heavy',difficulty:'normal',opponentId:b.body.user.id},cookie);assert.equal(start.code,200);assert.equal(start.body.snapshot.enemyBuild,'quick');
 const s=createCombat('heavy','normal','quick'),commands=[];s.status='running';while(s.status==='running'){if(s.enemy.charging&&activate(s,'strike'))commands.push({step:s.steps,id:'strike'});if(s.player.hp<90&&activate(s,'heal'))commands.push({step:s.steps,id:'heal'});tick(s,.05);}
 const finishes=await Promise.all([request('finish',{matchId:start.body.matchId,commands},cookie),request('finish',{matchId:start.body.matchId,commands},cookie)]);for(const f of finishes)assert.equal(f.code,200);
 const state=await request('state',{},cookie);assert.equal(state.body.user.matches,1);assert.equal(state.body.user.xp,s.winner==='player'?35:15);
 const opponentState=await request('state',{},other);assert.equal(opponentState.body.quota.used,0);assert.equal(opponentState.body.user.matches,0);
 const starts=await Promise.all(Array.from({length:12},(_,i)=>request('start',{build:'balanced',difficulty:'normal',opponentId:i%2?b.body.user.id:null},cookie)));
 assert.equal(starts.filter(x=>x.code===200).length,9);assert.equal(starts.filter(x=>x.code===429).length,3);
 const limited=await request('state',{},cookie);assert.equal(limited.body.quota.remaining,0);
 const login=await request('login',{username:names[0],password:'test_password_123'});assert.equal(login.code,200);assert.equal(login.body.quota.remaining,0);
 console.log(JSON.stringify({ok:true,registration:true,realPlayerOpponent:true,verifiedResult:true,concurrentFinishIdempotent:true,concurrentQuotaLimit:10,sharedAiPlayerQuota:true,loginRestoresQuota:true}));
}catch(e){console.error(JSON.stringify({ok:false,message:e.message.slice(0,180)}));process.exitCode=1;}
finally{await sql`delete from forja_game.users where username=any(${names})`;await sql`delete from forja_game.auth_limits where key=${hashToken(ip)}`;}
