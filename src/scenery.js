export function drawScenery(g,id){
 g.clear();
 if(id==='mars'){
  g.fillGradientStyle(0x3d1937,0x702e34,0xa34e39,0x662c32,1);g.fillRect(0,0,960,430);
  g.fillStyle(0xffbc81,.8);g.fillCircle(740,94,49);g.fillStyle(0xf2d7be,.5);g.fillCircle(130,73,19);
  g.fillStyle(0x70373f);g.fillTriangle(0,290,160,125,310,290);g.fillTriangle(560,290,735,145,960,290);
  g.fillStyle(0x9e5147);g.fillTriangle(0,290,90,210,210,290);g.fillTriangle(720,290,860,210,960,290);
  g.fillStyle(0x743934);g.fillRect(0,285,960,145);
  for(let x=0;x<960;x+=75){g.lineStyle(2,0xb76549,.35);g.lineBetween(x,365,x+60,392);}
  g.fillStyle(0xbd704e);g.fillEllipse(480,338,790,110);g.lineStyle(3,0xffc083,.7);g.strokeEllipse(480,338,790,110);
  for(const x of [105,840]){g.fillStyle(0x51353e);g.fillRoundedRect(x,203,23,86,5);g.fillStyle(0xffd27d);g.fillRect(x+7,214,9,52);}
 }else if(id==='ice'){
  g.fillGradientStyle(0x102d4a,0x153847,0x447484,0x244951,1);g.fillRect(0,0,960,430);
  g.lineStyle(12,0x7affda,.12);for(let n=0;n<6;n++){g.beginPath();g.moveTo(-20,60+n*7);g.lineTo(270,100+n*11);g.lineTo(630,37+n*13);g.lineTo(980,86+n*7);g.strokePath();}
  g.fillStyle(0xd4eef2);g.fillCircle(780,100,32);
  g.fillStyle(0x74aab9);g.fillTriangle(0,290,170,127,340,290);g.fillTriangle(600,290,760,155,960,290);
  g.fillStyle(0xe3f4f6);g.fillTriangle(129,166,170,127,211,166);g.fillTriangle(721,188,760,155,801,188);
  g.fillStyle(0x466877);g.fillRect(0,285,960,145);g.fillStyle(0x9ac3ce);g.fillEllipse(480,338,790,110);g.lineStyle(3,0xc9f7ff,.8);g.strokeEllipse(480,338,790,110);
  for(let n=0;n<55;n++){g.fillStyle(0xe9feff,.45);g.fillCircle((n*173+15)%960,(n*59+12)%280,2);}
  for(const x of [85,848]){g.fillStyle(0x486a85);g.fillRoundedRect(x,190,28,100,7);g.fillStyle(0x98fbff);g.fillRoundedRect(x+8,204,12,58,4);}
 }else{
  g.fillGradientStyle(0x10223b,0x151a36,0x0c161f,0x0c161f,1);g.fillRect(0,0,960,430);
  for(let n=0;n<65;n++){g.fillStyle(0xb9e6ff,.25+(n%4)*.15);g.fillCircle((n*137+37)%960,(n*73+21)%255,n%6===0?2:1);}
  g.fillStyle(0x203e59);g.fillCircle(480,119,102);g.fillStyle(0x264d67);g.fillEllipse(459,107,120,58);g.lineStyle(2,0x5e9ab1,.3);g.strokeEllipse(480,119,294,65);
  g.fillStyle(0x162c3e);g.fillRect(0,285,960,145);g.lineStyle(1,0x436f80,.4);
  for(let x=-600;x<=1500;x+=120)g.lineBetween(480+(x-480)*.45,285,x,430);
  for(const y of [299,322,358,410])g.lineBetween(0,y,960,y);
  g.fillStyle(0x233f4a);g.fillEllipse(480,338,790,110);g.lineStyle(3,0x57cbbd,.65);g.strokeEllipse(480,338,790,110);
  for(const x of [90,850]){g.fillStyle(0x1d3446);g.fillRoundedRect(x,155,20,130,5);g.fillStyle(0x6ce7d9);g.fillRoundedRect(x+6,163,8,91,3);g.fillStyle(0x74fff1,.06);g.fillEllipse(x+10,210,105,190);}
 }
}
export function drawCosmetics(g,{mask='none',hat='none'}={}){
 if(mask==='pumpkin'){
  g.fillStyle(0xca601d);g.fillEllipse(0,-165,79,65);g.fillStyle(0xf49426);g.fillEllipse(-16,-165,29,61);g.fillEllipse(16,-165,29,61);g.fillStyle(0xffac3a);g.fillEllipse(0,-165,28,64);
  g.fillStyle(0x628d36);g.fillRoundedRect(-5,-209,11,15,3);
  g.fillStyle(0x44261e);g.fillTriangle(-26,-178,-9,-178,-14,-165);g.fillTriangle(9,-178,26,-178,14,-165);g.fillTriangle(-5,-162,5,-162,0,-170);
  g.fillStyle(0xffdb68);g.fillTriangle(-23,-176,-12,-176,-15,-169);g.fillTriangle(12,-176,23,-176,15,-169);
  g.lineStyle(5,0x44261e);g.beginPath();g.moveTo(-22,-153);g.lineTo(-13,-145);g.lineTo(-6,-151);g.lineTo(1,-144);g.lineTo(8,-151);g.lineTo(15,-145);g.lineTo(24,-155);g.strokePath();
 }
 if(hat==='santa'){
  g.fillStyle(0xcd344a);g.fillTriangle(-37,-193,29,-193,-2,-244);g.fillTriangle(-2,-244,11,-226,37,-221);
  g.fillStyle(0xa62740);g.fillTriangle(10,-196,29,-193,-2,-244);
  g.fillStyle(0xf1f8f5);g.fillRoundedRect(-38,-200,76,15,6);g.fillCircle(37,-222,11);
 }
}
