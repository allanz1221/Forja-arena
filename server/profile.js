export function validateProfile(p){
 if(!p||typeof p!=='object'||Array.isArray(p))throw new Error('Perfil inválido.');
 if(typeof p.name!=='string'||p.name.trim().length<1||p.name.length>24)throw new Error('El nombre debe tener entre 1 y 24 caracteres.');
 for(const k of ['xp','wins','matches'])if(!Number.isSafeInteger(p[k])||p[k]<0||p[k]>10000000)throw new Error('Progreso inválido.');
 if(p.wins>p.matches||!Array.isArray(p.history)||p.history.length>12)throw new Error('Historial inválido.');
 const history=p.history.map(h=>{if(!h||!['Victoria','Derrota','Empate'].includes(h.result)||!['Equilibrado','Coloso','Ágil'].includes(h.build)||!Number.isFinite(h.seconds)||h.seconds<0||h.seconds>61||typeof h.at!=='string'||Number.isNaN(Date.parse(h.at)))throw new Error('Duelo inválido.');return {at:new Date(h.at).toISOString(),result:h.result,seconds:Math.round(h.seconds),build:h.build};});
 return {name:p.name.trim(),xp:p.xp,wins:p.wins,matches:p.matches,history};
}
