export const botFields={hp:['Vida base',80,300,1],attack:['Ataque básico',4,25,1],interval:['Segundos entre ataques',.7,3,.1],strikeDamage:['Daño de Impacto',10,60,1],healAmount:['Vida recuperada',10,60,1],chargeTime:['Aviso de Impacto (segundos)',.5,3,.1],energyRegen:['Energía por segundo',3,12,.5]};
export const defaultBotSettings={normal:{hp:150,attack:11,interval:1.7,strikeDamage:30,healAmount:28,chargeTime:1.5,energyRegen:7,strike:true,guard:true,heal:true},hard:{hp:180,attack:13,interval:1.5,strikeDamage:36,healAmount:32,chargeTime:1,energyRegen:8,strike:true,guard:true,heal:true}};
export function validateBotSettings(input){
 if(!input||typeof input!=='object')throw new Error('Configuración inválida.');
 const output={};
 for(const mode of ['normal','hard']){
  const value=input[mode];if(!value||typeof value!=='object')throw new Error('Falta una dificultad.');output[mode]={};
  for(const [key,[label,min,max]] of Object.entries(botFields)){const n=value[key];if(typeof n!=='number'||!Number.isFinite(n)||n<min||n>max||(key==='hp'||key==='attack'||key==='strikeDamage'||key==='healAmount')&&!Number.isInteger(n))throw new Error(`${label}: valor fuera de rango.`);output[mode][key]=n;}
  for(const key of ['strike','guard','heal']){if(typeof value[key]!=='boolean')throw new Error('Habilidad inválida.');output[mode][key]=value[key];}
 }
 return output;
}
