import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultBotSettings,validateBotSettings} from '../src/bot-settings.js';
import {createCombat,tick,activate,RULES_VERSION} from '../src/combat.js';
import {replay} from '../server/replay.js';
import handler from '../api/admin.js';
test('valida límites, tipos y habilidades de ambos modos',()=>{assert.deepEqual(validateBotSettings(defaultBotSettings),defaultBotSettings);for(const value of [Infinity,NaN,0,301,'150']){const input=structuredClone(defaultBotSettings);input.normal.hp=value;assert.throws(()=>validateBotSettings(input));}const input=structuredClone(defaultBotSettings);input.hard.guard='true';assert.throws(()=>validateBotSettings(input));});
test('ajustes capturados reproducen la pelea y no alteran jugadores ni reglas históricas',()=>{
 const settings={...defaultBotSettings.normal,hp:200,attack:18,heal:false};const snapshot={build:'balanced',difficulty:'normal',rulesVersion:RULES_VERSION,playerLevel:4,enemyLevel:4,botSettings:settings};
 const s=createCombat('balanced','normal',null,RULES_VERSION,snapshot);assert.equal(s.enemy.maxHp,260);settings.hp=90;assert.equal(s.enemy.maxHp,260);settings.hp=200;s.status='running';const commands=[];while(s.status==='running'){if(s.enemy.charging&&activate(s,'strike'))commands.push({step:s.steps,id:'strike'});tick(s,.05);}assert.equal(replay(snapshot,commands).result,s.winner);
 assert.equal(createCombat('balanced','normal','quick',RULES_VERSION,snapshot).enemy.maxHp,130);
 assert.equal(createCombat('balanced','normal',null,'0.3.2',snapshot).enemy.maxHp,156);
});
test('administración bloquea origen externo antes de consultar datos',async()=>{const old={DATABASE_URL:process.env.DATABASE_URL,ADMIN_PASSWORD_HASH:process.env.ADMIN_PASSWORD_HASH};Object.assign(process.env,{DATABASE_URL:'configured',ADMIN_PASSWORD_HASH:'configured'});const res={setHeader(){},status(n){this.code=n;return this;},json(v){this.body=v;}};try{await handler({method:'POST',headers:{host:'forja.test',origin:'https://evil.test','content-type':'application/json'},body:{action:'save'}},res);assert.equal(res.code,403);}finally{for(const [key,value] of Object.entries(old))if(value===undefined)delete process.env[key];else process.env[key]=value;}});
test('los bots iniciales castigan la pasividad en todos los estilos',()=>{for(const build of ['balanced','heavy','quick'])assert.equal(replay({build,difficulty:'normal',rulesVersion:RULES_VERSION},[]).result,'enemy');});
