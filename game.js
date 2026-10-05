'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
let W,H,scale,ox,oy,time=0,playing=false,paused=false,armed=false,sound=false,audio,toastTimer=0;
let state, enemies=[],friends=[],particles=[],shots=[],spawn=0,spawnClock=0,cool=0,last=0;
const path=[[-230,330],[150,330],[180,180],[-130,180],[-140,25],[65,25],[65,-150]];
let segs=[],length=0;for(let i=1;i<path.length;i++){let a=path[i-1],b=path[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);segs.push({a,b,l,start:length});length+=l}
function point(d){d=Math.max(0,Math.min(length,d));const s=segs.find(s=>d<=s.start+s.l)||segs.at(-1),t=(d-s.start)/s.l;return{x:s.a[0]+(s.b[0]-s.a[0])*t,y:s.a[1]+(s.b[1]-s.a[1])*t}}
function reset(persist=true){state={gold:150,hp:100,wave:0,level:1,kills:0};enemies=[];friends=[];particles=[];shots=[];spawn=0;cool=0;recruit('soldier',5,false);if(persist)save()}
function save(){try{localStorage.setItem('bastion-v1',JSON.stringify({...state,friends:friends.map(f=>({type:f.type,hp:f.hp,max:f.max,pos:f.pos})),wave:spawn||enemies.length?Math.max(0,state.wave-1):state.wave}))}catch{}}
function message(s){$('toast').textContent=s;toastTimer=3}
function beep(freq){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();let o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.08);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.09)}catch{}}
function recruit(type,n,pay=true){let cost=type==='archer'?60:40;if(pay&&state.gold<cost)return;if(pay)state.gold-=cost;for(let i=0;i<n;i++){let max=type==='archer'?55:95;friends.push({type,hp:max,max,pos:length-75-Math.random()*105,cd:Math.random(),lane:(Math.random()-.5)*42})}beep(550);if(pay)save();hud()}
function nextWave(){if(spawn||enemies.length||state.wave>=10)return;state.wave++;spawn=24+state.wave*12;spawnClock=0;message(state.wave%3===0?'Волна '+state.wave+' · В конце появится вожак!':'Волна '+state.wave+' — держи строй!');save()}
function burst(x,y,color,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,life:.5+Math.random()*.5,color})}
function hit(e,d){e.hp-=d*(e.armored?.7:1);if(e.hp<=0&&!e.dead){e.dead=true;state.gold+=4;state.kills++;burst(e.x,e.y,'#ffcb66',4);beep(240)}}
function resize(){W=innerWidth;H=innerHeight;let d=Math.min(devicePixelRatio||1,2);canvas.width=W*d;canvas.height=H*d;ctx.setTransform(d,0,0,d,0,0);scale=Math.min(W/490,(H-270)/650);ox=W/2;oy=115+(H-270)/2-70*scale}
window.addEventListener('resize',resize);resize();
function proj(x,y,z=0){return[ox+(x-y*.34)*scale,oy+(y*.78-z)*scale]}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>{let q=proj(...p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.closePath();ctx.fill()}
function line(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width*scale;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>{let q=proj(...p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.stroke()}
function box(x,y,w,d,h,c){poly([[x,y,0],[x+w,y,0],[x+w,y,h],[x,y,h]],c[1]);poly([[x+w,y,0],[x+w,y+d,0],[x+w,y+d,h],[x+w,y,h]],c[2]);poly([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],c[0])}
function tree(x,y){box(x-3,y-3,6,6,20,['#755841','#543f30','#493327']);for(let i=0;i<3;i++){let z=20+i*12,r=24-i*5;poly([[x-r,y,z],[x+r,y,z],[x,y-10,z+34]],['#216647','#26794c','#348752'][i]);poly([[x+r,y,z],[x,y+14,z],[x,y-10,z+34]],'#174f3e')}}
// All architecture is shaded world-space geometry: no external textures or downloads.
function masonry(x,y,w,d,h){
 box(x,y,w,d,h,['#e4d4af','#c4b998','#938b76']);
 for(let z=8;z<h;z+=10){line([[x,y-.2,z],[x+w,y-.2,z]],'#9b927b',.7);line([[x+w+.2,y,z],[x+w+.2,y+d,z]],'#766f60',.7);
 for(let a=6+(Math.floor(z/10)%2)*9;a<w;a+=18)line([[x+a,y-.3,z-8],[x+a,y-.3,z]],'#aaa086',.6);
 for(let a=7;a<d;a+=15)line([[x+w+.3,y+a,z-8],[x+w+.3,y+a,z]],'#807867',.6)}
 box(x-2,y-2,w+4,d+4,5,['#eee1c1','#b5aa90','#827b69']);
}
function roof(x,y,w,d,z){let ridge=x+w/2,top=z+w*.42;
 poly([[x-5,y-5,z],[ridge,y-5,top],[ridge,y+d+5,top],[x-5,y+d+5,z]],'#bb7140');
 poly([[ridge,y-5,top],[x+w+5,y-5,z],[x+w+5,y+d+5,z],[ridge,y+d+5,top]],'#78452f');
 for(let a=0;a<=d;a+=8){line([[x-5,y+a,z],[ridge,y+a,top],[x+w+5,y+a,z]],'#e09a5b',1)}
 for(let a=8;a<w/2;a+=9){line([[x+a,y-5,z+(a+5)*.76],[x+a,y+d+5,z+(a+5)*.76]],'#9c592f',.8)}
 line([[ridge,y-6,top+1],[ridge,y+d+6,top+1]],'#efb976',3);
}
function windowSlit(x,y,z){poly([[x,y,z],[x+5,y,z],[x+5,y,z+11],[x,y,z+11]],'#344642');line([[x-1,y,z+12],[x+6,y,z+12]],'#efe0ba',2)}
function tower(x,y){masonry(x,y,23,29,73);poly([[x-3,y-3,77],[x+26,y-3,77],[x+26,y+32,77],[x-3,y+32,77]],'#ded4b6');poly([[x-3,y-3,73],[x+26,y-3,73],[x+26,y-3,77],[x-3,y-3,77]],'#b8ad90');
 for(let a=0;a<23;a+=9){box(x+a,y-3,6,7,87,['#eee1bc','#c5bb9e','#928872']);box(x+a,y+25,6,7,87,['#eee1bc','#c5bb9e','#928872'])}
 windowSlit(x+9,y-.5,44);windowSlit(x+9,y-.5,21);
}
function building(x,y,kind){
 poly([[x-12,y-12],[x+86,y-12],[x+95,y+67],[x-9,y+67]],'#244f3d');
 if(kind==='castle'){
 masonry(x,y,64,49,53);roof(x,y,64,49,54);
 masonry(x+7,y+20,50,25,35);roof(x+7,y+20,50,25,36);
 tower(x-17,y+26);tower(x+61,y+26);
 // Iron-bound gate and stone lintel.
 box(x+21,y+19,22,3,29,['#7c6343','#513b2b','#352b24']);
 for(let a=24;a<42;a+=5)line([[x+a,y+18.5,2],[x+a,y+18.5,27]],'#98734d',1);
 line([[x+22,y+18,10],[x+43,y+18,10]],'#293c37',3);line([[x+22,y+18,22],[x+43,y+18,22]],'#293c37',3);
 windowSlit(x+10,y-.3,31);windowSlit(x+49,y-.3,31);
 line([[x+72,y+40,87],[x+72,y+40,119]],'#614a32',2);
 poly([[x+72,y+40,119],[x+96,y+40,114+Math.sin(time*3)*2],[x+93,y+40,101],[x+72,y+40,104]],'#418df4');
 }else{
 masonry(x,y,54,38,28);roof(x,y,54,38,30);
 box(x-2,y-1,4,3,31,['#bd9762','#775737','#503d2c']);box(x+52,y-1,4,3,31,['#bd9762','#775737','#503d2c']);
 box(x+20,y-2,15,3,21,['#98734c','#5d412d','#3d3025']);
 for(let a=22;a<35;a+=4)line([[x+a,y-2.5,2],[x+a,y-2.5,21]],'#b08351',.8);
 windowSlit(x+8,y-1,10);windowSlit(x+43,y-1,10);
 box(x+40,y+24,9,10,61,['#b6a387','#887661','#615747']);
 // Blue awning, timber posts, supply crates.
 poly([[x+6,y-19,18],[x+48,y-19,18],[x+48,y-3,27],[x+6,y-3,27]],'#397da8');
 for(let a=8;a<48;a+=10)line([[x+a,y-19,18],[x+a,y-3,27]],'#78aed0',3);
 box(x+5,y-19,2,2,18,['#b58d58','#765333','#523d2b']);box(x+47,y-19,2,2,18,['#b58d58','#765333','#523d2b']);
 crate(x+58,y+13);crate(x+60,y+28);
 }
}
function crate(x,y){box(x,y,13,12,12,['#c18b51','#996638','#6c492d']);line([[x,y-.2,1],[x+13,y-.2,11]],'#deb477',1.5);line([[x+13,y-.2,1],[x,y-.2,11]],'#deb477',1.5)}
function unit(u,red){if(!Number.isFinite(u.x)||!Number.isFinite(u.y))return;let p=proj(u.x,u.y),sz=(u.boss?1.65:1)*scale;ctx.save();ctx.translate(...p);ctx.scale(sz,sz);ctx.fillStyle='#082c2850';ctx.beginPath();ctx.ellipse(2,2,8,4,0,0,7);ctx.fill();let bob=Math.sin(time*10+u.pos*.1)*1.3;ctx.translate(0,bob);ctx.fillStyle=red?'#ad3037':'#2156b0';ctx.fillRect(-5,-12,10,12);ctx.fillStyle=red?'#f25b54':'#468eea';ctx.fillRect(-6,-21,12,10);ctx.fillStyle=red?'#ff8774':'#84bcff';ctx.fillRect(-5,-22,9,3);ctx.fillStyle='#f5d1a1';ctx.fillRect(-3,-13,6,4);ctx.fillStyle=red?'#8d202c':'#1c467d';ctx.fillRect(-5,-1,4,5);ctx.fillRect(2,-1,4,5);ctx.fillStyle='#d5e3de';ctx.fillRect(7,-17,2,14);ctx.fillStyle=red?'#d14340':'#3d7cd4';ctx.fillRect(-9,-10,5,9);ctx.strokeStyle=red?'#ffd197':'#c3e2ff';ctx.lineWidth=1;if(u.type==='archer'){ctx.strokeStyle='#e4b06a';ctx.beginPath();ctx.arc(9,-10,8,-1.3,1.3);ctx.stroke();ctx.beginPath();ctx.moveTo(11,-18);ctx.lineTo(11,-2);ctx.stroke()}else{ctx.fillStyle=u.boss?'#473f48':red?'#9e3538':'#335f97';ctx.beginPath();ctx.moveTo(-11,-12);ctx.lineTo(-4,-12);ctx.lineTo(-4,-5);ctx.lineTo(-7.5,-1);ctx.lineTo(-11,-5);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#f0d082';ctx.fillRect(-8,-10,1,6)}if(u.armored||u.boss){ctx.fillStyle='#879393';ctx.fillRect(-6,-22,12,4);ctx.fillStyle='#d9d8bb';ctx.fillRect(-5,-22,10,1)}if(u.hp<u.max){ctx.fillStyle='#19372c';ctx.fillRect(-9,-29,18,3);ctx.fillStyle=red?'#f17a70':'#83dfb8';ctx.fillRect(-9,-29,18*Math.max(0,u.hp/u.max),3)}ctx.restore()}
function render(){ctx.fillStyle='#183d35';ctx.fillRect(0,0,W,H);let grd=ctx.createRadialGradient(W*.6,H*.4,10,W/2,H/2,H);grd.addColorStop(0,'#34745c');grd.addColorStop(1,'#102f2d');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);poly([[-260,-240,-35],[250,-240,-35],[250,420,-35],[-260,420,-35]],'#103d33');poly([[-260,-240,0],[250,-240,0],[250,420,0],[-260,420,0]],'#368563');for(let i=0;i<85;i++){let x=((i*113)%490)-245,y=((i*197)%620)-220;line([[x,y],[x+4,y+1]],'#439471',2)}line(path,'#286549',68);line(path,'#c7b990',56);line(path,'#e3d2a6',43);for(let i=0;i<9;i++){tree(-225+(i%2)*28,-205+i*54);tree(214,-210+i*52)}building(26,-216,'castle');building(-38,-45,'barracks');building(115,-28,'barracks');masonry(-205,90,38,30,30);roof(-205,90,38,30,31);crate(-220,137);crate(-204,142);crate(-189,137);let all=[...enemies.filter(e=>!e.dead),...friends];all.sort((a,b)=>a.y-b.y).forEach(u=>unit(u,!!u.enemy));for(let s of shots){line([[s.x,s.y,18],[s.tx,s.ty,18]],'#ffedb6',2)}for(let p of particles){let q=proj(p.x,p.y,10);ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(...q,4*scale,0,7);ctx.fill()}ctx.globalAlpha=1;if(armed){ctx.fillStyle='#091d2b99';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#ffdf94';ctx.font='bold 18px system-ui';ctx.fillText('Коснись красной орды',W/2,H*.47)}}
function update(dt){time+=dt;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').textContent=''}if(!playing||paused)return;cool=Math.max(0,cool-dt);if(spawn>0){spawnClock-=dt;while(spawnClock<=0&&spawn){spawn--;let boss=state.wave%3===0&&spawn===0,armored=state.wave>=4&&spawn%5===0,runner=state.wave>=2&&spawn%7===0&&!armored,max=(22+state.wave*6)*(boss?8:armored?2:runner?.7:1);enemies.push({enemy:true,boss,armored,runner,hp:max,max,pos:-Math.random()*30,lane:(Math.random()-.5)*40,cd:0});spawnClock+=.18/(1+state.wave*.06)}}
for(let e of enemies){if(e.dead)continue;e.cd-=dt;let target=friends.find(f=>Math.abs(f.pos-e.pos)<24);if(target){if(e.cd<=0){target.hp-=(e.boss?23:e.armored?13:9);e.cd=.8;burst(e.x,e.y,'#ffe6a4',2)}}else e.pos+=(e.boss?20:e.armored?24:e.runner?52:30+state.wave)*dt;if(e.pos>=length){state.hp-=e.boss?15:3;e.dead=true;burst(e.x,e.y,'#ff6b57',8)}let p=point(e.pos);e.x=p.x+e.lane;e.y=p.y}
for(let f of friends){f.cd-=dt;let range=f.type==='archer'?155:29;let target=enemies.find(e=>!e.dead&&Math.abs(e.pos-f.pos)<range);if(target){if(f.cd<=0){hit(target,(f.type==='archer'?15:20)*(1+.25*(state.level-1)));f.cd=f.type==='archer'?.9:.6;shots.push({x:f.x??point(f.pos).x,y:f.y??point(f.pos).y,tx:target.x,ty:target.y,life:.1})}}else{let front=enemies.find(e=>!e.dead);if(front&&f.type==='soldier')f.pos=Math.max(length-420,f.pos-35*dt);else f.pos=Math.min(length-80,f.pos+20*dt)}let p=point(f.pos);f.x=p.x+(f.lane||0);f.y=p.y}friends=friends.filter(f=>f.hp>0);enemies=enemies.filter(e=>!e.dead);for(let p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt}particles=particles.filter(p=>p.life>0);shots=shots.filter(s=>(s.life-=dt)>0);
if(state.hp<=0){state.hp=0;finish(false)}else if(state.wave&&spawn===0&&enemies.length===0&&state.active){state.active=false;state.gold+=75+state.wave*10;friends.forEach(f=>f.hp=f.max);save();if(state.wave===10)finish(true);else message('Проход удержан! Награда '+(75+state.wave*10)+' ●')}
state.active=!!(spawn||enemies.length);hud()}
function hud(){$('gold').textContent=state.gold;$('hp').textContent=Math.max(0,Math.ceil(state.hp));$('health').style.width=state.hp+'%';$('waveLabel').textContent='Волна '+Math.max(1,state.wave)+' / 10';$('soldier').disabled=state.gold<40;$('archer').disabled=state.gold<60;$('upgrade').disabled=state.gold<state.level*100;$('upgradeCost').textContent=state.level*100+' ● · уровень '+state.level;$('startWave').disabled=!!(spawn||enemies.length);$('startWave').textContent=spawn||enemies.length?'Идёт бой…':'Волна '+(state.wave+1)+' →';$('status').textContent=spawn||enemies.length?'Защитников: '+friends.length+' · Врагов: '+(enemies.length+spawn):'Следующая: '+(state.wave+1)+' · '+(24+(state.wave+1)*12)+' врагов'+((state.wave+1)%3===0?' · Вожак':'');$('cooldown').textContent=cool>0?'Перезарядка '+Math.ceil(cool)+' с':'Готов · коснись дороги';$('fire').disabled=cool>0;$('repair').disabled=state.gold<60||state.hp>=100||!!(spawn||enemies.length)}
function finish(win){playing=false;save();$('overlay').classList.remove('hidden');$('overlay').querySelector('h1').innerHTML=win?'Королевство<br>спасено!':'Бастион<br>пал';$('overlay').querySelectorAll('p')[0].textContent='Волна '+state.wave+' · Побеждено врагов: '+state.kills;$('overlay').querySelectorAll('p')[1].textContent=win?'Все 10 волн выдержаны. Начни новый поход!':'Попробуй больше мечников для передовой и лучников для поддержки.';$('play').textContent='Новый поход →';$('resume').classList.add('hidden')}
$('repair').onclick=()=>{if(state.gold>=60&&state.hp<100&&!spawn&&!enemies.length){state.gold-=60;state.hp=Math.min(100,state.hp+30);message('Стены восстановлены: +30 ♥');save();hud()}};
$('play').onclick=()=>{reset();playing=true;paused=false;$('overlay').classList.add('hidden');hud()};
let saved;try{saved=JSON.parse(localStorage.getItem('bastion-v1'))}catch{}if(saved&&saved.hp>0&&saved.wave<10){$('resume').classList.remove('hidden');$('resume').onclick=()=>{state={...saved};friends=(saved.friends||[]).map(f=>({...f,lane:(Math.random()-.5)*40,cd:0}));playing=true;paused=false;$('overlay').classList.add('hidden');hud()}}reset(false);
$('soldier').onclick=()=>recruit('soldier',5);$('archer').onclick=()=>recruit('archer',3);$('upgrade').onclick=()=>{if(state.gold<state.level*100)return;state.gold-=state.level*100;state.level++;message('Армия усилена!');save();hud()};$('startWave').onclick=nextWave;$('fire').onclick=()=>{if(cool<=0){armed=!armed;message(armed?'Выбери место удара':'Удар отменён')}};$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';message(paused?'Пауза':'Бой продолжается')};$('sound').onclick=()=>{sound=!sound;$('sound').style.color=sound?'#efca68':'#fff';beep(700)};
canvas.addEventListener('pointerdown',e=>{if(!armed||paused||!playing)return;armed=false;cool=20;let y=(e.clientY-oy)/(.78*scale),x=(e.clientX-ox)/scale+y*.34;burst(x,y,'#ff974e',60);enemies.forEach(v=>{if(Math.hypot(v.x-x,v.y-y)<95)hit(v,110+state.level*20)});beep(90)});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){paused=true;$('pause').textContent='▶';save()}});window.addEventListener('pagehide',save);
function frame(t){let dt=Math.min((t-last)/1000,.04);last=t;update(dt);render();requestAnimationFrame(frame)}requestAnimationFrame(frame);if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
