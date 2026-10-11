import {levelFromXp} from '../src/progression.js';
export const PAGE_SIZE=50;
export function rankingPage(value){const page=value===undefined?1:Number(value);if(!Number.isSafeInteger(page)||page<1||page>1000000)throw new Error('Página inválida.');return page;}
export async function leaderboard(sql,page,userId=null){
 const offset=(page-1)*PAGE_SIZE;
 const [data]=await sql`with ranked as (
  select id,username as name,archetype,xp,wins,matches,
   row_number() over(order by xp desc,wins desc,username asc,id asc)::int as rank
  from forja_game.users
 ) select (select count(*)::int from ranked) as total,
  (select coalesce(json_agg(p order by p.rank),'[]'::json) from (select * from ranked order by rank limit 50 offset ${offset}) p) as players,
  (select coalesce(json_agg(p order by p.rank),'[]'::json) from (select * from ranked order by rank limit 3) p) as top,
  (select to_jsonb(p) from ranked p where id=${userId}) as me`;
 const publicPlayer=p=>({...p,level:levelFromXp(p.xp)});
 return {page,pageSize:PAGE_SIZE,total:data.total,pages:Math.max(1,Math.ceil(data.total/PAGE_SIZE)),players:data.players.map(publicPlayer),top:data.top.map(publicPlayer),me:data.me?publicPlayer(data.me):null};
}
