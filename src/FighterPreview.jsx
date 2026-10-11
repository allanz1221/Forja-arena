import React,{useEffect,useRef} from 'react';
import Phaser from 'phaser';
import {Arena} from './Arena.js';
import {createCombat} from './combat.js';
export function FighterPreview({cosmetics}){
 const mount=useRef(),game=useRef(),current=useRef(cosmetics);current.current=cosmetics;
 useEffect(()=>{
  class Portrait extends Arena{
   create(){
    this.model=createCombat();this.clock=0;this.finishAt=null;this.playerCosmetics=current.current;
    const bg=this.add.graphics();bg.fillGradientStyle(0x1b3941,0x1b293e,0x111c24,0x111c24,1);bg.fillRect(0,0,430,450);
    bg.lineStyle(1,0x77cab9,.18);for(let r=45;r<230;r+=30)bg.strokeCircle(215,230,r);
    bg.lineStyle(2,0x83efd4,.4);bg.strokeEllipse(215,432,310,31);
    this.fighters=[{home:130,x:130,direction:1,color:0x62d9b5,graphic:this.add.graphics().setScale(1.6).setPosition(6,-98),attackAt:-10,hurtAt:-10,healAt:-10,heavy:false}];
    this.game.events.on('appearance',this.appearance,this);
    this.events.once('shutdown',()=>this.game.events.off('appearance',this.appearance,this));
    this.renderFighters();
   }
   appearance(value){this.playerCosmetics=value;this.renderFighters();}
   update(_,delta){this.clock+=Math.min(delta,100)/1000;this.renderFighters();}
  }
  const g=new Phaser.Game({type:Phaser.AUTO,parent:mount.current,width:430,height:450,backgroundColor:'#142124',scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},scene:Portrait,render:{antialias:true}});game.current=g;
  return()=>{game.current=null;g.destroy(true);};
 },[]);
 useEffect(()=>{game.current?.events.emit('appearance',cosmetics);},[cosmetics]);
 return <div className="portrait-wrap"><div className="fighter-portrait" ref={mount} role="img" aria-label={'Vista del alien'+(cosmetics.mask==='pumpkin'?' con máscara de calabaza':'')+(cosmetics.hat==='santa'?' con gorro de Santa Claus':'')}/><span>VISTA PREVIA · LOS ACCESORIOS CAMBIAN AL INSTANTE</span></div>;
}
