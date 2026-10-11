import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {randomBytes} from 'node:crypto';
import handler from '../api/admin.js';
import {readBotSettings} from '../server/bot-settings.js';
import {defaultBotSettings} from '../src/bot-settings.js';
import {hashToken} from '../server/auth.js';
process.stdin.setRawMode(true);
console.log('Ready for hidden verification input.');
const input=await new Promise(resolve=>{let s='';process.stdin.on('data',c=>{s+=c;if(s.includes('\n')){process.stdin.pause();resolve(JSON.parse(s.split('\n')[0]));}});});
process.env.DATABASE_URL=input.connectionString;process.env.ADMIN_PASSWORD_HASH=input.hash;
const sql=neon(input.connectionString),ip='admin_qa_'+randomBytes(6).toString('hex');let cookie='';
const original=await readBotSettings(sql);
async function request(body,session='',origin='https://forja.test'){
 const res={headers:{},setHeader(k,v){this.headers[k]=v;},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
 await handler({method:body?'POST':'GET',headers:{host:'forja.test',origin,'content-type':'application/json','x-real-ip':ip,cookie:session},body},res);return res;
}
try{
 assert.equal((await request()).code,401);assert.equal((await request({action:'save',settings:defaultBotSettings,revision:original.revision})).code,401);
 assert.equal((await request({action:'login',password:'incorrect_password'})).code,401);
 const login=await request({action:'login',password:input.password});assert.equal(login.code,200);cookie=login.headers['Set-Cookie'].split(';')[0];assert.ok(login.headers['Set-Cookie'].includes('HttpOnly'));
 const settings=structuredClone(original.settings);settings.normal.attack=12;
 assert.equal((await request({action:'save',settings,revision:original.revision},cookie,'https://evil.test')).code,403);
 const saved=await request({action:'save',settings,revision:original.revision},cookie);assert.equal(saved.code,200);
 const fetched=await request(null,cookie);assert.equal(fetched.body.settings.normal.attack,12);assert.equal(fetched.body.revision,original.revision+1);
 assert.equal((await request({action:'save',settings,revision:original.revision},cookie)).code,409);
 const restore=await request({action:'save',settings:original.settings,revision:fetched.body.revision},cookie);assert.equal(restore.code,200);
 assert.equal((await request({action:'logout'},cookie)).code,200);assert.equal((await request(null,cookie)).code,401);
 console.log(JSON.stringify({ok:true,passwordLogin:true,anonymousDenied:true,crossOriginDenied:true,persistence:true,staleWritesDenied:true,logoutRevokes:true}));
}catch(e){console.error(JSON.stringify({ok:false,message:e.message.slice(0,150)}));process.exitCode=1;}
finally{await sql`update forja_game.bot_settings set settings=${JSON.stringify(original.settings)}::jsonb where id=true`;if(cookie)await sql`delete from forja_game.admin_sessions where token_hash=${hashToken(cookie.split('=')[1])}`;await sql`delete from forja_game.auth_limits where key=${hashToken('admin:'+ip)}`;}
