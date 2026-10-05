'use strict';
const canvas=document.getElementById('game'),ctx=canvas.getContext('2d'),$=id=>document.getElementById(id);
let W,H,scale,ox,oy,time=0,playing=false,paused=false,armed=false,sound=false,audio,toastTimer=0;
let state, enemies=[],friends=[],particles=[],shots=[],spawn=0,spawnClock=0,cool=0,last=0;
const path=[[-230,330],[150,330],[180,180],[-130,180],[-140,25],[65,25],[65,-150]];
let segs=[],length=0;for(let i=1;i<path.length;i++){let a=path[i-1],b=path[i],l=Math.hypot(b[0]-a[0],b[1]-a[1]);segs.push({a,b,l,start:length});length+=l}
function point(d){d=Math.max(0,Math.min(length,d));const s=segs.find(s=>d<=s.start+s.l)||segs.at(-1),t=(d-s.start)/s.l;return{x:s.a[0]+(s.b[0]-s.a[0])*t,y:s.a[1]+(s.b[1]-s.a[1])*t}}
const plots=[{id:'barracks',x:-20,y:-28,cost:60,name:'Казарма'},{id:'archer',x:146,y:-10,cost:100,name:'Лучная башня'},{id:'cannon',x:-183,y:108,cost:150,name:'Пушка'}];
let hero,buildings=[],dragging=false;
function reset(persist=true){state={gold:0,hp:100,wave:0,level:1,kills:0};hero={x:-140,y:290,tx:-140,ty:290,pos:0,cd:0,type:'hero'};buildings=plots.map(p=>({...p,built:false,hp:100,charge:0,timer:0}));enemies=[];friends=[];particles=[];shots=[];spawn=0;cool=0;armed=false;if(persist)save();hud()}
function save(){try{localStorage.setItem('bastion-v3',JSON.stringify({...state,hero,buildings,friends:friends.map(f=>({type:f.type,hp:f.hp,max:f.max,pos:f.pos,lane:f.lane})),wave:spawn||enemies.length?Math.max(0,state.wave-1):state.wave}))}catch{}}
function message(s){$('toast').textContent=s;toastTimer=3}
function beep(freq){if(!sound)return;try{audio??=new(window.AudioContext||window.webkitAudioContext)();let o=audio.createOscillator(),g=audio.createGain();o.frequency.value=freq;g.gain.setValueAtTime(.025,audio.currentTime);g.gain.exponentialRampToValueAtTime(.001,audio.currentTime+.08);o.connect(g).connect(audio.destination);o.start();o.stop(audio.currentTime+.09)}catch{}}
function recruit(type,n,pay=true){let cost=type==='archer'?60:40;if(pay&&state.gold<cost)return;if(pay)state.gold-=cost;for(let i=0;i<n;i++){let max=type==='archer'?55:95;friends.push({type,hp:max,max,pos:length-75-Math.random()*105,cd:Math.random(),lane:(Math.random()-.5)*42})}beep(550);if(pay)save();hud()}
function nextWave(){if(spawn||enemies.length||state.wave>=10)return;state.wave++;spawn=12+state.wave*6;spawnClock=0;message(state.wave%3===0?'Волна '+state.wave+' · В конце появится вожак!':'Волна '+state.wave+' — держи строй!');save()}
function burst(x,y,color,n){for(let i=0;i<n;i++)particles.push({x,y,vx:(Math.random()-.5)*100,vy:(Math.random()-.5)*100,life:.5+Math.random()*.5,color})}
function hit(e,d){e.hp-=d*(e.armored?.7:1);e.flash=.12;if(e.hp<=0&&!e.dead){e.dead=true;state.gold+=e.boss?25:e.armored?8:5;state.kills++;burst(e.x,e.y,'#ffcb66',4);beep(240)}}
function resize(){W=innerWidth;H=innerHeight;let d=Math.min(devicePixelRatio||1,2);canvas.width=W*d;canvas.height=H*d;ctx.setTransform(d,0,0,d,0,0);scale=Math.min(W/490,(H-270)/650);ox=W/2;oy=115+(H-270)/2-70*scale}
window.addEventListener('resize',resize);resize();
function proj(x,y,z=0){return[ox+(x-y*.34)*scale,oy+(y*.78-z)*scale]}
function poly(points,color){ctx.fillStyle=color;ctx.beginPath();points.forEach((p,i)=>{let q=proj(...p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.closePath();ctx.fill()}
function line(points,color,width){ctx.strokeStyle=color;ctx.lineWidth=width*scale;ctx.lineCap='round';ctx.lineJoin='round';ctx.beginPath();points.forEach((p,i)=>{let q=proj(...p);i?ctx.lineTo(...q):ctx.moveTo(...q)});ctx.stroke()}
function box(x,y,w,d,h,c,base=0){poly([[x,y+d,base],[x+w,y+d,base],[x+w,y+d,h],[x,y+d,h]],c[1]);poly([[x+w,y,base],[x+w,y+d,base],[x+w,y+d,h],[x+w,y,h]],c[2]);poly([[x,y,h],[x+w,y,h],[x+w,y+d,h],[x,y+d,h]],c[0])}
function tree(x,y){box(x-3,y-3,6,6,20,['#755841','#543f30','#493327']);for(let i=0;i<3;i++){let z=20+i*12,r=24-i*5;poly([[x-r,y,z],[x+r,y,z],[x,y-10,z+34]],['#216647','#26794c','#348752'][i]);poly([[x+r,y,z],[x,y+14,z],[x,y-10,z+34]],'#174f3e')}}
// All architecture is shaded world-space geometry: no external textures or downloads.
function masonry(x,y,w,d,h){
 box(x-2,y-2,w+4,d+4,5,['#eee1c1','#b5aa90','#827b69']);box(x,y,w,d,h,['#e4d4af','#c4b998','#938b76']);
 for(let z=8;z<h;z+=10){line([[x,y+d+.2,z],[x+w,y+d+.2,z]],'#9b927b',.7);line([[x+w+.2,y,z],[x+w+.2,y+d,z]],'#766f60',.7);
 for(let a=6+(Math.floor(z/10)%2)*9;a<w;a+=18)line([[x+a,y+d+.3,z-8],[x+a,y+d+.3,z]],'#aaa086',.6);
 for(let a=7;a<d;a+=15)line([[x+w+.3,y+a,z-8],[x+w+.3,y+a,z]],'#807867',.6)}
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
 for(let a=0;a<23;a+=9){box(x+a,y-3,6,7,87,['#eee1bc','#c5bb9e','#928872'],77);box(x+a,y+25,6,7,87,['#eee1bc','#c5bb9e','#928872'],77)}
 windowSlit(x+9,y+29.5,44);windowSlit(x+9,y+29.5,21);
}
function building(x,y,kind){
 poly([[x-12,y-12],[x+86,y-12],[x+95,y+67],[x-9,y+67]],'#244f3d');
 if(kind==='castle'){
 masonry(x,y,64,49,53);roof(x,y,64,49,54);
 masonry(x+7,y+20,50,25,35);roof(x+7,y+20,50,25,36);
 tower(x-17,y+26);tower(x+61,y+26);
 // Iron-bound gate and stone lintel.
 box(x+21,y+46,22,3,29,['#7c6343','#513b2b','#352b24']);
 for(let a=24;a<42;a+=5)line([[x+a,y+49.5,2],[x+a,y+49.5,27]],'#98734d',1);
 line([[x+22,y+50,10],[x+43,y+50,10]],'#293c37',3);line([[x+22,y+50,22],[x+43,y+50,22]],'#293c37',3);
 windowSlit(x+10,y+49.3,31);windowSlit(x+49,y+49.3,31);
 line([[x+72,y+40,87],[x+72,y+40,119]],'#614a32',2);
 poly([[x+72,y+40,119],[x+96,y+40,114+Math.sin(time*3)*2],[x+93,y+40,101],[x+72,y+40,104]],'#418df4');
 }else{
 masonry(x,y,54,38,28);roof(x,y,54,38,30);
 box(x-2,y-1,4,3,31,['#bd9762','#775737','#503d2c']);box(x+52,y-1,4,3,31,['#bd9762','#775737','#503d2c']);
 box(x+20,y+36,15,3,21,['#98734c','#5d412d','#3d3025']);
 for(let a=22;a<35;a+=4)line([[x+a,y+39.5,2],[x+a,y+39.5,21]],'#b08351',.8);
 windowSlit(x+8,y+38.5,10);windowSlit(x+43,y+38.5,10);
 box(x+40,y+24,9,10,61,['#b6a387','#887661','#615747']);
 // Blue awning, timber posts, supply crates.
 poly([[x+6,y+54,18],[x+48,y+54,18],[x+48,y+38,27],[x+6,y+38,27]],'#397da8');
 for(let a=8;a<48;a+=10)line([[x+a,y+54,18],[x+a,y+38,27]],'#78aed0',3);
 box(x+5,y+54,2,2,18,['#b58d58','#765333','#523d2b']);box(x+47,y+54,2,2,18,['#b58d58','#765333','#523d2b']);
 crate(x+58,y+13);crate(x+60,y+28);
 }
}
function crate(x,y){box(x,y,13,12,12,['#c18b51','#996638','#6c492d']);line([[x,y-.2,1],[x+13,y-.2,11]],'#deb477',1.5);line([[x+13,y-.2,1],[x,y-.2,11]],'#deb477',1.5)}
function unit(u,red){if(!Number.isFinite(u.x)||!Number.isFinite(u.y))return;let p=proj(u.x,u.y),sz=(u.type==='hero'?1.55:u.boss?1.65:1)*scale;ctx.save();ctx.translate(...p);ctx.scale(sz,sz);if(u.type==='hero'){ctx.strokeStyle='#ffdc75';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(0,3,13,6,0,0,7);ctx.stroke()}if(u.flash>0)ctx.globalAlpha=.6;ctx.fillStyle='#082c2850';ctx.beginPath();ctx.ellipse(2,2,8,4,0,0,7);ctx.fill();let bob=Math.sin(time*10+u.pos*.1)*1.3;ctx.translate(0,bob);ctx.fillStyle=red?'#ad3037':'#2156b0';ctx.fillRect(-5,-12,10,12);ctx.fillStyle=red?'#f25b54':'#468eea';ctx.fillRect(-6,-21,12,10);ctx.fillStyle=red?'#ff8774':'#84bcff';ctx.fillRect(-5,-22,9,3);if(u.type==='hero'){ctx.fillStyle='#f4ca65';ctx.fillRect(-6,-23,12,3);ctx.fillRect(-5,-27,2,5);ctx.fillRect(0,-28,2,5);ctx.fillRect(4,-27,2,5)}ctx.fillStyle='#f5d1a1';ctx.fillRect(-3,-13,6,4);ctx.fillStyle=red?'#8d202c':'#1c467d';ctx.fillRect(-5,-1,4,5);ctx.fillRect(2,-1,4,5);ctx.fillStyle='#d5e3de';ctx.fillRect(7,-17,2,14);ctx.fillStyle=red?'#d14340':'#3d7cd4';ctx.fillRect(-9,-10,5,9);ctx.strokeStyle=red?'#ffd197':'#c3e2ff';ctx.lineWidth=1;if(u.type==='archer'){ctx.strokeStyle='#e4b06a';ctx.beginPath();ctx.arc(9,-10,8,-1.3,1.3);ctx.stroke();ctx.beginPath();ctx.moveTo(11,-18);ctx.lineTo(11,-2);ctx.stroke()}else{ctx.fillStyle=u.boss?'#473f48':red?'#9e3538':'#335f97';ctx.beginPath();ctx.moveTo(-11,-12);ctx.lineTo(-4,-12);ctx.lineTo(-4,-5);ctx.lineTo(-7.5,-1);ctx.lineTo(-11,-5);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#f0d082';ctx.fillRect(-8,-10,1,6)}if(u.siege){ctx.fillStyle='#845b3d';ctx.fillRect(-13,-8,26,8);ctx.fillStyle='#d7b476';ctx.fillRect(-16,-13,31,5)}if(u.armored||u.boss){ctx.fillStyle='#879393';ctx.fillRect(-6,-22,12,4);ctx.fillStyle='#d9d8bb';ctx.fillRect(-5,-22,10,1)}if(u.hp<u.max){ctx.fillStyle='#19372c';ctx.fillRect(-9,-29,18,3);ctx.fillStyle=red?'#f17a70':'#83dfb8';ctx.fillRect(-9,-29,18*Math.max(0,u.hp/u.max),3)}ctx.restore()}
function drawPlot(b){let x=b.x-28,y=b.y-22;
 if(!b.built){ctx.save();ctx.setLineDash([7*scale,5*scale]);line([[x,y],[x+65,y],[x+65,y+58],[x,y+58],[x,y]],state.gold>=b.cost?'#ffe3a0':'#c6d2ba',2);ctx.restore();let q=proj(b.x,b.y+14);ctx.textAlign='center';ctx.font=`bold ${Math.max(10,13*scale)}px system-ui`;ctx.fillStyle='#fff0b9';ctx.fillText(b.cost+' ●',q[0],q[1]);ctx.font=`${Math.max(9,10*scale)}px system-ui`;ctx.fillText(b.name,q[0],q[1]-17*scale);if(b.charge>0)line([[x,y+65],[x+65*b.charge,y+65]],'#efcb67',5);return}
 if(b.id==='barracks')building(x,y,'barracks');else if(b.id==='archer'){masonry(x+10,y+10,35,32,52);roof(x+10,y+10,35,32,54);windowSlit(x+25,y+42,30)}else{masonry(x+4,y+12,43,30,18);box(x+16,y+12,13,33,30,['#68716c','#3d4744','#26332f'],19);crate(x+49,y+25)}
 if(b.hp<100){let q=proj(b.x,b.y+42);ctx.fillStyle='#283c32';ctx.fillRect(q[0]-20*scale,q[1],40*scale,4*scale);ctx.fillStyle='#e9c56d';ctx.fillRect(q[0]-20*scale,q[1],40*scale*b.hp/100,4*scale)}
}
function projectile(x,y,target,damage,kind='arrow'){shots.push({x,y,tx:target.x,ty:target.y,life:.35,duration:.35,kind});hit(target,damage);if(kind==='cannon')burst(target.x,target.y,'#ffae65',16)}
function render(){ctx.fillStyle='#183d35';ctx.fillRect(0,0,W,H);let grd=ctx.createRadialGradient(W*.6,H*.4,10,W/2,H/2,H);grd.addColorStop(0,'#34745c');grd.addColorStop(1,'#102f2d');ctx.fillStyle=grd;ctx.fillRect(0,0,W,H);poly([[-260,-240,-35],[250,-240,-35],[250,420,-35],[-260,420,-35]],'#103d33');poly([[-260,-240,0],[250,-240,0],[250,420,0],[-260,420,0]],'#368563');for(let i=0;i<85;i++){let x=((i*113)%490)-245,y=((i*197)%620)-220;line([[x,y],[x+4,y+1]],'#439471',2)}line(path,'#286549',68);line(path,'#c7b990',56);line(path,'#e3d2a6',43);for(let i=0;i<9;i++){tree(-225+(i%2)*28,-205+i*54);tree(214,-210+i*52)}building(26,-216,'castle');buildings.forEach(drawPlot);let all=[...enemies.filter(e=>!e.dead),...friends,hero];all.sort((a,b)=>a.y-b.y).forEach(u=>unit(u,!!u.enemy));for(let s of shots){let t=1-s.life/s.duration;if(s.kind==='slash'){let q=proj(s.x,s.y,14);ctx.strokeStyle='#ffe8a0';ctx.lineWidth=4*scale;ctx.beginPath();ctx.arc(...q,36*scale,t*3,t*3+1.8);ctx.stroke()}else{let x=s.x+(s.tx-s.x)*t,y=s.y+(s.ty-s.y)*t,z=18+Math.sin(t*Math.PI)*(s.kind==='cannon'?65:40);let q=proj(x,y,z);if(s.kind==='cannon'){ctx.fillStyle='#353a35';ctx.beginPath();ctx.arc(...q,5*scale,0,7);ctx.fill()}else line([[x-6,y, z],[x+6,y,z]],'#ffe5aa',2)}}for(let p of particles){let q=proj(p.x,p.y,10);ctx.globalAlpha=Math.max(0,p.life);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(...q,4*scale,0,7);ctx.fill()}ctx.globalAlpha=1;if(armed){ctx.fillStyle='#091d2b99';ctx.fillRect(0,0,W,H);ctx.textAlign='center';ctx.fillStyle='#ffdf94';ctx.font='bold 18px system-ui';ctx.fillText('Коснись красной орды',W/2,H*.47)}}
function update(dt){time+=dt;if(toastTimer>0){toastTimer-=dt;if(toastTimer<=0)$('toast').textContent=''}if(!playing||paused)return;cool=Math.max(0,cool-dt);
 let dx=hero.tx-hero.x,dy=hero.ty-hero.y,dist=Math.hypot(dx,dy);if(dist>2){let step=Math.min(dist,140*dt);hero.x+=dx/dist*step;hero.y+=dy/dist*step;hero.pos+=step}
 hero.cd-=dt;if(hero.cd<=0){let targets=enemies.filter(e=>!e.dead&&Math.hypot(e.x-hero.x,e.y-hero.y)<105).sort((a,b)=>Math.hypot(a.x-hero.x,a.y-hero.y)-Math.hypot(b.x-hero.x,b.y-hero.y)).slice(0,3);if(targets.length){targets.forEach(e=>hit(e,29+state.level*7));shots.push({x:hero.x,y:hero.y,kind:'slash',life:.25,duration:.25});hero.cd=.4;beep(380)}}
 for(let b of buildings){if(!b.built){if(state.gold>=b.cost&&Math.hypot(hero.x-b.x,hero.y-b.y)<53){b.charge=Math.min(1,b.charge+dt);if(b.charge>=1){state.gold-=b.cost;b.built=true;b.hp=100;b.timer=0;burst(b.x,b.y,'#ffe1a0',25);message(b.name+' построена!');save()}}else b.charge=0;continue}b.timer-=dt;
 if(b.id==='barracks'){if(b.timer<=0&&friends.length<15){recruit('soldier',3,false);b.timer=8;message('Казарма: +3 мечника')}}else if(b.timer<=0){let range=b.id==='cannon'?210:230,target=enemies.find(e=>!e.dead&&Math.hypot(e.x-b.x,e.y-b.y)<range);if(target){if(b.id==='cannon'){enemies.filter(e=>!e.dead&&Math.hypot(e.x-target.x,e.y-target.y)<55).forEach(e=>hit(e,40+state.level*8));projectile(b.x,b.y,target,0,'cannon');b.timer=2.3}else{projectile(b.x,b.y,target,19+state.level*4);b.timer=.75}}}}
 if(spawn>0){spawnClock-=dt;while(spawnClock<=0&&spawn){spawn--;let boss=state.wave%3===0&&spawn===0,siege=state.wave>=4&&spawn%9===0&&!boss,armored=state.wave>=3&&spawn%5===0&&!siege,runner=state.wave>=2&&spawn%7===0&&!armored&&!siege,max=(22+state.wave*6)*(boss?7:siege?3:armored?2:runner?.7:1);let p=point(0);enemies.push({enemy:true,boss,siege,armored,runner,hp:max,max,pos:-Math.random()*30,lane:(Math.random()-.5)*40,cd:0,x:p.x,y:p.y});spawnClock+=.65/(1+state.wave*.04)}}
 for(let e of enemies){if(e.dead)continue;e.cd-=dt;e.flash=Math.max(0,(e.flash||0)-dt);let siegeTarget=e.siege&&buildings.find(b=>b.built&&Math.hypot(e.x-b.x,e.y-b.y)<100),target=!e.runner&&friends.find(f=>Math.abs(f.pos-e.pos)<24&&f.hp>0);
 if(siegeTarget){if(e.cd<=0){siegeTarget.hp-=15;burst(siegeTarget.x,siegeTarget.y,'#ad967a',10);e.cd=1.5;if(siegeTarget.hp<=0){siegeTarget.built=false;siegeTarget.charge=0;message(siegeTarget.name+' разрушена — можно восстановить');save()}}}else if(target){if(e.cd<=0){target.hp-=(e.boss?23:e.armored?13:9);e.cd=.8;burst(e.x,e.y,'#ffe6a4',2)}}else e.pos+=(e.boss?20:e.siege?22:e.armored?24:e.runner?52:30+state.wave)*dt;
 if(e.pos>=length){state.hp-=e.boss?15:e.siege?10:3;e.dead=true;burst(e.x,e.y,'#ff6b57',8)}let p=point(e.pos);e.x=p.x+e.lane;e.y=p.y}
 for(let f of friends){f.cd-=dt;let target=enemies.find(e=>!e.dead&&Math.abs(e.pos-f.pos)<29);let p=point(f.pos);f.x=p.x+(f.lane||0);f.y=p.y;if(target){if(f.cd<=0){hit(target,20*(1+.25*(state.level-1)));f.cd=.6;shots.push({x:f.x,y:f.y,kind:'slash',life:.18,duration:.18})}}else{let front=enemies.find(e=>!e.dead);if(front)f.pos=Math.max(length-430,f.pos-35*dt);else f.pos=Math.min(length-80,f.pos+20*dt)}}friends=friends.filter(f=>f.hp>0);enemies=enemies.filter(e=>!e.dead);
 for(let p of particles){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt}particles=particles.filter(p=>p.life>0);shots=shots.filter(s=>(s.life-=dt)>0);
 if(state.hp<=0){state.hp=0;finish(false)}else if(state.wave&&spawn===0&&enemies.length===0&&state.active){state.active=false;state.gold+=30+state.wave*5;friends.forEach(f=>f.hp=f.max);save();if(state.wave===10)finish(true);else message('Волна пройдена! +'+(30+state.wave*5)+' ●')}
 state.active=!!(spawn||enemies.length);hud()}
function hud(){$('gold').textContent=state.gold;$('hp').textContent=Math.max(0,Math.ceil(state.hp));$('health').style.width=state.hp+'%';$('waveLabel').textContent='Волна '+Math.max(1,state.wave)+' / 10';$('upgrade').disabled=state.gold<state.level*100;$('upgradeCost').textContent=state.level*100+' ● · уровень '+state.level;$('startWave').disabled=!!(spawn||enemies.length);$('startWave').textContent=spawn||enemies.length?'Идёт бой…':'Волна '+(state.wave+1)+' →';let nearby=buildings.find(b=>!b.built&&Math.hypot(hero.x-b.x,hero.y-b.y)<70);$('status').textContent=nearby?nearby.name+': '+(state.gold>=nearby.cost?'стой рядом, идёт строительство':'нужно ещё '+(nearby.cost-state.gold)+' ●'):spawn||enemies.length?'Врагов: '+(enemies.length+spawn)+' · Мечников: '+friends.length:'Коснись карты, чтобы вести героя';$('cooldown').textContent=cool>0?'Перезарядка '+Math.ceil(cool)+' с':'Готов · коснись врагов';$('fire').disabled=cool>0;$('repair').disabled=state.gold<60||state.hp>=100||!!(spawn||enemies.length)}
function finish(win){playing=false;save();$('overlay').classList.remove('hidden');$('overlay').querySelector('h1').innerHTML=win?'Королевство<br>спасено!':'Бастион<br>пал';$('overlay').querySelectorAll('p')[0].textContent='Волна '+state.wave+' · Побеждено врагов: '+state.kills;$('overlay').querySelectorAll('p')[1].textContent=win?'Все 10 волн выдержаны. Начни новый поход!':'Сражайся героем, строй казарму и прикрывай укрепления от осадных врагов.';$('play').textContent='Новый поход →';$('resume').classList.add('hidden')}
$('repair').onclick=()=>{if(state.gold>=60&&state.hp<100&&!spawn&&!enemies.length){state.gold-=60;state.hp=Math.min(100,state.hp+30);message('Стены восстановлены: +30 ♥');save();hud()}};
$('play').onclick=()=>{reset();playing=true;paused=false;$('overlay').classList.add('hidden');hud()};
let saved;try{saved=JSON.parse(localStorage.getItem('bastion-v3')||localStorage.getItem('bastion-v1'))}catch{}reset(false);if(saved&&saved.hp>0&&saved.wave<10){$('resume').classList.remove('hidden');$('resume').onclick=()=>{state={gold:saved.gold||0,hp:saved.hp,wave:saved.wave,level:saved.level||1,kills:saved.kills||0,active:false};if(saved.hero)hero={...hero,...saved.hero,cd:0};if(saved.buildings)buildings=plots.map(p=>({...p,...saved.buildings.find(b=>b.id===p.id),charge:0,timer:0}));friends=(saved.friends||[]).map(f=>({...f,lane:f.lane||0,cd:0}));playing=true;paused=false;$('overlay').classList.add('hidden');hud()}}
$('upgrade').onclick=()=>{if(state.gold<state.level*100)return;state.gold-=state.level*100;state.level++;message('Армия усилена!');save();hud()};$('startWave').onclick=nextWave;$('fire').onclick=()=>{if(cool<=0){armed=!armed;message(armed?'Выбери место удара':'Удар отменён')}};$('pause').onclick=()=>{paused=!paused;$('pause').textContent=paused?'▶':'Ⅱ';message(paused?'Пауза':'Бой продолжается')};$('sound').onclick=()=>{sound=!sound;$('sound').style.color=sound?'#efca68':'#fff';beep(700)};
function worldPointer(e){let y=(e.clientY-oy)/(.78*scale),x=(e.clientX-ox)/scale+y*.34;return{x:Math.max(-245,Math.min(235,x)),y:Math.max(-220,Math.min(395,y))}}
function moveHero(e){let p=worldPointer(e);hero.tx=p.x;hero.ty=p.y}
canvas.addEventListener('pointerdown',e=>{if(paused||!playing)return;if(armed){armed=false;cool=20;let p=worldPointer(e);burst(p.x,p.y,'#ff974e',60);enemies.forEach(v=>{if(Math.hypot(v.x-p.x,v.y-p.y)<95)hit(v,110+state.level*20)});beep(90);return}dragging=true;canvas.setPointerCapture?.(e.pointerId);moveHero(e)});
canvas.addEventListener('pointermove',e=>{if(dragging&&!paused&&playing)moveHero(e)});canvas.addEventListener('pointerup',()=>dragging=false);canvas.addEventListener('pointercancel',()=>dragging=false);
document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){paused=true;$('pause').textContent='▶';save()}});window.addEventListener('pagehide',save);
function frame(t){let dt=Math.min((t-last)/1000,.04);last=t;update(dt);render();requestAnimationFrame(frame)}requestAnimationFrame(frame);if('serviceWorker'in navigator)navigator.serviceWorker.register('sw.js').catch(()=>{});
