(()=>{
 const DB='paris-reisegalerie',STORE='photos';const stage=document.getElementById('revueStage');let scenes=[],index=0,timer=null,playing=false,urls=[];
 const safe=(k,f)=>{try{const v=localStorage.getItem(k);return v?JSON.parse(v):f}catch{return f}};
 const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function dbPhotos(){return new Promise(resolve=>{const r=indexedDB.open(DB,1);r.onerror=()=>resolve([]);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id'})};r.onsuccess=()=>{const q=r.result.transaction(STORE,'readonly').objectStore(STORE).getAll();q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>resolve([])}})}
 function src(p){const b=p.blob||p.file||p.imageBlob;if(!b)return'';const u=URL.createObjectURL(b);urls.push(u);return u}
 function dateKey(p){return p.dayKey||p.dateKey||String(p.takenAt||p.date||'').slice(0,10)}
 function note(day){const all=safe('paris-gallery-day-notes-v2',safe('paris-gallery-day-notes',{}));return all[day]||''}
 function add(html,bg=''){scenes.push({html,bg})}
 async function build(){const photos=await dbPhotos(),fav=photos.filter(p=>p.favorite),pol=photos.filter(p=>p.polaroid);const days=['2026-07-31','2026-08-01','2026-08-02'];
  const cover=src(pol[0]||fav[0]||photos[0]);add(`<div class="scene-content"><div class="scene-kicker">Fabian · Luisa · Livi</div><h1>Paris ’26</h1><p>Unser erster Hochzeitstag zwischen Paris, kleinen Abenteuern und ganz großen Erinnerungen.</p></div>`,cover);
  add(`<div class="scene-content"><div class="scene-kicker">31. Juli – 2. August 2026</div><h2>Drei Tage.<br>Eine Geschichte.</h2><div class="scene-grid"><div class="scene-stat"><strong>${photos.length}</strong><span>Reisemomente</span></div><div class="scene-stat"><strong>${fav.length}</strong><span>Lieblingsfotos</span></div><div class="scene-stat"><strong>${pol.length}</strong><span>Polaroids</span></div></div></div>`,cover);
  const meta=[['2026-07-31','Ankunft in Paris','Paris, wir kommen.'],['2026-08-01','Unser erster Hochzeitstag','Heute wird magisch. ❤️'],['2026-08-02','Au revoir Paris','Noch ein letzter Blick zurück.']];
  for(const [day,title,sub] of meta){const list=photos.filter(p=>dateKey(p)===day),hero=pol.find(p=>dateKey(p)===day)||fav.find(p=>dateKey(p)===day)||list[0],bg=hero?src(hero):cover;add(`<div class="scene-content"><div class="scene-kicker">${new Date(day+'T12:00:00').toLocaleDateString('de-DE',{day:'numeric',month:'long'})}</div><h2>${esc(title)}</h2><p>${esc(note(day)||sub)}</p></div>`,bg);for(const p of list.slice(0,5)){const u=src(p);add(`<div class="scene-content"><img class="scene-photo" src="${u}" alt="Reisemoment"><p class="scene-caption">${esc(p.caption||p.title||title)}</p></div>`,u)}}
  const phrases=safe('paris-coach-favorites-v1',[]);if(phrases.length)add(`<div class="scene-content"><div class="scene-kicker">Sprachmomente</div><h2>Bonjour, Paris.</h2><p>Aus kleinen Sätzen wurden echte Reisemomente – ${phrases.length} Lieblingssätze haben euch begleitet.</p></div>`,cover);
  add(`<div class="scene-content"><p class="scene-quote">„Die schönsten Erinnerungen entstehen nicht durch perfekte Pläne, sondern durch gemeinsame Momente.“</p></div>`,cover);
  add(`<div class="scene-content"><div class="scene-kicker">Fin</div><h2>Danke für diese wunderschöne Reise.</h2><p>Paris 2026 · Unser erster Hochzeitstag · Für immer ein Teil unserer Geschichte.</p><div class="empty-card"><a href="index.html#reisebuch">📖 Reisebuch öffnen</a></div></div>`,cover);
  render();
 }
 function render(){stage.innerHTML=scenes.map((s,i)=>`<section class="scene${i===0?' active':''}" data-i="${i}">${s.bg?`<div class="scene-bg" style="background-image:url('${s.bg}')"></div>`:''}${s.html}</section>`).join('');update()}
 function update(){stage.querySelectorAll('.scene').forEach((s,i)=>s.classList.toggle('active',i===index));document.getElementById('revueProgress').style.width=((index+1)/scenes.length*100)+'%';document.getElementById('revuePlay').textContent=playing?'❚❚ Pause':index===0?'▶ Reise-Revue starten':'▶ Weiter ansehen'}
 function next(){if(index<scenes.length-1){index++;update()}else{stop();index=0;update()}}function prev(){index=Math.max(0,index-1);update()}function play(){playing=!playing;clearInterval(timer);if(playing)timer=setInterval(next,6200);update()}function stop(){playing=false;clearInterval(timer)}
 document.getElementById('revueNext').onclick=next;document.getElementById('revuePrev').onclick=prev;document.getElementById('revuePlay').onclick=play;document.getElementById('revueSound').onclick=()=>document.getElementById('ambientToggle')?.click();document.addEventListener('keydown',e=>{if(e.key==='ArrowRight')next();if(e.key==='ArrowLeft')prev();if(e.key===' ')play()});
 build();window.addEventListener('beforeunload',()=>urls.forEach(URL.revokeObjectURL));
})();
