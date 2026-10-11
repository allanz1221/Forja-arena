import{createCombat,tick,activate,builds}from'../src/combat.js';
export function replay(snapshot,actions){if(!Array.isArray(actions)||actions.length>200)throw new Error('Registro de habilidades inválido.');let previous=-1;for(const a of actions){if(!a||!Number.isInteger(a.step)||a.step<0||a.step>1202||a.step<previous||!['strike','guard','heal'].includes(a.id))throw new Error('Acción inválida.');previous=a.step;}
 const s=createCombat(snapshot.build,snapshot.difficulty,snapshot.enemyBuild);s.status='running';let at=0;
 for(let i=0;i<=1202&&s.status==='running';i++){
  while(at<actions.length&&actions[at].step===s.steps){if(!activate(s,actions[at].id))throw new Error('Habilidad fuera de energía o recarga.');at++;}
  if(s.status==='running')tick(s,.05);
 }
 if(s.status!=='finished'||at!==actions.length)throw new Error('Registro de combate incompleto.');
 return {result:s.winner,duration:Math.round(s.time*100)/100,reward:s.winner==='player'?35:15,build:builds[snapshot.build].name};
}
