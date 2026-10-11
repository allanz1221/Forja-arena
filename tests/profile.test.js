import{test}from'node:test';import assert from'node:assert/strict';import{validateProfile}from'../server/profile.js';
const p={name:'Doctor',xp:35,wins:1,matches:1,history:[{at:'2026-10-10T20:00:00Z',result:'Victoria',seconds:25,build:'Equilibrado'}]};
test('perfil válido se normaliza y omite campos extra',()=>{assert.equal(validateProfile({...p,name:' Doctor ',admin:true}).name,'Doctor');assert.equal(validateProfile({...p,admin:true}).admin,undefined);});
test('rechaza progreso y duelos inválidos',()=>{for(const x of [{...p,xp:-1},{...p,wins:2},{...p,name:''},{...p,history:[{...p.history[0],seconds:900}]},{...p,history:Array(13).fill(p.history[0])}])assert.throws(()=>validateProfile(x));});
