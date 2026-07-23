(()=>{
 'use strict';
 const START=new Date('2026-07-31T00:00:00+02:00'),END=new Date('2026-08-03T00:00:00+02:00');
 const MODE_KEY='paris-dynamic-background-mode-v1';
 const $=s=>document.querySelector(s);
 let mode=localStorage.getItem(MODE_KEY)||'auto',lastSignature='';
 function mount(){
   if(!$('.dynamic-background'))document.body.insertAdjacentHTML('afterbegin','<div class="dynamic-background" data-mode="auto" aria-hidden="true"><div class="db-clouds"></div><div class="db-ribbons"></div><div class="db-hearts"></div><div class="db-petals"></div><div class="db-lights"></div><div class="db-stars"></div><div class="db-weather"></div><div class="db-landscape"></div><div class="db-silhouette"></div></div>');
   mountSettings();applyMode(mode);render();
   new MutationObserver(render).observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:['class','data-ambient-place','data-ambient-time']});
   window.addEventListener('storage',render);document.addEventListener('visibilitychange',()=>{if(!document.hidden)render()});
   setInterval(render,30000);
 }
 function mountSettings(){
   const panel=$('#ambientPanel');if(!panel||panel.querySelector('.dynamic-background-settings'))return;
   const location=panel.querySelector('.ambient-location');
   const html=`<div class="dynamic-background-settings"><span>✨ Dynamischer Hintergrund</span><div class="dynamic-background-options" role="group" aria-label="Dynamischer Hintergrund"><button type="button" data-bg-choice="auto">Automatisch</button><button type="button" data-bg-choice="quiet">Ruhig</button><button type="button" data-bg-choice="off">Aus</button></div><small class="dynamic-background-hint">Passt Licht, Himmel und Illustrationen an Reisephase, Tageszeit, Wetter und Live Moment an.</small></div>`;
   location?location.insertAdjacentHTML('beforebegin',html):panel.insertAdjacentHTML('beforeend',html);
   panel.querySelectorAll('[data-bg-choice]').forEach(b=>b.addEventListener('click',()=>applyMode(b.dataset.bgChoice)));
 }
 function applyMode(next){mode=['auto','quiet','off'].includes(next)?next:'auto';localStorage.setItem(MODE_KEY,mode);document.body.dataset.bgMode=mode;const bg=$('.dynamic-background');if(bg)bg.dataset.mode=mode;document.querySelectorAll('[data-bg-choice]').forEach(b=>b.classList.toggle('is-active',b.dataset.bgChoice===mode));}
 function savedLocation(){try{const a=JSON.parse(localStorage.getItem('paris-shared-location-v1')||'null'),b=JSON.parse(localStorage.getItem('parisSharedLocationV1')||'null');return a&&Date.now()-(a.ts||a.at)<86400000?a:b&&Date.now()-(b.ts||b.at)<86400000?{latitude:b.lat,longitude:b.lng}:null}catch{return null}}
 function dist(a,b,c,d){const R=6371,p=Math.PI/180,x=(c-a)*p,y=(d-b)*p,q=Math.sin(x/2)**2+Math.cos(a*p)*Math.cos(c*p)*Math.sin(y/2)**2;return 2*R*Math.asin(Math.sqrt(q))}
 function testScene(){if(localStorage.getItem('parisLiveMomentsModeV1')!=='test')return null;return localStorage.getItem('parisLiveMomentsTestSceneV1')||'pretrip'}
 function sceneFromTest(v){if(v==='pretrip')return'pretrip';if(v==='drive')return'road';if(v==='after')return'after';if(v==='loc:hotel')return'hotel';if(v==='loc:seine')return'seine';if(v==='loc:disney')return'disney';if(v&&v.startsWith('loc:'))return hourScene();if(v==='trip')return hourScene();return null}
 function hourScene(){const h=new Date().getHours();return h>=20||h<7?'night':'paris-day'}
 function scene(){
   const test=sceneFromTest(testScene());if(test)return test;
   const ambient=document.body.dataset.ambientPlace;if(ambient==='road')return'road';if(ambient==='hotel')return'hotel';if(ambient==='seine')return'seine';if(ambient==='disney')return'disney';if(ambient==='night')return'night';if(ambient==='paris')return hourScene();
   const loc=savedLocation();if(loc){const la=loc.latitude,lo=loc.longitude;if(dist(la,lo,48.8674,2.7836)<7)return'disney';if(dist(la,lo,48.8588,2.3166)<3)return'seine';if(dist(la,lo,48.7619,2.3046)<4)return'hotel';if(dist(la,lo,48.8566,2.3522)<22)return hourScene()}
   const now=new Date();if(now<START)return'pretrip';if(now>=END)return'after';if(now.toISOString().slice(0,10)==='2026-07-31'&&now.getHours()<11)return'road';return hourScene();
 }
 function weather(){
   const text=[...document.querySelectorAll('.weather-card,[data-weather],#assistantWeatherText,#assistantWeatherTitle')].map(x=>x.textContent||'').join(' ').toLowerCase();
   if(/regen|rain|schauer|nass|gewitter|drizzle/.test(text))return'rain';if(/bewölkt|wolkig|cloud|bedeckt|overcast/.test(text))return'cloudy';return'clear';
 }
 function render(){const s=scene(),w=weather(),signature=s+'|'+w+'|'+mode;if(signature===lastSignature)return;lastSignature=signature;document.body.dataset.bgScene=s;document.body.dataset.bgWeather=w;const meta=$('meta[name="theme-color"]');if(meta)meta.content=s==='night'?'#27243a':s==='disney'?'#eee5f7':s==='seine'?'#e2eff2':'#f7eee7';}
 window.ParisDynamicBackground={setMode:applyMode,refresh:render};
 document.readyState==='loading'?document.addEventListener('DOMContentLoaded',mount,{once:true}):mount();
})();
