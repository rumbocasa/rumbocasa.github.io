/* Rumbo · Coral y Oreo. Dibujo SVG y motor de animación copiados tal cual de docs/diseno/mascotas-v6.html
   (aprobado). Cambios mínimos: sin la página de demostración, frases desde FRASES.ph, y el ciclo de mirada
   solo corre mientras haya un perrito visible. Expone window.Mascotas. */
(function () {
'use strict';
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
const REDUCED=matchMedia('(prefers-reduced-motion: reduce)');
const rnd=(a,b)=>a+Math.random()*(b-a), pick=a=>a[Math.floor(Math.random()*a.length)];
const E={out:'cubic-bezier(.16,1,.3,1)',io:'cubic-bezier(.65,0,.35,1)',spring:'cubic-bezier(.34,1.56,.64,1)',in:'cubic-bezier(.55,0,.9,.45)',sine:'cubic-bezier(.37,0,.63,1)'};
const NS='http://www.w3.org/2000/svg';
let UID=0;
const n1=v=>Math.round(v*10)/10;
function rng(seed){return()=>{seed=(seed*16807)%2147483647;return(seed-1)/2147483646}}

/* ---------- Geometría ---------- */
function ptsSq(rx,ry,n,N){const a=[];for(let i=0;i<N;i++){const t=i/N*Math.PI*2,c=Math.cos(t),s=Math.sin(t);a.push([rx*Math.sign(c)*Math.pow(Math.abs(c),2/n),ry*Math.sign(s)*Math.pow(Math.abs(s),2/n)])}return a}
function smoothP(p){const n=p.length,m=(a,b)=>[(a[0]+b[0])/2,(a[1]+b[1])/2];let s=m(p[n-1],p[0]),d='M'+n1(s[0])+','+n1(s[1]);for(let i=0;i<n;i++){const e=m(p[i],p[(i+1)%n]);d+='Q'+n1(p[i][0])+','+n1(p[i][1])+' '+n1(e[0])+','+n1(e[1])}return d+'Z'}
function fluffP(p,amp,seed){const r=rng(seed),n=p.length;let d='M'+n1(p[0][0])+','+n1(p[0][1]);for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n],mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,l=Math.hypot(mx,my)||1,k=amp*(.7+.7*r())*2;d+='Q'+n1(mx+mx/l*k)+','+n1(my+my/l*k)+' '+n1(b[0])+','+n1(b[1])}return d+'Z'}
const SIDE_PTS=[[-46,-6],[-44,-30],[-30,-50],[-6,-58],[18,-55],[36,-46],[46,-30],[54,-16],[62,-8],[66,4],[62,14],[56,22],[48,32],[36,46],[18,54],[0,56],[-22,52],[-38,38],[-46,18]];
const BODY='M66,166C58,196 58,226 72,238L168,238C182,226 182,196 174,166C160,148 80,148 66,166Z';
const BODY_SIDE='M74,160C62,190 62,226 74,238L160,238C172,230 176,200 168,172C158,148 100,142 74,160Z';

/* ---------- Personajes ---------- */
const INK='#2a1a16', MOUTH='#4a1c26', TONGUE='#F08A9A';
const DOGS={
 coral:{key:'coral',name:'Coral',fluffy:true,tempo:.88,energy:1,lid:0,
  base:'#F2B458',hi:'#FFDFA0',sh:'#D28A33',edge:'#A8681E',rim:'#FFF3CE',
  muz:'#A9A5A6',muzIn:'#FFF0D4',white:'#FFFCF4',earIn:'#F5AEA4',iris:'#A5642B',irisHi:'#D49A58',brow:'#C98228',nose:'#2A2024',blush:'#FF8F8F',heart:'#FF7C92',special:'dramatic',spec:'Dramática',pun:'Pícara',
  swatches:[['Dorado','#F2B458'],['Luz','#FFDFA0'],['Sombra','#D28A33'],['Hocico gris','#A9A5A6'],['Crema','#FFF0D4'],['Blanco pecho','#FFFCF4'],['Oreja','#F5AEA4'],['Ojo','#A5642B']]},
 orio:{key:'orio',name:'Oreo',fluffy:false,tempo:1.22,energy:.62,lid:.2,
  base:'#6C4536',hi:'#946750',sh:'#46281D',edge:'#2A160F',rim:'#E2B195',spot:'#191312',silver:'#D6D1CF',
  muz:'#94705D',muzIn:'#AE8873',white:'#8E6757',earIn:'#B98276',iris:'#74401F',irisHi:'#B27440',brow:'#A57B67',nose:'#171112',blush:'#C77B70',heart:'#E58AA0',special:'resigned',spec:'Resignado',pun:'Pícaro',
  swatches:[['Café','#6C4536'],['Luz','#946750'],['Sombra','#46281D'],['Mancha negra','#191312'],['Hocico','#94705D'],['Canas','#D6D1CF'],['Oreja','#B98276'],['Ojo','#74401F']]}
};
for(const k in DOGS){const d=DOGS[k];d.headP=d.fluffy?fluffP(ptsSq(72,58,2.6,26),4,7):smoothP(ptsSq(72,58,2.6,30));d.sideP=d.fluffy?fluffP(SIDE_PTS,3.4,11):smoothP(SIDE_PTS)}

const EXPR={
 happy:{e:'open',m:'smile',bL:[0,0],bR:[0,0],ear:6,bl:.45},
 laugh:{e:'arc',m:'laugh',bL:[-3,4],bR:[-3,4],ear:14,bl:.8},
 sly:{e:'open',lid:.4,tilt:3,m:'smirk',bL:[-6,8],bR:[3,-10],ear:[2,12],bl:.5,look:[3.5,-1]},
 wow:{e:'wide',m:'o',bL:[-8,3],bR:[-8,3],ear:-4,bl:.3},
 alert:{e:'wide',m:'flat',bL:[-5,-6],bR:[-5,-6],ear:-8,bl:.1},
 worried:{e:'sad',m:'frown',bL:[-2,18],bR:[-2,18],ear:24,ex:['sweat'],bl:.2},
 tender:{e:'tender',m:'smileS',bL:[-3,12],bR:[-3,12],ear:12,bl:1,ex:['heart']},
 proud:{e:'arc',m:'grin',bL:[-5,3],bR:[-5,3],ear:2,ex:['sparkle'],bl:.7},
 scold:{e:'open',lid:.34,tilt:7,m:'scold',bL:[3,-16],bR:[3,-16],ear:16,bl:.2},
 sleep:{e:'closed',m:'sleep',bL:[2,0],bR:[2,0],ear:28,bl:.4},
 resigned:{e:'open',lid:.58,tilt:0,m:'flat',bL:[3,-5],bR:[3,-5],ear:22,ex:['sigh'],look:[-3,-3],bl:.1},
 dramatic:{e:'cry',m:'wavy',bL:[-4,16],bR:[-4,16],ear:20,ex:['tears'],bl:.7},
 wink:{eL:'open',eR:'arc',m:'tongue',bL:[-2,0],bR:[-5,6],ear:[8,2],bl:.8},
 chill:{e:'open',lid:.5,tilt:0,m:'smile',bL:[2,0],bR:[2,0],ear:10,bl:.3,look:[-1.5,0]},
 bark:{e:'wide',m:'bark',bL:[-5,-4],bR:[-5,-4],ear:-6,bl:.1},
 yawn:{e:'closed',m:'yawn',bL:[-6,6],bR:[-6,6],ear:18,bl:.3}
};
const TILES={coral:['happy','laugh','sly','wow','alert','worried','tender','proud','scold','sleep','dramatic','wink'],orio:['happy','laugh','sly','wow','alert','worried','tender','proud','scold','sleep','resigned','chill']};
const LABELS={happy:'Feliz',laugh:'Carcajada',sly:'Pícar@',wow:'Sorprendid@',alert:'Alerta',worried:'Preocupad@',tender:'Ternura',proud:'Orgullos@',scold:'Regaño con cariño',sleep:'Durmiendo',resigned:'Resignado',dramatic:'Dramática',wink:'Guiño coqueto',chill:'Chill'};
const lab=(k,d)=>{let s=LABELS[k];if(k==='sly')return d.pun;if(k==='wow')return d.key==='coral'?'Sorprendida':'Sorprendido';if(k==='worried')return d.key==='coral'?'Preocupada':'Preocupado';if(k==='proud')return d.key==='coral'?'Orgullosa':'Orgulloso';return s};

/* ---------- Dibujo ---------- */
function mouthSVG(m){
 const s=`fill="none" stroke="${MOUTH}" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"`, ph='<path d="M0,29V34" '+s+'/>';
 const open=(w,b)=>`<path d="M-${w},31Q0,35 ${w},31Q${w+2},${b} 0,${b+1}Q-${w+2},${b} -${w},31Z" fill="${MOUTH}"/><path d="M-${w-6},${b-6}Q0,${b-14} ${w-6},${b-6}Q${w-8},${b+1} 0,${b+1}Q-${w-8},${b+1} -${w-6},${b-6}Z" fill="${TONGUE}"/><path d="M-${w},31Q0,35 ${w},31" fill="none" stroke="${MOUTH}" stroke-width="2.4" stroke-linecap="round"/>`;
 switch(m){
  case'smile':return ph+`<path d="M-17,31Q-9,43 0,34Q9,43 17,31" ${s}/>`;
  case'smileS':return ph+`<path d="M-11,35Q-5,41 0,34Q5,41 11,35" ${s}/>`;
  case'grin':return open(16,52);
  case'laugh':return open(20,58);
  case'bark':return open(17,58);
  case'yawn':return open(15,68);
  case'o':return ph+`<ellipse cx="0" cy="43" rx="5.4" ry="7" fill="${MOUTH}"/><ellipse cx="0" cy="46" rx="3" ry="2.6" fill="${TONGUE}"/>`;
  case'flat':return ph+`<path d="M-11,38Q0,40 11,38" ${s}/>`;
  case'frown':return ph+`<path d="M-14,43Q-7,35 0,36Q7,35 14,43" ${s}/>`;
  case'smirk':return ph+`<path d="M-14,37Q-4,42 5,37Q12,35 17,29" ${s}/>`;
  case'scold':return ph+`<path d="M-13,39Q-4,36 13,41" ${s}/><path d="M13,41l3,-2" ${s}/>`;
  case'sleep':return ph+`<path d="M-8,37Q0,42 8,37" ${s}/>`;
  case'wavy':return ph+`<path d="M-15,41Q-10,35 -5,41Q0,35 5,41Q10,35 15,41" ${s}/>`;
  case'tongue':return ph+`<path d="M-17,31Q-9,43 0,34Q9,43 17,31" ${s}/><path d="M3,38Q3,52 10,52Q17,52 17,38Z" fill="${TONGUE}" stroke="${MOUTH}" stroke-width="1.8" stroke-linejoin="round"/><path d="M10,41V47" stroke="#d96b80" stroke-width="1.6" stroke-linecap="round"/>`;
 }return ph;
}
function eyeSVG(d,u,s,kind,ex,view){
 const x=s*33; let tr=`translate(${x},4)`;
 if(view==='q3'){tr=s>0?`translate(${x-3},4) scale(.8,1)`:`translate(${x-1},4) scale(1.04,1.03)`}
 const stroke=`fill="none" stroke="${INK}" stroke-width="3.6" stroke-linecap="round"`;
 let inner='';
 if(kind==='arc')inner=`<path d="M-10.5,5Q0,-9 10.5,5" ${stroke}/>`;
 else if(kind==='closed')inner=`<path d="M-10.5,-1.5Q0,8 10.5,-1.5" ${stroke}/><path d="M-10.5,-1.5l-3,-2M10.5,-1.5l3,-2" ${stroke.replace('3.6','2')}/>`;
 else if(kind==='cry')inner=`<path d="M-10.5,2Q0,-8 10.5,2" ${stroke}/><path d="M-9,4l-3,2M9,4l3,2" ${stroke.replace('3.6','2')}/>`;
 else{
  const P={open:[10,12,4.6,3.6],wide:[11.5,13.8,3.4,4.6],tender:[11.4,13.4,5.6,4.2],sad:[10.4,12.8,5,3.8]}[kind]||[10,12,4.6,3.6];
  const [rx,ry,pr,hr]=P;
  inner=`<g class="pup"><ellipse rx="${rx}" ry="${ry}" fill="url(#ig${u})"/><ellipse cy="1" rx="${pr}" ry="${n1(pr*1.3)}" fill="#0d0707"/></g>`+
   `<g class="hl"><circle cx="${-rx*.36}" cy="${-ry*.38}" r="${hr}" fill="#fff"/><circle cx="${rx*.36}" cy="${ry*.34}" r="${n1(hr*.46)}" fill="#fff" opacity=".9"/>${kind==='tender'?'<circle cx="-6" cy="4" r="1.3" fill="#fff" opacity=".85"/><ellipse cy="8.4" rx="7" ry="2" fill="#fff" opacity=".28"/>':''}${kind==='sad'?'<ellipse cy="8.6" rx="7.4" ry="2.4" fill="#fff" opacity=".34"/>':''}</g>`;
  const lv=(kind==='open')?(ex.lid!==undefined?ex.lid:d.lid):0;
  if(lv>0){const t=ex.tilt||0,y0=n1(-13+lv*26),oX=s*14,iX=-s*14;
   inner+=`<path d="M${oX},-20L${iX},-20L${iX},${n1(y0+t)}Q0,${y0+3} ${oX},${n1(y0-t)}Z" fill="${d.base}"/><path d="M${iX},${n1(y0+t)}Q0,${y0+3} ${oX},${n1(y0-t)}" fill="none" stroke="${INK}" stroke-width="2.6" stroke-linecap="round"/>`;}
 }
 return `<g transform="${tr}">${inner}</g>`;
}
function dynSVG(d,u,ex,view){
 const en=d.key==='orio'?.75:1;
 const eL=ex.eL||ex.e,eR=ex.eR||ex.e;
 const bl=(ex.bl||0)*(d.key==='orio'?.7:1);
 const fx=view==='q3'?3:0;
 let o=`<g opacity="${n1(bl*.55)}"><ellipse cx="-49" cy="25" rx="9" ry="5.5" fill="${d.blush}"/><ellipse cx="49" cy="25" rx="9" ry="5.5" fill="${d.blush}"/></g>`;
 o+=`<g class="mouth">${mouthSVG(ex.m)}</g><g class="eyes">${eyeSVG(d,u,-1,eL,ex,view)}${eyeSVG(d,u,1,eR,ex,view)}</g>`;
 const br=(s,b)=>{const dy=n1(b[0]*en),rot=n1(b[1]*en);let x=s*33;if(view==='q3')x+=s>0?-3:-1;return `<path d="M-9,0Q0,-3.2 9,0" fill="none" stroke="${d.brow}" stroke-width="3.8" stroke-linecap="round" transform="translate(${x},${-15+dy}) rotate(${rot*s})"/>`};
 o+=br(-1,ex.bL)+br(1,ex.bR);
 for(const k of ex.ex||[]){
  if(k==='sweat')o+=`<g class="sw1"><path d="M62,-22q-8,11 0,16q8,-5 0,-16Z" fill="#a9dcff" stroke="#6bb4e6" stroke-width="1"/><circle cx="60" cy="-12" r="1.6" fill="#fff"/></g>`;
  if(k==='tears')o+=`<g class="sw1"><path d="M-41,15q-6,12 0,17q6,-5 0,-17Z" fill="#a9dcff" stroke="#6bb4e6" stroke-width="1"/></g><g class="sw1" style="animation-delay:-1.2s"><path d="M41,15q-6,12 0,17q6,-5 0,-17Z" fill="#a9dcff" stroke="#6bb4e6" stroke-width="1"/></g>`;
  if(k==='sparkle'){const st=(x,y,s)=>`<path class="tw" transform="translate(${x},${y}) scale(${s})" d="M0,-7Q1.5,-1.5 7,0Q1.5,1.5 0,7Q-1.5,1.5 -7,0Q-1.5,-1.5 0,-7Z" fill="#FFE58A"/>`;o+=st(-78,-34,1.2)+st(80,-24,1)+st(76,-66,.7)}
  if(k==='heart')o+=`<path transform="translate(76,-40) scale(1.1)" d="M0,-2C-4,-9 -14,-5 -9,2L0,10L9,2C14,-5 4,-9 0,-2Z" fill="${d.heart}"/>`;
  if(k==='sigh')o+=`<g class="sg"><circle cx="-60" cy="46" r="5" fill="#fff" opacity=".6"/><circle cx="-68" cy="40" r="3.4" fill="#fff" opacity=".6"/></g>`;
 }
 return o;
}
function defsSVG(d,u,bodyClip){
 return `<defs><radialGradient id="hg${u}" cx=".36" cy=".28" r=".85"><stop offset="0" stop-color="${d.hi}"/><stop offset=".5" stop-color="${d.base}"/><stop offset="1" stop-color="${d.sh}"/></radialGradient>
<radialGradient id="bg${u}" cx=".4" cy=".2" r=".95"><stop offset="0" stop-color="${d.hi}"/><stop offset=".55" stop-color="${d.base}"/><stop offset="1" stop-color="${d.sh}"/></radialGradient>
<radialGradient id="ig${u}" cx=".5" cy=".66" r=".62"><stop offset="0" stop-color="${d.irisHi}"/><stop offset=".55" stop-color="${d.iris}"/><stop offset="1" stop-color="#1c0f0b"/></radialGradient>
<linearGradient id="rg${u}" gradientUnits="userSpaceOnUse" x1="-72" y1="0" x2="72" y2="0"><stop offset=".62" stop-color="${d.rim}" stop-opacity="0"/><stop offset="1" stop-color="${d.rim}" stop-opacity=".95"/></linearGradient>
<clipPath id="hc${u}"><path d="${bodyClip==='side'?d.sideP:d.headP}"/></clipPath><clipPath id="bc${u}"><path d="${bodyClip==='side'?BODY_SIDE:BODY}"/></clipPath></defs>`;
}
function silver(seed,cx,cy,rx,ry,n,col,len){const r=rng(seed);let o='';for(let i=0;i<n;i++){const t=r()*6.283,k=.55+r()*.5,x=cx+Math.cos(t)*rx*k,y=cy+Math.sin(t)*ry*k,a=t+rnd(-.4,.4)+1.2;o+=`M${n1(x)},${n1(y)}l${n1(Math.cos(a)*len)},${n1(Math.sin(a)*len)}`}return `<path d="${o}" stroke="${col}" stroke-width="1.5" stroke-linecap="round" opacity=".85" fill="none"/>`}
function earSVG(d,u,side,view){
 const L='M-34,-44C-40,-70 -46,-92 -60,-98C-74,-96 -80,-70 -74,-46Q-54,-34 -34,-44Z',I='M-43,-50C-47,-68 -52,-82 -60,-88C-68,-85 -70,-68 -67,-52Q-54,-45 -43,-50Z';
 const blk=d.key==='orio'&&side<0;
 let tr=side<0?'':'scale(-1,1)';
 if(view==='q3')tr=side<0?'translate(2,2) scale(1.06)':'translate(-8,5) scale(-.84,.92)';
 const fill=blk?d.spot:`url(#hg${u})`, inn=blk?'#7c5650':d.earIn;
 return `<g class="${side<0?'earL':'earR'}"><g class="${side<0?'earLt':'earRt'}"><g transform="${tr}"><path d="${L}" fill="${fill}"/><path d="${I}" fill="${inn}" opacity=".92"/><path d="M-62,-86Q-70,-84 -68,-70" fill="none" stroke="#fff" stroke-opacity=".28" stroke-width="2" stroke-linecap="round"/><path d="${L}" fill="none" stroke="${d.edge}" stroke-opacity=".4" stroke-width="1.2"/></g></g></g>`;
}
function headContent(d,u,view){
 const q=view==='q3', fxo=q?'translate(13,2)':'', mz=q?'translate(7,0)':'';
 let o=earSVG(d,u,-1,view)+earSVG(d,u,1,view);
 o+=`<path d="${d.headP}" fill="url(#hg${u})"/><g clip-path="url(#hc${u})">`;
 if(d.key==='orio'){
  o+=`<ellipse cx="-4" cy="-30" rx="14" ry="9" fill="${d.hi}" opacity=".4"/><ellipse cx="42" cy="-30" rx="11" ry="8" fill="${d.hi}" opacity=".35"/>`+
   `<ellipse cx="-30" cy="-49" rx="28" ry="13" transform="rotate(-16 -30 -49)" fill="${d.spot}"/><ellipse cx="60" cy="31" rx="16" ry="23" fill="${d.spot}"/><circle cx="16" cy="-50" r="7.5" fill="${d.spot}"/><circle cx="-63" cy="24" r="6.5" fill="${d.spot}"/><circle cx="2" cy="-44" r="3.2" fill="${d.spot}"/>`;
 }
 o+=`<ellipse cx="-20" cy="-42" rx="32" ry="9" fill="#fff" opacity=".17"/><ellipse cx="0" cy="56" rx="72" ry="16" fill="${d.sh}" opacity=".3"/><path d="${d.headP}" fill="none" stroke="url(#rg${u})" stroke-width="7"/></g>`;
 if(d.fluffy){
  o+=`<path class="tuft" d="M-64,14Q-86,20 -82,38Q-77,32 -71,34Q-74,44 -62,50Z" fill="${d.base}"/><path class="tuft tuftR" d="M64,14Q86,20 82,38Q77,32 71,34Q74,44 62,50Z" fill="${d.base}"/>`+
   `<path class="tuft d2" d="M-60,38Q-80,46 -70,60Q-66,54 -60,54Z" fill="${d.hi}" opacity=".9"/><path class="tuft tuftR d3" d="M60,38Q80,46 70,60Q66,54 60,54Z" fill="${d.hi}" opacity=".9"/>`+
   `<path class="curl" d="M-6,-56Q-14,-72 -2,-70Q4,-66 -1,-58Z" fill="${d.base}"/><path class="curl" style="animation-delay:-1s" d="M4,-56Q14,-76 12,-66Q12,-60 8,-56Z" fill="${d.hi}"/>`;
 }else{
  o+=`<path d="M-14,-40Q0,-45 14,-40M-8,-33Q0,-37 8,-33" fill="none" stroke="${d.sh}" stroke-width="2" stroke-linecap="round" opacity=".55"/>`;
 }
 o+=`<g transform="${fxo}">`;
 o+=`<g transform="${mz}">`;
 if(d.fluffy)o+=`<g><ellipse cx="-16" cy="33" rx="24" ry="18" fill="${d.muz}"/><ellipse cx="16" cy="33" rx="24" ry="18" fill="${d.muz}"/><ellipse cx="0" cy="24" rx="16" ry="14" fill="${d.muz}"/><ellipse cx="0" cy="49" rx="14" ry="7" fill="${d.muz}"/><ellipse cx="-14" cy="35" rx="18" ry="12.5" fill="${d.muzIn}"/><ellipse cx="14" cy="35" rx="18" ry="12.5" fill="${d.muzIn}"/><ellipse cx="0" cy="26" rx="11" ry="10" fill="${d.muzIn}"/><ellipse cx="-12" cy="30" rx="8" ry="3" fill="#fff" opacity=".4"/></g>`;
 else o+=`<g class="dew"><ellipse cx="-22" cy="44" rx="13" ry="10" fill="${d.muz}"/><ellipse cx="22" cy="44" rx="13" ry="10" fill="${d.muz}"/><ellipse cx="0" cy="52" rx="19" ry="8" fill="${d.sh}" opacity=".55"/></g><g><ellipse cx="-16" cy="33" rx="24" ry="18" fill="${d.muz}"/><ellipse cx="16" cy="33" rx="24" ry="18" fill="${d.muz}"/><ellipse cx="0" cy="24" rx="16" ry="14" fill="${d.muz}"/><ellipse cx="-14" cy="35" rx="18" ry="12.5" fill="${d.muzIn}"/><ellipse cx="14" cy="35" rx="18" ry="12.5" fill="${d.muzIn}"/><ellipse cx="0" cy="26" rx="11" ry="10" fill="${d.muzIn}"/><path d="M-22,12Q0,3 22,12" fill="none" stroke="${d.sh}" stroke-width="2" stroke-linecap="round" opacity=".5"/>${silver(5,0,31,25,14,26,d.silver,5)}</g>`;
 o+=`<path d="M-11,16Q0,10 11,16Q12,24 0,29Q-12,24 -11,16Z" fill="${d.nose}"/><ellipse cx="-4" cy="15.5" rx="4.2" ry="1.7" fill="#fff" opacity=".55"/></g>`;
 o+=`<g class="dyn">${dynSVG(d,u,EXPR.happy,view)}</g>`;
 o+=`<g class="mail" style="opacity:0"><g transform="translate(0,50) rotate(-6)"><rect x="-19" y="-13" width="38" height="26" rx="4" fill="#FFF8EC" stroke="#d9c7a8" stroke-width="1.5"/><path d="M-19,-9L0,5L19,-9" fill="none" stroke="#d9c7a8" stroke-width="2" stroke-linejoin="round"/><path transform="translate(0,2) scale(.5)" d="M0,-2C-4,-9 -14,-5 -9,2L0,10L9,2C14,-5 4,-9 0,-2Z" fill="${d.heart}"/></g></g>`;
 o+='</g>';
 return o;
}
function bodyContent(d,u,view){
 const q=view==='q3'?'translate(6,0)':'';
 let o=`<g transform="${q}"><ellipse cx="70" cy="214" rx="22" ry="26" fill="${d.sh}"/><ellipse cx="170" cy="214" rx="22" ry="26" fill="${d.sh}"/>`;
 o+=`<g class="bodyI"><path d="${BODY}" fill="url(#bg${u})"/><g clip-path="url(#bc${u})">`;
 if(d.fluffy)o+=`<path transform="translate(120,206)" d="${fluffP(ptsSq(31,38,2.4,16),3.4,3)}" fill="${d.white}"/><path transform="translate(120,170)" d="${fluffP(ptsSq(15,14,2.4,12),3,9)}" fill="${d.white}"/>`;
 else o+=`<ellipse cx="120" cy="206" rx="30" ry="36" fill="${d.white}" opacity=".7"/><ellipse cx="68" cy="214" rx="22" ry="26" fill="${d.spot}"/><ellipse cx="170" cy="190" rx="15" ry="26" fill="${d.spot}"/><circle cx="100" cy="164" r="7" fill="${d.spot}"/><circle cx="138" cy="222" r="4.5" fill="${d.spot}"/><circle cx="82" cy="176" r="3" fill="${d.spot}"/>`;
 o+=`</g></g>`;
 const paw=(cls,flip)=>`<g class="${cls}"><g transform="${flip?'translate(240,0) scale(-1,1)':''}"><path d="M84,172Q84,168 94,168L106,168Q114,168 114,176L114,232Q114,242 102,242L94,242Q82,242 82,232Z" fill="url(#bg${u})"/><ellipse cx="98" cy="237" rx="19" ry="9" fill="url(#bg${u})"/>${d.key==='orio'&&!flip?`<path d="M84,176L114,176L114,214Q98,222 82,214Z" fill="${d.spot}"/>`:''}<path d="M92,234v6M104,234v6" stroke="${d.edge}" stroke-opacity=".45" stroke-width="1.6" stroke-linecap="round"/>${d.key==='orio'?silver(flip?21:23,98,236,16,6,9,d.silver,4):''}</g></g>`;
 o+=paw('pawL',false)+paw('pawR',true)+'</g>';
 return o;
}
function sideSVG(d,u){
 const orio=d.key==='orio';
 let o=defsSVG(d,u,'side')+`<ellipse cx="118" cy="243" rx="66" ry="8" fill="#000" opacity=".16"/>`;
 o+=`<ellipse cx="92" cy="212" rx="31" ry="30" fill="${d.sh}"/><ellipse cx="108" cy="238" rx="22" ry="8" fill="${d.sh}"/><path d="${BODY_SIDE}" fill="url(#bg${u})"/><g clip-path="url(#bc${u})">`;
 o+=d.fluffy?`<path transform="translate(158,214)" d="${fluffP(ptsSq(18,26,2.4,12),3.2,5)}" fill="${d.white}"/><path transform="translate(163,170)" d="${fluffP(ptsSq(11,13,2.4,10),3,2)}" fill="${d.white}"/>`:`<ellipse cx="94" cy="190" rx="26" ry="30" fill="${d.spot}"/><circle cx="130" cy="160" r="8" fill="${d.spot}"/><ellipse cx="160" cy="214" rx="12" ry="14" fill="${d.white}" opacity=".6"/><circle cx="76" cy="228" r="5" fill="${d.spot}"/>`;
 o+=`</g><ellipse cx="92" cy="206" rx="26" ry="26" fill="url(#bg${u})" opacity=".55"/>`;
 o+=`<path d="M142,186L164,186L166,230Q170,240 180,240L144,240Q138,240 140,230Z" fill="url(#bg${u})"/><ellipse cx="156" cy="237" rx="22" ry="8" fill="url(#bg${u})"/>${orio?silver(31,160,236,18,5,9,d.silver,4):''}`;
 o+=`<g transform="translate(120,100)">`;
 const ear=`<g class="earL"><g transform="translate(18,6) rotate(8)"><path d="M-34,-44C-40,-70 -36,-92 -22,-100C-8,-92 -2,-68 -6,-46Q-20,-38 -34,-44Z" fill="${orio?d.spot:`url(#hg${u})`}"/><path d="M-30,-48C-34,-68 -30,-84 -22,-90C-14,-84 -10,-68 -12,-50Q-20,-43 -30,-48Z" fill="${orio?'#7c5650':d.earIn}" opacity=".92"/></g></g>`;
 o+=ear+`<path d="${d.sideP}" fill="url(#hg${u})"/><g clip-path="url(#hc${u})">`;
 if(orio)o+=`<ellipse cx="-14" cy="-40" rx="26" ry="18" fill="${d.spot}"/><ellipse cx="-30" cy="20" rx="14" ry="22" fill="${d.spot}"/><circle cx="14" cy="-48" r="6" fill="${d.spot}"/>`;
 o+=`<ellipse cx="-4" cy="-40" rx="24" ry="8" fill="#fff" opacity=".16"/><ellipse cx="0" cy="56" rx="60" ry="14" fill="${d.sh}" opacity=".3"/><path d="${d.sideP}" fill="none" stroke="${d.rim}" stroke-opacity=".5" stroke-width="5" stroke-dasharray="0 90 120 400"/></g>`;
 o+=`<ellipse cx="42" cy="26" rx="26" ry="20" fill="${d.muz}"/><ellipse cx="44" cy="22" rx="20" ry="13" fill="${d.muzIn}"/><ellipse cx="30" cy="36" rx="20" ry="11" fill="${d.muz}"/><ellipse cx="32" cy="34" rx="14" ry="6.5" fill="${d.muzIn}" opacity=".9"/>${orio?silver(8,40,28,22,14,20,d.silver,5):''}`;
 o+=`<path d="M57,16Q46,29 26,25" fill="none" stroke="${MOUTH}" stroke-width="2.6" stroke-linecap="round"/><path d="M28,26Q22,32 26,36" fill="none" stroke="${MOUTH}" stroke-width="2" stroke-linecap="round" opacity=".7"/>`;
 o+=`<ellipse cx="62" cy="1" rx="7.2" ry="8.4" transform="rotate(8 62 1)" fill="${d.nose}"/><ellipse cx="60" cy="-2.5" rx="3" ry="1.8" fill="#fff" opacity=".55"/>`;
 o+=`<path d="M38,-26Q46,-34 54,-26" fill="none" stroke="${d.sh}" stroke-width="2" stroke-linecap="round" opacity=".5"/><g transform="translate(26,-8)"><ellipse rx="10" ry="12" fill="url(#ig${u})"/><ellipse cy="1" rx="4.6" ry="6" fill="#0d0707"/><circle cx="-3.4" cy="-4.4" r="3.6" fill="#fff"/><circle cx="3.4" cy="4" r="1.7" fill="#fff" opacity=".9"/>${orio?`<path d="M-14,-20L14,-20L14,-5Q0,-1 -14,-6Z" fill="${d.base}"/><path d="M-14,-6Q0,-1 14,-5" fill="none" stroke="${INK}" stroke-width="2.4" stroke-linecap="round"/>`:''}</g>`;
 o+=`<path d="M18,-26Q27,-31 36,-27" fill="none" stroke="${d.brow}" stroke-width="3.8" stroke-linecap="round" transform="rotate(-3 27 -28)"/><ellipse cx="-2" cy="10" rx="14" ry="9" fill="${d.blush}" opacity="${orio?.12:.22}"/>`;
 if(d.fluffy)o+=`<path class="tuft" d="M-40,26Q-62,34 -50,50Q-46,44 -40,46Z" fill="${d.hi}"/>`;
 o+='</g>';
 return `<svg class="dog" viewBox="0 0 240 260" role="img" aria-label="${d.name}, perfil">${o}</svg>`;
}
function guidesSVG(){
 return `<g class="guides"><line x1="10" y1="42" x2="230" y2="42"/><line x1="10" y1="104" x2="230" y2="104"/><line x1="10" y1="158" x2="230" y2="158"/><line x1="10" y1="240" x2="230" y2="240"/><ellipse cx="120" cy="100" rx="72" ry="58"/><path d="M46,56L60,2L86,42M194,56L180,2L154,42"/><rect x="66" y="150" width="108" height="90" rx="30"/><text x="12" y="38">tope de cabeza</text><text x="12" y="100">línea de ojos 38 %</text><text x="12" y="154">mentón</text><text x="12" y="236">1,7 cabezas</text></g>`;
}
function buildSVG(d,u,view,o){
 if(view==='side')return sideSVG(d,u);
 const vb={head:'36 22 168 150',peek:'24 24 192 142',front:'0 0 240 260',q3:'0 0 240 260'}[view]||'0 0 240 260';
 const full=(view==='front'||view==='q3');
 const lbl=`${d.name}, ${view==='q3'?'tres cuartos':'vista frontal'}`;
 return `<svg class="dog" viewBox="${vb}" role="img" aria-label="${lbl}">${defsSVG(d,u)}${full?`<ellipse class="shadow" cx="120" cy="243" rx="62" ry="8" fill="#000" opacity=".18"/>`:''}<g class="root">${full||view==='peek'?bodyContent(d,u,view):''}<g class="hT"><g class="hI"><g class="head"><g transform="translate(120,100)">${headContent(d,u,view)}</g></g></g></g></g><g class="fx"></g>${o&&o.guides?guidesSVG():''}</svg>`;
}

/* ---------- Mini (campana) ---------- */
function miniSVG(key,exk,size){
 const d=DOGS[key],u=++UID,orio=key==='orio',s=size||40;
 const hp=d.fluffy?fluffP(ptsSq(24,20,2.6,18),1.7,4):smoothP(ptsSq(24,20,2.6,22));
 const ear=(side)=>{const p='M12,24C8,10 10,3 16,3C22,5 26,13 26,22Z';const f=(orio&&side<0)?d.spot:d.base;return `<g transform="${side<0?'':'translate(64,0) scale(-1,1)'}"><path d="${p}" fill="${f}"/><path d="M14,21C12,12 13,8 16,7C19,9 21,13 21,19Z" fill="${(orio&&side<0)?'#7c5650':d.earIn}"/></g>`};
 const kinds={happy:'open',alert:'wide',worried:'open',tender:'open',sleep:'closed',wow:'wide'};
 const ek=kinds[exk]||'open', r=ek==='wide'?5.2:4.3;
 const eye=x=>ek==='closed'?`<path d="M${x-4},31Q${x},35.5 ${x+4},31" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`:`<circle cx="${x}" cy="31" r="${r}" fill="#1c0f0b"/><circle cx="${x-1.5}" cy="29.2" r="1.7" fill="#fff"/><circle cx="${x+1.6}" cy="33" r=".8" fill="#fff" opacity=".9"/>`;
 const mst=`fill="none" stroke="${MOUTH}" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"`;
 const mouth={happy:`<path d="M26.5,46.5Q29,50.5 32,47Q35,50.5 37.5,46.5" ${mst}/>`,alert:`<path d="M28,48H36" ${mst}/>`,worried:`<path d="M27,50Q29.5,46 32,47.5Q34.5,46 37,50" ${mst}/>`,tender:`<path d="M27.5,47Q29.5,50 32,47Q34.5,50 36.5,47" ${mst}/>`,sleep:`<path d="M28.5,47.5Q32,50 35.5,47.5" ${mst}/>`,wow:`<ellipse cx="32" cy="48" rx="2.4" ry="3" fill="${MOUTH}"/>`}[exk]||'';
 let ex='';
 if(exk==='worried')ex=`<path d="M52,16q-3.4,5 0,7.4q3.4,-2.4 0,-7.4Z" fill="#a9dcff" stroke="#6bb4e6" stroke-width=".6"/><path d="M13,25l9,-2.4M51,25l-9,-2.4" stroke="${d.brow}" stroke-width="2" stroke-linecap="round" transform="translate(0,-3)"/>`;
 if(exk==='tender')ex=`<path transform="translate(53,15) scale(.5)" d="M0,-2C-4,-9 -14,-5 -9,2L0,10L9,2C14,-5 4,-9 0,-2Z" fill="${d.heart}"/><ellipse cx="17" cy="40" rx="4" ry="2.6" fill="${d.blush}" opacity=".5"/><ellipse cx="47" cy="40" rx="4" ry="2.6" fill="${d.blush}" opacity=".5"/>`;
 if(exk==='sleep')ex=`<text x="48" y="14" font-size="9" font-weight="800" fill="#8aa0ff" font-family="monospace">z</text><text x="54" y="8" font-size="6.5" font-weight="800" fill="#8aa0ff" font-family="monospace">z</text>`;
 if(exk==='alert')ex=`<path d="M14,24l8,-3M50,24l-8,-3" stroke="${d.brow}" stroke-width="2" stroke-linecap="round"/>`;
 const mark=orio?`<g clip-path="url(#mc${u})"><ellipse cx="22" cy="21" rx="11" ry="5.5" transform="rotate(-14 22 21)" fill="${d.spot}"/><circle cx="52" cy="42" r="5.5" fill="${d.spot}"/></g>`:`<g clip-path="url(#mc${u})"><ellipse cx="32" cy="58" rx="8" ry="6" fill="${d.white}"/></g>`;
 return `<svg viewBox="0 0 64 64" width="${s}" height="${s}" role="img" aria-label="${d.name}, ${exk}"><defs><clipPath id="mc${u}"><g transform="translate(32,36)"><path d="${hp}"/></g></clipPath><radialGradient id="mg${u}" cx=".36" cy=".28" r=".85"><stop offset="0" stop-color="${d.hi}"/><stop offset=".5" stop-color="${d.base}"/><stop offset="1" stop-color="${d.sh}"/></radialGradient></defs>${ear(-1)}${ear(1)}<g transform="translate(32,36)"><path d="${hp}" fill="url(#mg${u})"/></g>${mark}<ellipse cx="32" cy="45" rx="13.5" ry="9" fill="${d.muz}"/><ellipse cx="32" cy="44.5" rx="10.5" ry="6.4" fill="${d.muzIn}"/>${orio?silver(3,32,45,12,8,9,d.silver,2.6):''}<ellipse cx="32" cy="40.5" rx="4.6" ry="3" fill="${d.nose}"/><ellipse cx="30.6" cy="39.6" rx="1.7" ry=".8" fill="#fff" opacity=".55"/>${eye(21)}${eye(43)}${mouth}${ex}</svg>`;
}

/* ---------- Clase Dog ---------- */
const ALL=[]; let RECT_DIRTY=0; const PTR={x:innerWidth/2,y:innerHeight/2,t:0};
const noop=()=>{};
const kf=a=>a.map(([o,t,e])=>({offset:o,transform:t,easing:e||'linear'}));
const wob=(a,steps=5)=>{const f=[{transform:'rotate(0deg)',offset:0}];let amp=a;for(let i=1;i<=steps;i++){f.push({transform:`rotate(${i%2?amp:-amp}deg)`,offset:i/(steps+1),easing:E.sine});amp*=.55}f.push({transform:'rotate(0deg)',offset:1});return f};
const io=new IntersectionObserver(es=>{for(const e of es){const g=e.target._dog;if(!g)continue;g.visible=e.isIntersecting;g.idle.forEach(a=>e.isIntersecting?a.play():a.pause());}},{rootMargin:'80px'});

class Dog{
 constructor(host,key,o){
  this.d=DOGS[key];this.key=key;this.host=host;this.o=o||{};this.u=++UID;this.view=this.o.view||'front';
  this.tok=0;this.anims=new Set();this.idle=[];this.last=null;this.sleeping=false;this.visible=true;
  this.gx=0;this.gy=0;this.look=null;this.gaze=null;this.wx=0;this.wy=0;this.wt=0;this.rt=0;this.sched=null;this.lastPhrase={};this.cat=0;
  host.innerHTML=buildSVG(this.d,this.u,this.view,this.o);
  this.svg=host.querySelector('svg');
  const vb=this.svg.getAttribute('viewBox').split(' ').map(Number);this.vb=vb;
  host._dog=this;
  if(this.view==='side'){this.static=true;return}
  const q=s=>this.svg.querySelector(s);
  this.root=q('.root');this.hT=q('.hT');this.hI=q('.hI');this.head=q('.head');this.bodyI=q('.bodyI');this.pawL=q('.pawL');this.pawR=q('.pawR');
  this.earL=q('.earL');this.earR=q('.earR');this.earLt=q('.earLt');this.earRt=q('.earRt');this.shadow=q('.shadow');this.fxg=q('.fx');this.dyn=q('.dyn');this.mail=q('.mail');
  this.tufts=$$('.tuft,.curl',this.svg);this.bub=this.o.bubble||(host.parentElement&&host.parentElement.querySelector('.bubble'));
  this.setExpr(this.o.expr||'happy',true);
  this.o.live&&this.startIdle();
  if(this.o.live||this.o.track){ALL.push(this);io.observe(host)}
  if(this.o.click!==false&&this.o.live){
   host.setAttribute('role','button');host.setAttribute('tabindex','0');host.setAttribute('aria-label','Tocar a '+this.d.name);
   host.addEventListener('click',()=>this.run(this.sleeping?'wake':'pat'));
   host.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();this.run(this.sleeping?'wake':'pat')}});
  }
 }
 setExpr(k,init){
  const ex=EXPR[k];if(!ex||this.static)return;this.ex=ex;this.exName=k;
  this.dyn.innerHTML=dynSVG(this.d,this.u,ex,this.view);
  this.eyes=this.dyn.querySelector('.eyes');this.pups=$$('.pup',this.dyn);this.hls=$$('.hl',this.dyn);this.look=ex.look||null;this.pgx=null;
  this.canBlink=!/arc|closed|cry/.test(JSON.stringify([ex.e,ex.eL,ex.eR]));
  const e=Array.isArray(ex.ear)?ex.ear:[ex.ear,ex.ear],base=this.d.key==='orio'?-2:0;
  this.earL.style.rotate=(-(e[0]+base))+'deg';this.earR.style.rotate=(e[1]+base)+'deg';
  if(!init&&!REDUCED.matches)this.head.animate([{transform:'scale(1.035,.975)'},{transform:'scale(1,1)'}],{duration:320,easing:E.spring});
 }
 /* --- idle --- */
 startIdle(){
  if(REDUCED.matches)return;
  const t=this.d.tempo;
  this.idle.push(this.bodyI.animate([{transform:'scale(1,1)'},{transform:'scale(1.014,1.024)'}],{duration:3200*t,direction:'alternate',iterations:Infinity,easing:E.sine}));
  this.idle.push(this.hI.animate([{transform:'translateY(0) rotate(0deg)'},{transform:'translateY(-1.8px) rotate(.7deg)'}],{duration:3200*t,delay:260,direction:'alternate',iterations:Infinity,easing:E.sine}));
  const loop=()=>{this.sched=setTimeout(()=>{if(this.visible&&!document.hidden&&!REDUCED.matches)this.micro();loop()},rnd(1500,4200))};loop();
 }
 idleRate(r){this.idle.forEach(a=>a.playbackRate=r)}
 micro(){
  const r=Math.random();
  if(this.sleeping)return;
  if(r<.5){if(this.canBlink){const dbl=Math.random()<.2,slow=this.key==='orio'&&Math.random()<.4;this.eyes.animate([{transform:'scaleY(1)'},{transform:'scaleY(.08)',offset:.45},{transform:'scaleY(1)'}],{duration:slow?340:170,easing:E.sine});if(dbl)setTimeout(()=>this.eyes&&this.eyes.animate([{transform:'scaleY(1)'},{transform:'scaleY(.08)',offset:.45},{transform:'scaleY(1)'}],{duration:150}),230)}}
  else if(r<.78){const ear=Math.random()<.5?this.earLt:this.earRt,s=ear===this.earLt?-1:1;ear.animate([{transform:'rotate(0deg)'},{transform:`rotate(${s*rnd(10,18)}deg)`,offset:.35,easing:E.out},{transform:`rotate(${-s*3}deg)`,offset:.7},{transform:'rotate(0deg)'}],{duration:rnd(330,520),easing:E.sine})}
  else if(r<.9){this.tufts.forEach((t,i)=>t.animate([{transform:'scale(1)'},{transform:'scale(1.22)',offset:.35},{transform:'scale(1)'}],{duration:620,delay:i*40,easing:E.spring}));if(!this.tufts.length)this.bodyI.animate([{transform:'scale(1)'},{transform:'scale(1.04,1.05)',offset:.4},{transform:'scale(1)'}],{duration:1400,easing:E.sine})}
  else{this.wt=0}
 }
 /* --- seguimiento de mirada --- */
 track(now){
  if(REDUCED.matches||!this.pups)return;
  if(!this.rect||this.rv!==RECT_DIRTY||now-this.rt>600){this.rect=this.svg.getBoundingClientRect();this.rt=now;this.rv=RECT_DIRTY}
  const r=this.rect,vb=this.vb;let tx,ty;
  if(this.gaze){tx=this.gaze[0];ty=this.gaze[1]}
  else if(now-PTR.t<5000){const cx=r.left+r.width*(120-vb[0])/vb[2],cy=r.top+r.height*(100-vb[1])/vb[3],dx=PTR.x-cx,dy=PTR.y-cy,dist=Math.hypot(dx,dy)||1,k=Math.min(1,dist/(r.width*.7));tx=dx/dist*k;ty=dy/dist*k}
  else{if(now>this.wt){this.wx=rnd(-.9,.9);this.wy=rnd(-.5,.6);this.wt=now+rnd(1800,4200)}tx=this.wx;ty=this.wy}
  this.gx+=(tx-this.gx)*.13;this.gy+=(ty-this.gy)*.13;
  if(this.pgx!==null&&Math.abs(this.gx-this.pgx)<.003&&Math.abs(this.gy-this.pgy)<.003)return;
  this.pgx=this.gx;this.pgy=this.gy;
  const lk=this.look,ox=lk?lk[0]:0,oy=lk?lk[1]:0,m=lk?.35:1,gx=this.gx,gy=this.gy;
  const ps=`translate(${n1(ox+gx*3.4*m)}px,${n1(oy+gy*3.8*m)}px)`,hs=`translate(${n1(ox*.5+gx*1.8*m)}px,${n1(oy*.5+gy*2.2*m)}px)`;
  this.pups.forEach(p=>p.style.transform=ps);this.hls.forEach(p=>p.style.transform=hs);
  if(!this.o.noHead)this.hT.style.transform=`translate(${n1(gx*2.4)}px,${n1(gy*1.4)}px) rotate(${n1(gx*4)}deg)`;
 }
 /* --- ejecución --- */
 p(el,frames,dur,opt){
  if(REDUCED.matches||!el)return Promise.resolve();
  const tok=this.tok,a=el.animate(frames,Object.assign({duration:dur*this.d.tempo,fill:'none',easing:'linear'},opt||{}));
  this.anims.add(a);
  return a.finished.then(()=>{this.anims.delete(a);if(tok!==this.tok)throw'x'},()=>{throw'x'});
 }
 f(el,frames,dur,opt){this.p(el,frames,dur,opt).catch(noop)}
 wait(ms){const tok=this.tok;return new Promise((res,rej)=>setTimeout(()=>tok===this.tok?res():rej('x'),REDUCED.matches?Math.min(ms,260):ms*this.d.tempo))}
 cancelAnims(){this.anims.forEach(a=>{try{a.cancel()}catch(e){}});this.anims.clear()}
 run(name){
  if(this.static||!this['a_'+name])return;
  this.last=name;const tok=++this.tok;this.cancelAnims();this.sleeping=false;this.gaze=null;this.idleRate(1);this.mail.style.opacity=0;if(this.bub)this.bub.classList.remove('show');
  (async()=>{
   try{await this['a_'+name]()}catch(e){if(e!=='x')console.error(e);return}
   if(tok!==this.tok)return;
   this.cancelAnims();this.mail.style.opacity=0;this.setExpr('happy');
   if(this.o.onDone)this.o.onDone(this,name);
   if(this.o.loopFn&&this.o.loopFn()&&name!=='pat'&&name!=='wake')setTimeout(()=>{if(tok===this.tok)this.run(name)},500);
  })();
 }
 stop(){this.tok++;this.cancelAnims();this.sleeping=false;this.gaze=null;this.idleRate(1);this.setExpr('happy');if(this.mail)this.mail.style.opacity=0;if(this.bub)this.bub.classList.remove('show')}
 /* --- efectos --- */
 spawn(markup,frames,dur,opt){
  const g=document.createElementNS(NS,'g');g.innerHTML=markup;this.fxg.appendChild(g);
  if(REDUCED.matches){g.style.opacity=.9;setTimeout(()=>g.remove(),900);return}
  const a=g.animate(frames,Object.assign({duration:dur,easing:'linear',fill:'both'},opt||{}));a.onfinish=()=>g.remove();a.oncancel=()=>g.remove();
 }
 hearts(n,x,y){
  const sl=this.key==='orio'?1.3:1;
  for(let i=0;i<n;i++){const dx=rnd(-34,34),s=rnd(.7,1.15),c=this.d.heart;
   this.spawn(`<path d="M0,-2C-4,-9 -14,-5 -9,2L0,10L9,2C14,-5 4,-9 0,-2Z" fill="${c}"/><path d="M-6,-3q2,-3 4,-2" stroke="#fff" stroke-opacity=".6" fill="none" stroke-linecap="round"/>`,
    [{transform:`translate(${x}px,${y}px) scale(.2)`,opacity:0,easing:E.spring},{transform:`translate(${x+dx*.5}px,${y-34}px) scale(${s})`,opacity:1,offset:.25,easing:E.out},{transform:`translate(${x+dx}px,${y-92}px) scale(${s*.8}) rotate(${rnd(-15,15)}deg)`,opacity:0}],rnd(1200,1700)*sl,{delay:i*(110*sl)});}
 }
 confetti(x,y,n){
  const cols=['#FFC857','#FF7C92','#7CC6FE','#8EE3B0','#C3A6FF','#FFF4E0'];
  for(let i=0;i<n;i++){const a=rnd(-2.9,-.25),sp=rnd(60,150),vx=Math.cos(a)*sp,vy=Math.sin(a)*sp,c=pick(cols),w=rnd(4,8),sh=Math.random()<.5?`<rect x="${-w/2}" y="${-w/3}" width="${w}" height="${w*.66}" rx="1" fill="${c}"/>`:`<circle r="${w/2.4}" fill="${c}"/>`;
   this.spawn(sh,[{transform:`translate(${x}px,${y}px) rotate(0deg)`,opacity:1,easing:E.out},{transform:`translate(${x+vx*.75}px,${y+vy}px) rotate(${rnd(90,300)}deg)`,opacity:1,offset:.38,easing:E.in},{transform:`translate(${x+vx}px,${y+vy+170}px) rotate(${rnd(300,700)}deg)`,opacity:0}],rnd(1500,2200),{delay:rnd(0,160)});}
 }
 zzz(){
  [0,1,2].forEach(i=>this.spawn(`<text font-family="JetBrains Mono,monospace" font-weight="800" font-size="${16+i*3}" fill="#8aa0ff" stroke="#fff" stroke-opacity=".5" stroke-width=".6">Z</text>`,
   [{transform:`translate(${158+i*8}px,${74-i*8}px) scale(.5)`,opacity:0},{transform:`translate(${168+i*8}px,${56-i*14}px) scale(1) rotate(8deg)`,opacity:1,offset:.3,easing:E.out},{transform:`translate(${176+i*10}px,${24-i*18}px) scale(1.15) rotate(-6deg)`,opacity:0}],2000,{delay:i*520}));
 }
 waves(){
  [0,1,2].forEach(i=>{const mk=(s,x)=>this.spawn(`<path d="M0,-13Q${11*s},0 0,13" fill="none" stroke="${this.d.key==='orio'?'#C9A58F':'#F5BE60'}" stroke-width="3" stroke-linecap="round"/>`,[{transform:`translate(${x}px,128px) scale(.3)`,opacity:0},{transform:`translate(${x+s*8}px,128px) scale(1)`,opacity:1,offset:.3,easing:E.out},{transform:`translate(${x+s*30}px,128px) scale(1.5)`,opacity:0}],620,{delay:i*110});mk(1,184);mk(-1,56)});
 }
 puff(x,y,n,col){for(let i=0;i<n;i++){const s=i%2?1:-1,r=rnd(4,8);this.spawn(`<circle r="${r}" fill="${col||'#fff'}" opacity=".7"/>`,[{transform:`translate(${x}px,${y}px) scale(.3)`,opacity:0},{transform:`translate(${x+s*14}px,${y-6}px) scale(1)`,opacity:.8,offset:.3,easing:E.out},{transform:`translate(${x+s*30}px,${y-12}px) scale(1.5)`,opacity:0}],700,{delay:i*40})}}
 flecks(n){for(let i=0;i<n;i++){const a=rnd(0,6.28),r=rnd(60,100);this.spawn(`<ellipse rx="2.6" ry="1.2" fill="${this.d.base}" transform="rotate(${rnd(0,180)})"/>`,[{transform:`translate(${120+Math.cos(a)*50}px,${100+Math.sin(a)*40}px)`,opacity:1,easing:E.out},{transform:`translate(${120+Math.cos(a)*r}px,${100+Math.sin(a)*r*.7}px)`,opacity:1,offset:.5,easing:E.sine},{transform:`translate(${120+Math.cos(a)*(r+12)}px,${100+Math.sin(a)*r*.7+30}px)`,opacity:0}],rnd(700,1000))}}
 say(text,ms){
  if(!this.bub)return;const b=this.bub;b.innerHTML=`<b style="color:${this.key==='coral'?(document.documentElement.dataset.theme==='light'?'#B8661F':'#C9822A'):'#8a6352'}">${this.d.name}</b>${text}`;
  b.classList.remove('show');void b.offsetWidth;b.classList.add('show');clearTimeout(b._t);b._t=setTimeout(()=>b.classList.remove('show'),ms||4200);
 }
 phrase(){
  const cats=['animo','chiste','consejo'];const c=cats[this.cat++%3],list=PH[this.key][c];
  let i;do{i=Math.floor(Math.random()*list.length)}while(i===this.lastPhrase[c]&&list.length>1);this.lastPhrase[c]=i;return list[i];
 }
}

/* ---------- Acciones ---------- */
Object.assign(Dog.prototype,{
 async a_pat(){
  this.setExpr(pick(['tender','happy']));
  this.f(this.root,kf([[0,'scale(1,1)',E.out],[.2,'scale(1.06,.93)',E.out],[.55,'scale(.98,1.03)',E.sine],[1,'scale(1,1)']]),620);
  this.f(this.head,kf([[0,'rotate(0deg)',E.out],[.3,`rotate(${pick([-6,6])}deg) translateY(2px)`,E.sine],[1,'rotate(0deg)']]),700,{delay:50});
  this.f(this.earL,wob(-18),800,{delay:60});this.f(this.earR,wob(18),800,{delay:90});
  this.hearts(this.key==='coral'?4:3,120,70);
  this.say(this.phrase());
  await this.wait(1500);
 },
 async a_wake(){
  this.setExpr('wow');this.f(this.root,kf([[0,'translateY(0) scale(1)',E.out],[.3,'translateY(-22px) scale(.94,1.08)',E.in],[.55,'translateY(0) scale(1.1,.9)',E.out],[1,'scale(1)']]),700);
  this.f(this.earL,wob(-30),900);this.f(this.earR,wob(30),900,{delay:40});
  this.say(this.key==='coral'?'¡Despierta, despierta! ¿Quién dijo que estaba dormida? Jiji.':'Estaba descansando la vista. Con los dos ojos.',3800);
  await this.wait(700);this.setExpr('scold');await this.wait(1100);
 },
 async a_blink(){
  this.setExpr('happy');
  for(let i=0;i<2;i++){await this.p(this.eyes,[{transform:'scaleY(1)'},{transform:'scaleY(.06)',offset:.4},{transform:'scaleY(1)'}],i?160:300,{easing:E.sine});await this.wait(160)}
  this.setExpr('sly');await this.wait(600);
 },
 async a_breathe(){
  this.setExpr('chill');
  this.f(this.root,kf([[0,'scale(1,1)',E.sine],[.45,'scale(1.04,1.07)',E.sine],[.62,'scale(1.04,1.07)',E.sine],[1,'scale(1,1)']]),2600);
  this.f(this.head,kf([[0,'translateY(0)',E.sine],[.45,'translateY(-4px) rotate(-2deg)',E.sine],[.62,'translateY(-4px) rotate(-2deg)',E.sine],[1,'translateY(0)']]),2600,{delay:90});
  this.f(this.earL,wob(-8,3),2600,{delay:700});this.tufts.forEach((t,i)=>this.f(t,[{transform:'scale(1)'},{transform:'scale(1.12)',offset:.45},{transform:'scale(1)'}],2600,{delay:i*60,easing:E.sine}));
  await this.wait(2700);
 },
 async a_shake(){
  const a=this.d.key==='orio'?10:15,fr=[[0,'rotate(0deg)',E.out]];let amp=a;
  for(let i=1;i<=9;i++){fr.push([i/10,`rotate(${i%2?amp:-amp}deg)`,E.sine]);amp*=.78}fr.push([1,'rotate(0deg)']);
  this.setExpr('laugh');
  this.f(this.head,kf(fr),950);
  this.f(this.root,kf(fr.map(([o,t,e],i)=>[o,t.replace(/-?[\d.]+deg/,m=>(parseFloat(m)*.3)+'deg')+(i&&i<fr.length-1?' scale(1.02,.98)':''),e])),950,{delay:70});
  this.f(this.earL,wob(-44,7),1100);this.f(this.earR,wob(44,7),1100,{delay:40});
  this.tufts.forEach((t,i)=>this.f(t,[{transform:'scale(1)'},{transform:'scale(1.4)',offset:.3,easing:E.out},{transform:'scale(1)'}],700,{delay:i*30,easing:E.spring}));
  if(this.d.fluffy)this.flecks(9);else this.f(this.bodyI,wob(0,1),10);
  await this.wait(1000);
 },
 async a_jump(){
  const en=this.d.energy,h=-(54*en+10),dur=1500;
  this.setExpr('happy');
  this.f(this.shadow,[{transform:'scale(1)',opacity:.18},{transform:'scale(1.05,1)',opacity:.2,offset:.17},{transform:'scale(.6)',opacity:.07,offset:.46},{transform:'scale(1.12,1)',opacity:.22,offset:.64},{transform:'scale(1)',opacity:.18}],dur);
  const m=this.p(this.root,kf([[0,'translateY(0) scale(1,1)',E.io],[.17,'translateY(5px) scale(1.1,.86)',E.out],[.44,`translateY(${h}px) scale(.92,1.12)`,E.io],[.64,'translateY(0) scale(1.14,.82)',E.out],[.78,`translateY(${-14*en}px) scale(.97,1.04)`,E.in],[.88,'translateY(0) scale(1.05,.95)',E.out],[1,'translateY(0) scale(1,1)']]),dur);
  this.f(this.head,kf([[0,'translateY(0)',E.sine],[.17,'translateY(4px)',E.sine],[.3,'translateY(8px)',E.sine],[.5,'translateY(-6px) rotate(-3deg)',E.sine],[.66,'translateY(9px)',E.sine],[.8,'translateY(-4px)',E.sine],[.92,'translateY(2px)',E.sine],[1,'translateY(0)']]),dur);
  this.f(this.earL,wob(-26,6),dur,{delay:120});this.f(this.earR,wob(26,6),dur,{delay:150});
  this.f(this.pawL,kf([[0,'rotate(0)'],[.44,'rotate(24deg)',E.sine],[.64,'rotate(-4deg)',E.out],[1,'rotate(0)']]),dur);this.f(this.pawR,kf([[0,'rotate(0)'],[.44,'rotate(-24deg)',E.sine],[.64,'rotate(4deg)',E.out],[1,'rotate(0)']]),dur);
  await this.wait(dur*.3);this.setExpr('laugh');
  await this.wait(dur*.34);this.puff(80,240,2);this.puff(160,240,2);await m;
 },
 async a_dance(){
  const beat=480,n=6,N=n*2,en=this.d.energy,rf=[[0,'translate(0,0) rotate(0deg)',E.out]],hf=[[0,'rotate(0deg)',E.sine]],pl=[[0,'rotate(0)',E.sine]],pr=[[0,'rotate(0)',E.sine]];
  for(let h=1;h<N;h++){const s=Math.floor((h-1)/2)%2?-1:1,up=h%2===1,o=h/N;
   rf.push([o,up?`translate(${s*9}px,${-11*en}px) rotate(${s*6}deg) scale(.98,1.04)`:`translate(${s*7}px,0) rotate(${s*4}deg) scale(1.04,.95)`,E.sine]);
   hf.push([o,`rotate(${-s*(up?10:6)}deg) translateY(${up?-2:3}px)`,E.sine]);
   pl.push([o,up&&s>0?'rotate(34deg)':'rotate(0)',E.sine]);pr.push([o,up&&s<0?'rotate(-34deg)':'rotate(0)',E.sine]);}
  for(const a of [rf,hf,pl,pr])a.push([1,a===rf?'translate(0,0) rotate(0deg)':a===hf?'rotate(0deg)':'rotate(0)']);
  const dur=beat*n;this.setExpr('proud');
  this.f(this.root,kf(rf),dur);this.f(this.head,kf(hf),dur,{delay:70});this.f(this.pawL,kf(pl),dur);this.f(this.pawR,kf(pr),dur);
  this.f(this.earL,wob(-20,10),dur);this.f(this.earR,wob(20,10),dur,{delay:70});
  this.tufts.forEach((t,i)=>this.f(t,[{transform:'rotate(-8deg)'},{transform:'rotate(8deg)'}],beat,{iterations:n,direction:'alternate',delay:i*50,easing:E.sine}));
  await this.wait(dur*.4);this.setExpr('laugh');await this.wait(dur*.35);this.setExpr('proud');await this.wait(dur*.3);this.hearts(3,120,70);
 },
 async a_stretch(){
  const dur=2800;this.setExpr('happy');
  this.f(this.root,kf([[0,'scale(1,1)',E.out],[.16,'translateY(-4px) scale(.98,1.04)',E.io],[.34,'translateY(8px) scale(1.12,.86)',E.out],[.72,'translateY(9px) scale(1.13,.85)',E.sine],[.88,'translateY(-2px) scale(.97,1.05)',E.out],[1,'scale(1,1)']]),dur);
  this.f(this.head,kf([[0,'translateY(0) scale(1)',E.out],[.16,'translateY(-5px)',E.io],[.34,'translateY(26px) scale(1.05)',E.out],[.72,'translateY(27px) scale(1.05)',E.io],[.88,'translateY(-5px) scale(.99)',E.out],[1,'translateY(0) scale(1)']]),dur);
  this.f(this.pawL,kf([[0,'rotate(0)',E.out],[.34,'rotate(14deg)',E.out],[.72,'rotate(14deg)',E.io],[1,'rotate(0)']]),dur);this.f(this.pawR,kf([[0,'rotate(0)',E.out],[.34,'rotate(-14deg)',E.out],[.72,'rotate(-14deg)',E.io],[1,'rotate(0)']]),dur);
  this.f(this.earL,wob(-12,3),dur,{delay:dur*.3});
  await this.wait(dur*.3);this.setExpr('laugh');
  await this.wait(dur*.45);this.setExpr('chill');await this.wait(dur*.3);
 },
 async a_yawn(){
  const dur=2400;this.setExpr('happy');
  this.f(this.head,kf([[0,'rotate(0deg) translateY(0)',E.out],[.25,'rotate(-5deg) translateY(-5px) scale(1.03)',E.out],[.7,'rotate(-5deg) translateY(-5px) scale(1.03)',E.io],[1,'rotate(0deg) translateY(0)']]),dur);
  this.f(this.root,kf([[0,'scale(1,1)',E.sine],[.3,'scale(1.04,1.06)',E.sine],[.7,'scale(1.04,1.06)',E.sine],[1,'scale(1,1)']]),dur);
  this.f(this.earL,wob(-16,4),dur,{delay:dur*.3});this.f(this.earR,wob(16,4),dur,{delay:dur*.32});
  await this.wait(dur*.2);this.setExpr('yawn');await this.wait(dur*.52);this.setExpr('sleep');await this.wait(dur*.16);this.setExpr('chill');await this.wait(dur*.2);
 },
 async a_sit(){
  const dur=1500;this.setExpr('happy');
  const m=this.p(this.root,kf([[0,'translateY(0) scale(1,1)',E.out],[.2,'translateY(-12px) scale(.95,1.1)',E.in],[.3,'translateY(-12px) scale(.95,1.1)',E.in],[.5,'translateY(0) scale(1.14,.82)',E.out],[.68,'translateY(0) scale(.98,1.04)',E.sine],[.84,'translateY(0) scale(1.03,.97)',E.sine],[1,'translateY(0) scale(1,1)']]),dur);
  this.f(this.head,kf([[0,'translateY(0)',E.sine],[.2,'translateY(-5px)',E.sine],[.5,'translateY(10px)',E.out],[.68,'translateY(-4px)',E.sine],[.84,'translateY(2px)',E.sine],[1,'translateY(0)']]),dur,{delay:60});
  this.f(this.earL,wob(-22,6),dur,{delay:dur*.45});this.f(this.earR,wob(22,6),dur,{delay:dur*.47});
  this.f(this.pawL,kf([[0,'rotate(0)'],[.3,'rotate(9deg)',E.sine],[.5,'rotate(-3deg)',E.out],[1,'rotate(0)']]),dur);this.f(this.pawR,kf([[0,'rotate(0)'],[.3,'rotate(-9deg)',E.sine],[.5,'rotate(3deg)',E.out],[1,'rotate(0)']]),dur);
  await this.wait(dur*.48);this.puff(78,240,2,'#d9cfc6');this.puff(162,240,2,'#d9cfc6');this.setExpr('tender');await m;
 },
 async a_bark(){
  this.setExpr('alert');
  await this.p(this.root,kf([[0,'scale(1,1)',E.out],[1,'scale(1.04,.96)']]),230,{fill:'forwards'});
  for(let i=0;i<3;i++){
   this.setExpr('bark');this.waves();
   this.f(this.root,kf([[0,'translateY(0) scale(1.04,.96)',E.out],[.3,'translateY(-5px) scale(.97,1.05)',E.out],[1,'translateY(0) scale(1,1)']]),360);
   this.f(this.head,kf([[0,'translateY(4px) rotate(2deg)',E.out],[.28,'translateY(-9px) rotate(-4deg) scale(1.04,.98)',E.out],[1,'translateY(0) rotate(0deg)']]),360);
   this.f(this.earL,wob(-16,3),420);this.f(this.earR,wob(16,3),420,{delay:30});
   this.tufts.forEach(t=>this.f(t,[{transform:'scale(1)'},{transform:'scale(1.2)',offset:.25},{transform:'scale(1)'}],400,{easing:E.out}));
   await this.wait(170);this.setExpr('alert');await this.wait(150+(i===1?60:0));
  }
  this.say(this.key==='coral'?'¡Guau! Eso fue un «hola», mor.':'Guau. Fin del comunicado.',2600);
  this.setExpr('happy');await this.wait(900);
 },
 async a_peek(){
  const card=this.o.card||this.host.parentElement.querySelector('.peekcard');if(!card)return;
  card.classList.add('on');
  const Y=v=>`translateY(${v}%)`,h=this.host;
  try{
   await this.wait(450);this.setExpr('alert');
   await this.p(h,kf([[0,Y(0),E.io],[1,Y(72)]]),500,{fill:'forwards'});
   await this.p(h,kf([[0,Y(72),E.out],[1,Y(46)]]),380,{fill:'forwards'});
   this.f(this.earL,wob(-14,4),700);this.f(this.earR,wob(14,4),700,{delay:90});
   await this.wait(500);
   this.gaze=[-.9,-.2];await this.p(h,kf([[0,Y(46),E.out],[1,Y(30)]]),380,{fill:'forwards'});await this.wait(380);
   this.gaze=[.9,-.2];await this.wait(520);this.setExpr('sly');this.gaze=[0,.5];await this.wait(500);
   await this.p(h,kf([[0,Y(30),E.out],[1,Y(8)]]),360,{fill:'forwards'});
   this.setExpr('wow');this.gaze=null;await this.wait(520);
   await this.p(h,kf([[0,Y(8),E.in],[.55,Y(40),E.in],[.62,Y(40),E.out],[1,Y(-5)]]),700,{fill:'forwards'});
   this.setExpr('laugh');this.hearts(3,120,70);
   await this.p(h,kf([[0,Y(-5),E.sine],[1,Y(0)]]),300);
  }finally{ if(card)card.classList.remove('on') }
 },
 async a_mail(){
  const swing=[[0,'rotate(0deg)',E.sine],[.2,'rotate(-9deg)',E.sine],[.4,'rotate(7deg)',E.sine],[.6,'rotate(-5deg)',E.sine],[.8,'rotate(3deg)',E.sine],[1,'rotate(0deg)']];
  this.setExpr('happy');
  const hops=this.key==='coral'?3:2;
  this.f(this.mail,kf([[0,'scale(.3) translateY(10px)',E.spring],[.7,'scale(1.1) translateY(0)',E.out],[1,'scale(1) translateY(0)']]),480,{fill:'forwards'});
  this.mail.style.opacity=1;
  await this.p(this.mail,[{opacity:0},{opacity:1}],160,{fill:'forwards'}).catch(e=>{if(e==='x')throw e});
  const dur=360*hops;
  const rf=[[0,'translateY(0) scale(1,1)',E.out]];
  for(let i=0;i<hops;i++){rf.push([(i+.5)/hops*.96,'translateY(-13px) scale(.97,1.05)',E.in]);rf.push([(i+1)/hops*.96,'translateY(0) scale(1.07,.93)',E.out])}
  rf.push([1,'translateY(0) scale(1,1)']);
  this.f(this.root,kf(rf),dur);
  this.f(this.head,kf([[0,'rotate(0deg) translateY(0)',E.out],[.15,'rotate(-6deg) translateY(-3px)',E.sine],[.9,'rotate(-6deg) translateY(-3px)',E.out],[1,'rotate(-4deg)']]),dur,{fill:'forwards'});
  this.f(this.mail,swing,dur,{delay:200});
  this.f(this.earL,wob(-10,6),dur);this.f(this.earR,wob(10,6),dur,{delay:60});
  await this.wait(dur);
  this.say(this.key==='coral'?'¡Correo para ustedes! Lo traje yo, o sea, soy la mejor.':'Les llegó un aviso. Lo traje babeado, pero con cariño.',3400);
  this.setExpr('tender');this.f(this.mail,swing,900);
  await this.wait(1700);
  await this.p(this.mail,kf([[0,'translateY(0) rotate(0deg)',E.in],[1,'translateY(46px) rotate(24deg)']]).map((k,i)=>Object.assign(k,{opacity:i?0:1})),420,{fill:'forwards'});
  this.hearts(3,120,70);await this.wait(400);
 },
 async a_confetti(){
  this.setExpr('proud');
  await this.p(this.root,kf([[0,'scale(1,1)',E.out],[1,'scale(1.1,.88)']]),240,{fill:'forwards'});
  const h=-(40*this.d.energy+16);
  this.f(this.pawL,kf([[0,'rotate(0)',E.out],[.4,'rotate(40deg)',E.out],[.8,'rotate(40deg)',E.io],[1,'rotate(0)']]),1300);this.f(this.pawR,kf([[0,'rotate(0)',E.out],[.4,'rotate(-40deg)',E.out],[.8,'rotate(-40deg)',E.io],[1,'rotate(0)']]),1300);
  const m=this.p(this.root,kf([[0,'translateY(0) scale(1.1,.88)',E.out],[.35,`translateY(${h}px) scale(.93,1.1)`,E.io],[.7,'translateY(0) scale(1.1,.88)',E.out],[.85,'translateY(0) scale(.98,1.03)',E.sine],[1,'translateY(0) scale(1,1)']]),1300);
  this.f(this.earL,wob(-30,6),1400,{delay:150});this.f(this.earR,wob(30,6),1400,{delay:180});
  this.f(this.head,kf([[0,'translateY(0)',E.out],[.35,'translateY(-5px) rotate(-5deg)',E.io],[.7,'translateY(8px)',E.out],[1,'translateY(0)']]),1300,{delay:60});
  await this.wait(380);this.setExpr('laugh');this.confetti(120,80,this.key==='coral'?38:28);
  await this.wait(700);this.confetti(120,80,12);this.hearts(2,120,70);await m;await this.wait(600);
 },
 async a_sleep(){
  this.setExpr('yawn');
  this.f(this.head,kf([[0,'rotate(0) translateY(0)',E.out],[1,'rotate(-4deg) translateY(-4px)']]),700,{fill:'forwards'});
  await this.wait(900);this.setExpr('sleep');
  const pose=kf([[0,'translateY(0) rotate(0deg)',E.io],[1,'translateY(12px) rotate(7deg) scale(1.02)']]);
  this.anims.forEach(a=>{try{a.cancel()}catch(e){}});this.anims.clear();
  this.f(this.head,pose,900,{fill:'forwards'});
  this.f(this.root,kf([[0,'scale(1,1)',E.io],[1,'scale(1.03,.96)']]),900,{fill:'forwards'});
  this.f(this.pawL,kf([[0,'rotate(0)',E.io],[1,'rotate(8deg)']]),900,{fill:'forwards'});this.f(this.pawR,kf([[0,'rotate(0)',E.io],[1,'rotate(-8deg)']]),900,{fill:'forwards'});
  this.idleRate(.5);this.sleeping=true;
  await this.wait(500);
  for(;;){this.zzz();await this.wait(1500)}
 }
});
const PH = FRASES.ph;

/* ---------- Añadidos de Rumbo ---------- */
/* Ciclo de mirada: solo corre si hay un perrito visible; ~30 cuadros por segundo para cuidar el scroll */
let raf = 0, lastT = 0;
function loop(now) {
  raf = 0; let any = false;
  for (const g of ALL) { if (g.visible && !g.dead && (g.o.track || g.o.live)) { any = true; if (now - lastT >= 32) g.track(now); } }
  if (now - lastT >= 32) lastT = now;
  if (any && !document.hidden && !REDUCED.matches) raf = requestAnimationFrame(loop);
}
function wake() { if (!raf && !REDUCED.matches && !document.hidden) raf = requestAnimationFrame(loop); }
addEventListener('pointermove', e => { PTR.x = e.clientX; PTR.y = e.clientY; PTR.t = performance.now(); wake(); }, {passive: true});
addEventListener('scroll', () => { RECT_DIRTY++; }, {passive: true});
addEventListener('resize', () => { RECT_DIRTY++; });
document.addEventListener('visibilitychange', wake);

/* Montar y limpiar perritos (de voz-y-avisos-v7) */
function mount(host, key, view, extra) {
  const dg = new Dog(host, key, Object.assign({view, live: true, track: true, click: false}, extra || {}));
  wake(); return dg;
}
function dispose(dg) {
  if (!dg) return;
  dg.visible = false; dg.dead = true; clearTimeout(dg.sched); dg.tok++; dg.cancelAnims && dg.cancelAnims();
  const i = ALL.indexOf(dg); if (i > -1) ALL.splice(i, 1);
  try { io.unobserve(dg.host); } catch (e) { /* nada */ }
}
function bubbleSay(bub, tag, label, text, ms) {
  if (!bub) return;
  bub.innerHTML = `<b><span>${tag}</span>${label ? `<span class="tgl">${label}</span>` : ''}</b>${text}`;
  bub.classList.remove('show'); void bub.offsetWidth; bub.classList.add('show');
  clearTimeout(bub._t); bub._t = setTimeout(() => bub.classList.remove('show'), ms || 4200);
}
/* Reacción de un perrito según el tono del aviso */
function react(dg, expr, tono, opts) {
  if (!dg || dg.dead || !dg.root) return;
  dg.setExpr(expr);
  if (REDUCED.matches) return;
  const big = opts && opts.big;
  if (tono === 'alegre') {
    dg.f(dg.root, kf([[0,'translateY(0) scale(1,1)',E.out],[.3,'translateY(-11px) scale(.95,1.07)',E.in],[.62,'translateY(0) scale(1.07,.93)',E.out],[1,'translateY(0) scale(1)']]), 760);
    dg.f(dg.earL, wob(-22, 5), 800); dg.f(dg.earR, wob(22, 5), 800, {delay: 40});
    if (dg.key === 'coral') dg.hearts(big ? 4 : 2, 120, 60); else if (big) dg.hearts(1, 120, 60);
  } else if (tono === 'urgente') {
    dg.f(dg.head, kf([[0,'rotate(0deg)'],[.2,'rotate(-5deg)'],[.4,'rotate(5deg)'],[.6,'rotate(-3deg)'],[.8,'rotate(2deg)'],[1,'rotate(0deg)']]), 560);
    dg.f(dg.earL, wob(-14, 4), 600); dg.f(dg.earR, wob(14, 4), 600, {delay: 30});
  } else {
    dg.f(dg.head, kf([[0,'translateY(0) rotate(0deg)',E.sine],[.5,'translateY(-3px) rotate(-2deg)',E.sine],[1,'translateY(0) rotate(0deg)']]), 1400);
  }
}
/* Expresión de cada perrito según el tipo de aviso */
const EXTONO = {urgente: {coral: 'worried', orio: 'alert'}, alegre: {coral: 'laugh', orio: 'proud'}, calma: {coral: 'tender', orio: 'chill'}};
const exOf = (tipo, dog) => tipo.k === 'pagoAtrasado' ? {coral: 'dramatic', orio: 'resigned'}[dog] : tipo.k === 'lujos' ? {coral: 'wink', orio: 'sly'}[dog] : tipo.k === 'saludoN' ? 'sleep' : EXTONO[tipo.tono][dog];
const miniEx = (tipo, dog) => tipo.tono === 'urgente' ? (dog === 'coral' ? 'worried' : 'alert') : tipo.k === 'saludoN' ? 'sleep' : tipo.tono === 'calma' && dog === 'coral' ? 'tender' : 'happy';

window.Mascotas = {Dog, DOGS, E, kf, wob, miniSVG, mount, dispose, bubbleSay, react, exOf, miniEx, wake, REDUCED};
})();
