import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,tick,activate,builds} from '../src/combat.js';
import {replay} from '../server/replay.js';
import {passwordHash,passwordMatches,credentials} from '../server/auth.js';
import handler from '../api/arena.js';
test('reproduce resultado y habilidades de todos los estilos contra personajes registrados',()=>{
 for(const build of Object.keys(builds))for(const enemyBuild of Object.keys(builds)){
  const snapshot={build,enemyBuild,difficulty:'normal'},s=createCombat(build,'normal',enemyBuild),actions=[];s.status='running';
  assert.equal(s.enemy.maxHp,builds[enemyBuild].hp);
  while(s.status==='running'){
   for(const id of [s.enemy.charging?'strike':'guard','heal'])if(activate(s,id))actions.push({step:s.steps,id});
   tick(s,.05);
  }
  const result=replay(snapshot,actions);assert.equal(result.result,s.winner);assert.equal(result.duration,Math.round(s.time*100)/100);
 }
});
test('rechaza habilidades falsas y recargas manipuladas',()=>{
 const snapshot={build:'balanced',difficulty:'normal'};
 for(const actions of [[{step:0,id:'heal'}],[{step:0,id:'strike'},{step:0,id:'strike'}],[{step:-1,id:'guard'}],[{step:2000,id:'strike'}],[{step:2,id:'guard'},{step:1,id:'strike'}]])assert.throws(()=>replay(snapshot,actions));
});
test('contraseñas saladas y comprobación de identidad',async()=>{
 const a=await passwordHash('forja_password_123'),b=await passwordHash('forja_password_123');assert.notEqual(a,b);
 assert.equal(await passwordMatches('forja_password_123',a),true);assert.equal(await passwordMatches('incorrecta',a),false);
 assert.equal(credentials({username:' ALLANZ ',password:'1234567890'}).username,'allanz');assert.throws(()=>credentials({username:'x',password:'short'}));
});
test('arena rechaza origen cruzado antes de acceder a la base',async()=>{
 const old=process.env.DATABASE_URL;process.env.DATABASE_URL='configured';
 const res={setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;}};
 try{await handler({method:'POST',headers:{origin:'https://attacker.test',host:'forja.test','content-type':'application/json'}},res);assert.equal(res.code,403);}finally{if(old)process.env.DATABASE_URL=old;else delete process.env.DATABASE_URL;}
});
