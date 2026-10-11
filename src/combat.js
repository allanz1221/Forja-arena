import {leveledStats,levelFactor} from './progression.js';
export const skills=[{id:'strike',name:'Impacto',key:'1',cost:35,cd:8,description:'Golpe de 26 de daño. Interrumpe la carga rival.',icon:'⚡'},{id:'guard',name:'Guardia',key:'2',cost:25,cd:10,description:'Reduce el daño recibido un 70% durante 3 segundos.',icon:'◈'},{id:'heal',name:'Segundo aire',key:'3',cost:40,cd:14,description:'Recupera 24 puntos de vida.',icon:'✚'}];
export const builds={balanced:{name:'Equilibrado',hp:120,attack:9,interval:1.5},heavy:{name:'Coloso',hp:145,attack:12,interval:2},quick:{name:'Ágil',hp:100,attack:7,interval:1}};
export const RULES_VERSION='0.3.2';
export function createCombat(build='balanced',difficulty='normal',enemyBuild=null,rulesVersion=RULES_VERSION,levels={}){
 const enemyAbilities=rulesVersion==='0.3.2',progressed=['0.3.1','0.3.2'].includes(rulesVersion),playerLevel=progressed?levels.playerLevel||1:1,enemyLevel=progressed?levels.enemyLevel||1:1;
 const p=leveledStats(builds[build]||builds.balanced,playerLevel),legacy=rulesVersion==='0.2';
 const machine=legacy?{hp:difficulty==='hard'?155:120,attack:difficulty==='hard'?12:9,interval:1.8,heavyDamage:29,chargeAt:7,chargeTime:1.6,chargeInterval:8}:difficulty==='hard'?{hp:140,attack:9,interval:1.9,heavyDamage:25,chargeAt:8,chargeTime:1.8,chargeInterval:9}:{hp:120,attack:8,interval:2,heavyDamage:22,chargeAt:10,chargeTime:2.2,chargeInterval:10};
 if(enemyAbilities){machine.hp=difficulty==='hard'?140:120;machine.attack=difficulty==='hard'?10:9;machine.interval=difficulty==='hard'?1.7:1.8;}
 const rawEnemy=enemyBuild?{...builds[enemyBuild],heavyDamage:29,chargeAt:7,chargeTime:1.6,chargeInterval:8}:machine;
 if(enemyAbilities){rawEnemy.heavyDamage=26;rawEnemy.chargeAt=difficulty==='hard'?4:5;rawEnemy.chargeTime=difficulty==='hard'?1.3:1.8;rawEnemy.chargeInterval=8;}
 const enemy=leveledStats(rawEnemy,enemyLevel);enemy.heavyDamage=Math.round(enemy.heavyDamage*levelFactor(enemyLevel));
 return {time:0,steps:0,status:'ready',rulesVersion,enemyAbilities,playerLevel,enemyLevel,skillFactor:levelFactor(playerLevel),player:{...p,hp:p.hp,maxHp:p.hp,energy:65,next:p.interval,guardUntil:0,cooldowns:{}},enemy:{...enemy,maxHp:enemy.hp,next:enemy.interval,charging:false,energy:65,guardUntil:0,cooldowns:{},nextDecision:2},events:[],sequence:0,winner:null};
}
function event(s,type,actor,amount=0,details={}){s.events.push({id:++s.sequence,time:s.time,type,actor,amount,...details});if(s.events.length>80)s.events.shift();}
function finish(s){if(s.player.hp<=0||s.enemy.hp<=0||s.time>=60){s.status='finished';const a=s.player.hp/s.player.maxHp,b=s.enemy.hp/s.enemy.maxHp;s.winner=a===b?'draw':a>b?'player':'enemy';event(s,'finish',s.winner);}}
function damage(s,target,n,actor,kind='basic'){const blocked=(target===s.player||s.enemyAbilities)&&s.time<(target.guardUntil||0);if(blocked)n=Math.round(n*.3);n=Math.min(target.hp,n);target.hp=Math.max(0,target.hp-n);event(s,'hit',actor,n,{kind,blocked});}
export function activate(s,id,actor='player'){
 const fighter=actor==='enemy'?s.enemy:s.player,target=actor==='enemy'?s.player:s.enemy,skill=skills.find(x=>x.id===id);
 if((actor==='enemy'&&!s.enemyAbilities)||s.status!=='running'||!skill||fighter.energy<skill.cost||(fighter.cooldowns[id]||0)>s.time)return false;
 if(id==='heal'&&fighter.hp===fighter.maxHp)return false;
 fighter.energy-=skill.cost;fighter.cooldowns[id]=s.time+skill.cd;
 const factor=actor==='enemy'?levelFactor(s.enemyLevel):s.skillFactor;
 if(id==='strike'){
  damage(s,target,Math.round(26*factor),actor,'strike');
  if(actor==='player'&&s.enemy.charging){s.enemy.charging=false;s.enemy.chargeAt=s.time+s.enemy.chargeInterval;event(s,'interrupt','player');}
 }
 if(id==='guard'){fighter.guardUntil=s.time+3;event(s,'guard',actor);}
 if(id==='heal'){const n=Math.min(Math.round(24*factor),fighter.maxHp-fighter.hp);fighter.hp+=n;event(s,'heal',actor,n);}
 if(s.recording)s.recording.push({step:s.steps,time:Math.round(s.time*100)/100,actor,id});
 finish(s);return true;
}
function enemyDecision(s){
 const e=s.enemy;
 if(s.status!=='running'||e.hp<=0)return;
 if(s.time>=e.chargeAt&&!e.charging&&e.energy>=35&&(e.cooldowns.strike||0)<=s.time){e.charging=true;e.releaseAt=s.time+e.chargeTime;event(s,'charge','enemy');}
 if(e.charging&&s.time>=e.releaseAt){e.charging=false;activate(s,'strike','enemy');e.chargeAt=s.time+e.chargeInterval;}
 if(s.status==='running'&&!e.charging&&s.time>=e.nextDecision){
  e.nextDecision=s.time+2;
  if(e.hp<=e.maxHp*.65&&activate(s,'heal','enemy'))return;
  if(e.hp<e.maxHp*.9&&s.time>=e.guardUntil)activate(s,'guard','enemy');
 }
}
export function tick(s,dt){
 if(s.status!=='running')return;s.steps++;s.time+=dt;s.player.energy=Math.min(100,s.player.energy+7*dt);
 if(s.enemyAbilities)s.enemy.energy=Math.min(100,s.enemy.energy+7*dt);
 if(s.time>=s.player.next){damage(s,s.enemy,s.player.attack,'player');s.player.next+=s.player.interval;}
 if(s.enemy.hp>0&&s.time>=s.enemy.next){damage(s,s.player,s.enemy.attack,'enemy');s.enemy.next+=s.enemy.interval;}
 if(s.enemyAbilities){if(s.player.hp<=0||s.enemy.hp<=0)finish(s);else enemyDecision(s);}
 else{
  if(s.enemy.hp>0&&s.time>=s.enemy.chargeAt&&!s.enemy.charging){s.enemy.charging=true;s.enemy.releaseAt=s.time+s.enemy.chargeTime;event(s,'charge','enemy');}
  if(s.enemy.charging&&s.time>=s.enemy.releaseAt){damage(s,s.player,s.enemy.heavyDamage,'enemy','heavy');s.enemy.charging=false;s.enemy.chargeAt=s.time+s.enemy.chargeInterval;}
 }
 if(s.status==='running')finish(s);
}
