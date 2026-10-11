import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createCombat,tick,activate,builds} from '../src/combat.js';
import {replay} from '../server/replay.js';
import {passwordHash,passwordMatches,credentials} from '../server/auth.js';
import handler from '../api/arena.js';
test('reproduce resultado y habilidades de todos los estilos contra personajes registrados',()=>{
 for(const build of Object.keys(builds))for(const enemyBuild of Object.keys(builds)){
  const snapshot={build,enemyBuild,difficulty:'normal',rulesVersion:'0.3.0'},s=createCombat(build,'normal',enemyBuild),actions=[];s.status='running';
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
test('Normal permite ganar con los tres estilos sin habilidades y Desafiante exige decisiones',()=>{
 for(const build of Object.keys(builds)){
  const normal=replay({build,difficulty:'normal',rulesVersion:'0.3.0'},[]);
  const hard=replay({build,difficulty:'hard',rulesVersion:'0.3.0'},[]);
  assert.equal(normal.result,'player');assert.equal(hard.result,'enemy');
  const s=createCombat(build,'hard'),commands=[];s.status='running';
  while(s.status==='running'){
   for(const id of [s.enemy.charging?'strike':null,s.player.hp<s.player.maxHp-24?'heal':null])if(id&&activate(s,id))commands.push({step:s.steps,id});
   tick(s,.05);
  }
  assert.equal(replay({build,difficulty:'hard',rulesVersion:'0.3.0'},commands).result,'player');
 }
});
test('los combates anteriores se verifican con las reglas anteriores',()=>{
 const snapshot={build:'balanced',difficulty:'normal'},old=createCombat('balanced','normal',null,'0.2');old.status='running';
 while(old.status==='running')tick(old,.05);
 assert.equal(replay(snapshot,[]).result,old.winner);assert.equal(old.winner,'enemy');
 assert.equal(createCombat().enemy.chargeTime,2.2);
});
test('el nivel aumenta estadísticas y conserva la reejecución de habilidades',()=>{
 for(const level of [1,2,5,20])for(const build of Object.keys(builds)){
  const snapshot={build,difficulty:'normal',playerLevel:level,enemyLevel:level,rulesVersion:'0.3.1'},s=createCombat(build,'normal',null,'0.3.1',snapshot),commands=[];
  assert.equal(s.player.maxHp,Math.round(builds[build].hp*(1+.1*(level-1))));
  assert.equal(s.player.attack,Math.round(builds[build].attack*(1+.1*(level-1))));
  assert.equal(s.enemy.maxHp,Math.round(120*(1+.1*(level-1))));s.status='running';
  while(s.status==='running'){
   for(const id of [s.enemy.charging?'strike':null,s.player.hp<s.player.maxHp-Math.round(24*s.skillFactor)?'heal':null])if(id&&activate(s,id))commands.push({step:s.steps,id});
   tick(s,.05);
  }
  assert.equal(replay(snapshot,commands).result,s.winner);
 }
});
test('reglas anteriores ignoran nuevos niveles y apariencia no afecta resultados',()=>{
 const old=createCombat('balanced','normal',null,'0.3.0',{playerLevel:20,enemyLevel:20});assert.equal(old.player.maxHp,120);
 const baseline={build:'balanced',difficulty:'normal',rulesVersion:'0.3.1',playerLevel:4,enemyLevel:4};
 for(const scenario of ['orbital','mars','ice'])assert.deepEqual(replay({...baseline,scenario,playerCosmetics:{mask:'pumpkin',hat:'santa'}},[]),replay(baseline,[]));
});
