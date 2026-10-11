import assert from 'node:assert/strict';
import {neon} from '@neondatabase/serverless';
import {randomBytes} from 'node:crypto';
import {newToken,hashToken} from '../server/auth.js';
import handler from '../api/arena.js';
if(process.stdin.isTTY)process.stdin.setRawMode(true);
console.log('Ready for hidden ranking verification input.');
const input=await new Promise(resolve=>{let value='';process.stdin.on('data',c=>{value+=c;if(value.includes('\n')){process.stdin.pause();resolve(value.split('\n')[0]);}});});
process.env.DATABASE_URL=JSON.parse(input).connectionString;
const sql=neon(process.env.DATABASE_URL),prefix='rank_'+randomBytes(4).toString('hex')+'_',names=Array.from({length:55},(_,i)=>prefix+String(i).padStart(2,'0'));
async function request(page,cookie=''){
 const res={setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;return this;}};
 await handler({method:'GET',headers:{cookie},query:{action:'leaderboard',page}},res);return res;
}
try{
 await sql.transaction(names.map((name,i)=>sql`insert into forja_game.users(username,password_hash,xp,wins,matches) values (${name},'unusable-fixture-password',${Math.floor(i/3)*100},${i%3},${i%3})`));
 const first=await request('1');assert.equal(first.code,200);assert.equal(first.body.players.length,50);assert.ok(first.body.total>=55);assert.equal(first.body.me,null);assert.equal(first.body.top.length,3);
 const players=[];
 for(let page=1;page<=first.body.pages;page++){
  const response=page===1?first:await request(String(page));assert.equal(response.code,200);assert.deepEqual(response.body.top,first.body.top);players.push(...response.body.players);
 }
 assert.equal(new Set(players.map(p=>p.id)).size,players.length);
 for(const name of names)assert.ok(players.some(p=>p.name===name));
 const fixture=players.filter(p=>names.includes(p.name));
 for(let i=1;i<players.length;i++){const a=players[i-1],b=players[i];assert.equal(b.rank,a.rank+1);assert.ok(a.xp>b.xp||a.xp===b.xp&&a.wins>=b.wins);}
 for(let i=1;i<fixture.length;i++){const a=fixture[i-1],b=fixture[i];if(a.xp===b.xp)assert.ok(a.wins>=b.wins);}
 for(const p of players){assert.deepEqual(Object.keys(p).sort(),['archetype','id','level','matches','name','rank','wins','xp'].sort());assert.equal(p.level,1+Math.floor(p.xp/100));}
 const token=newToken();await sql`insert into forja_game.sessions(token_hash,user_id) values (${hashToken(token)},${fixture[0].id})`;
 const own=await request('2','__Host-forja_account='+token);assert.equal(own.code,200);assert.equal(own.body.me.id,fixture[0].id);assert.equal(own.body.me.rank,fixture[0].rank);
 const invalid=await request('-1');assert.equal(invalid.code,400);
 console.log(JSON.stringify({ok:true,publicRanking:true,allPlayersAcrossPages:true,globalPositions:true,xpThenWins:true,levels:true,topThree:true,ownRankAcrossPages:true,privateFieldsExcluded:true}));
}catch(e){console.error(JSON.stringify({ok:false,message:e.message.slice(0,180)}));process.exitCode=1;}
finally{await sql`delete from forja_game.users where username=any(${names})`;}
