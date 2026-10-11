export const levelFromXp=xp=>1+Math.floor(Math.max(0,Number(xp)||0)/100);
export const levelFactor=level=>1+.1*(Math.max(1,Math.floor(Number(level)||1))-1);
export function leveledStats(base,level=1){const factor=levelFactor(level);return {...base,hp:Math.round(base.hp*factor),attack:Math.round(base.attack*factor)};}
export const SCENARIOS=[{id:'orbital',name:'Estación orbital'},{id:'mars',name:'Cañón marciano'},{id:'ice',name:'Base glacial'}];
export const validCosmetics=(mask,hat)=>['none','pumpkin'].includes(mask)&&['none','santa'].includes(hat);
