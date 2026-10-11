export function readSave(){try{return JSON.parse(localStorage.getItem('forja-v1'))||{name:'Aspirante',xp:0,wins:0,matches:0,history:[]};}catch{return {name:'Aspirante',xp:0,wins:0,matches:0,history:[]};}}
export function saveLocal(data){try{localStorage.setItem('forja-v1',JSON.stringify(data));return true;}catch{return false;}}
async function request(options){const r=await fetch('/api/game',{credentials:'same-origin',...options});let data;try{data=await r.json();}catch{throw new Error('El guardado Neon está disponible en el despliegue de Vercel.');}if(!r.ok)throw new Error(data.error||'No se pudo guardar.');return data;}
export async function cloudStatus(){try{const data=await request();return !!data.configured;}catch{return false;}}
export async function cloudSave(profile){return request({method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({profile})});}
export async function cloudLoad(){return (await request()).profile;}
