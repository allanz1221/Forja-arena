import{randomBytes,scrypt as scryptCallback,timingSafeEqual,createHash}from'node:crypto';
import{promisify}from'node:util';
const scrypt=promisify(scryptCallback);
export const hashToken=t=>createHash('sha256').update(t).digest('hex');
export const newToken=()=>randomBytes(32).toString('hex');
export function credentials(body){const username=typeof body.username==='string'?body.username.trim().toLowerCase():'';const password=body.password;if(!/^[a-z0-9_]{3,24}$/.test(username))throw new Error('Usuario: 3 a 24 letras, números o guion bajo.');if(typeof password!=='string'||password.length<10||password.length>128)throw new Error('Contraseña: 10 a 128 caracteres.');return {username,password};}
export async function passwordHash(password){const salt=randomBytes(16).toString('hex');const key=await scrypt(password,salt,64);return salt+':'+key.toString('hex');}
export async function passwordMatches(password,stored){const[salt,digest]=(stored||'').split(':');if(!salt||!digest)return false;const key=await scrypt(password,salt,64);const expected=Buffer.from(digest,'hex');return expected.length===key.length&&timingSafeEqual(key,expected);}
