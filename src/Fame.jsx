import React,{useEffect,useState} from 'react';
import {arenaRequest} from './storage.js';
import {builds} from './combat.js';
export function Fame({userId}){
 const [page,setPage]=useState(1),[refresh,setRefresh]=useState(0),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState('');
 useEffect(()=>{
  let canceled=false;setLoading(true);setError('');
  arenaRequest('leaderboard',null,{page}).then(value=>{if(!canceled){setData(value);if(page>value.pages)setPage(value.pages);}}).catch(e=>{if(!canceled)setError(e.message);}).finally(()=>{if(!canceled)setLoading(false);});
  return()=>{canceled=true;};
 },[page,refresh,userId]);
 return <section className="fame-panel" aria-busy={loading}><div className="fame-heading"><div><span className="eyebrow">LOS NOMBRES QUE FORJAN LA ARENA</span><h2>Salón de la fama</h2><p>Ranking global · XP, después victorias. Los empates se ordenan por nombre.</p></div><button className="secondary" disabled={loading} onClick={()=>setRefresh(n=>n+1)}>Actualizar ranking</button></div>
 {error&&<p className="notice" role="alert">{error}</p>}
 {loading&&<p role="status">Cargando clasificación…</p>}
 {data&&<><div className="podium">{data.top.map(p=><article className={'podium-card place-'+p.rank} key={p.id}><span className="medal">{['🥇','🥈','🥉'][p.rank-1]}</span><small>TOP {p.rank}</small><h3>{p.name}</h3><p>Nivel {p.level} · {builds[p.archetype].name}</p><strong>{p.xp.toLocaleString('es-MX')} XP</strong><span>{p.wins} victorias</span></article>)}</div>
 {data.me&&<div className="my-rank"><strong>Tu posición: #{data.me.rank}</strong><span>Nivel {data.me.level} · {data.me.xp} XP · {data.me.wins} victorias</span></div>}
 <div className="ranking-caption"><h3>Todos los jugadores</h3><span>{data.total} registrados · Página {data.page} de {data.pages}</span></div>
 {data.total===0?<p>Aún no hay jugadores registrados. ¡Sé el primero en entrar a la arena!</p>:<div className="ranking-scroll" tabIndex={0} aria-label="Tabla de clasificación"><table className="ranking-table"><caption className="sr-only">Ranking de todos los jugadores, ordenados por XP y victorias</caption><thead><tr><th scope="col">Posición</th><th scope="col">Jugador</th><th scope="col">Nivel</th><th scope="col">XP</th><th scope="col">Victorias</th><th scope="col">Duelos</th></tr></thead><tbody>{data.players.map(p=><tr className={p.id===userId?'current-player':''} key={p.id}><td><b>#{p.rank}</b></td><th scope="row">{p.name}{p.id===userId&&<small> · Tú</small>}<span>{builds[p.archetype].name}</span></th><td>{p.level}</td><td>{p.xp.toLocaleString('es-MX')}</td><td>{p.wins}</td><td>{p.matches}</td></tr>)}</tbody></table></div>}
 {data.pages>1&&<nav className="ranking-pages" aria-label="Páginas del ranking"><button className="secondary" disabled={loading||page===1} onClick={()=>setPage(n=>n-1)}>← Anterior</button><span>{page} / {data.pages}</span><button className="secondary" disabled={loading||page>=data.pages} onClick={()=>setPage(n=>n+1)}>Siguiente →</button></nav>}
 </>}
 </section>;
}
