(() => {
  'use strict';
  const DB_NAME = 'paris-reisegalerie';
  const DB_VERSION = 1;
  const STORE = 'photos';
  const NOTE_KEY = 'parisGalleryNotesV1';
  const DAYS = {
    '2026-07-31': { short:'31.07.', title:'Ankunft in Paris', icon:'🗼' },
    '2026-08-01': { short:'01.08.', title:'Hochzeitstag & Disneyland', icon:'🏰' },
    '2026-08-02': { short:'02.08.', title:'Au revoir, Paris', icon:'✨' },
    other: { short:'Weitere', title:'Weitere Reisemomente', icon:'📷' }
  };
  const state = { photos: [], urls: new Map(), notes: loadNotes(), busy:false };
  const $ = (s, root=document) => root.querySelector(s);
  const els = {};

  function openDB(){
    return new Promise((resolve,reject)=>{
      const req=indexedDB.open(DB_NAME,DB_VERSION);
      req.onupgradeneeded=()=>{ const db=req.result; if(!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE,{keyPath:'id'}); };
      req.onsuccess=()=>resolve(req.result); req.onerror=()=>reject(req.error);
    });
  }
  async function getAll(){ const db=await openDB(); return new Promise((res,rej)=>{ const r=db.transaction(STORE,'readonly').objectStore(STORE).getAll(); r.onsuccess=()=>res(r.result||[]); r.onerror=()=>rej(r.error); }); }
  async function put(item){ const db=await openDB(); return new Promise((res,rej)=>{ const r=db.transaction(STORE,'readwrite').objectStore(STORE).put(item); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }
  async function del(id){ const db=await openDB(); return new Promise((res,rej)=>{ const r=db.transaction(STORE,'readwrite').objectStore(STORE).delete(id); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }
  async function clearAll(){ const db=await openDB(); return new Promise((res,rej)=>{ const r=db.transaction(STORE,'readwrite').objectStore(STORE).clear(); r.onsuccess=()=>res(); r.onerror=()=>rej(r.error); }); }
  function loadNotes(){ try{return JSON.parse(localStorage.getItem(NOTE_KEY)||'{}')}catch{return{}} }
  function saveNotes(){ localStorage.setItem(NOTE_KEY,JSON.stringify(state.notes)); }
  function toast(msg){ els.toast.textContent=msg; els.toast.classList.add('show'); clearTimeout(toast.t); toast.t=setTimeout(()=>els.toast.classList.remove('show'),2400); }
  function dateKey(d){ const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),day=String(d.getDate()).padStart(2,'0'); return `${y}-${m}-${day}`; }
  function tripGroup(key){ return DAYS[key]?key:'other'; }
  function prettyTime(iso){ const d=new Date(iso); return new Intl.DateTimeFormat('de-DE',{dateStyle:'medium',timeStyle:'short'}).format(d); }
  function uniqueId(file){ return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2,8)}`; }
  function arrayBufferSlice(file,start,length){ return file.slice(start,start+length).arrayBuffer(); }

  async function exifDate(file){
    if(!/jpe?g/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) return null;
    try{
      const buf=await arrayBufferSlice(file,0,Math.min(file.size,256*1024)); const v=new DataView(buf);
      if(v.getUint16(0,false)!==0xFFD8) return null; let off=2;
      while(off+4<v.byteLength){
        if(v.getUint8(off)!==0xFF) break; const marker=v.getUint8(off+1); const len=v.getUint16(off+2,false);
        if(marker===0xE1 && off+4+len<=v.byteLength){
          const start=off+4; if(v.getUint32(start,false)!==0x45786966) return null;
          const tiff=start+6, little=v.getUint16(tiff,false)===0x4949;
          const u16=p=>v.getUint16(p,little), u32=p=>v.getUint32(p,little);
          const readAscii=(p,n)=>{let s=''; for(let i=0;i<n-1&&p+i<v.byteLength;i++)s+=String.fromCharCode(v.getUint8(p+i)); return s;};
          const ifd0=tiff+u32(tiff+4); const count=u16(ifd0); let exifPtr=null;
          for(let i=0;i<count;i++){const e=ifd0+2+i*12;if(u16(e)===0x8769)exifPtr=tiff+u32(e+8)}
          const parseIfd=p=>{if(!p||p+2>=v.byteLength)return null;const c=u16(p);for(let i=0;i<c;i++){const e=p+2+i*12,tag=u16(e),n=u32(e+4);if(tag===0x9003||tag===0x0132){const q=n<=4?e+8:tiff+u32(e+8);return readAscii(q,n)}}return null};
          const raw=parseIfd(exifPtr)||parseIfd(ifd0); if(raw){ const m=raw.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/); if(m)return new Date(+m[1],+m[2]-1,+m[3],+m[4],+m[5],+m[6]); }
          return null;
        }
        if(marker===0xDA||len<2) break; off+=2+len;
      }
    }catch(e){ console.warn('EXIF-Datum nicht lesbar',e); }
    return null;
  }
  async function takenDate(file){ return await exifDate(file) || new Date(file.lastModified||Date.now()); }
  function makeName(group,index){ const d=DAYS[group]||DAYS.other; return `${d.short} · ${d.title} · Foto ${String(index+1).padStart(2,'0')}`; }
  function getUrl(photo){ if(!state.urls.has(photo.id)) state.urls.set(photo.id,URL.createObjectURL(photo.blob)); return state.urls.get(photo.id); }
  function cleanupUrl(id){ const u=state.urls.get(id); if(u)URL.revokeObjectURL(u); state.urls.delete(id); }

  async function importFiles(files){
    const images=[...files].filter(f=>f.type.startsWith('image/'));
    if(!images.length){toast('Bitte wählt Bilder aus.');return}
    if(state.busy)return; state.busy=true; els.input.disabled=true; els.uploadText.textContent='Fotos werden sortiert …';
    let added=0;
    try{
      for(const file of images){
        const duplicate=state.photos.some(p=>p.originalName===file.name&&p.size===file.size&&p.lastModified===file.lastModified);
        if(duplicate)continue;
        const d=await takenDate(file); const key=dateKey(d); const group=tripGroup(key);
        const item={id:uniqueId(file),blob:file,originalName:file.name,size:file.size,lastModified:file.lastModified,takenAt:d.toISOString(),dateKey:key,group,favorite:false,polaroid:false,caption:'',createdAt:new Date().toISOString()};
        await put(item); state.photos.push(item); added++;
      }
      normalizePolaroid(); render(); toast(added?`${added} Foto${added===1?'':'s'} automatisch einsortiert`:'Keine neuen Fotos gefunden');
    }catch(e){console.error(e);toast('Die Fotos konnten nicht vollständig gespeichert werden.');}
    finally{state.busy=false;els.input.disabled=false;els.input.value='';els.uploadText.textContent='Fotos auswählen';}
  }
  function normalizePolaroid(){ const chosen=state.photos.filter(p=>p.polaroid); if(chosen.length>1){chosen.slice(1).forEach(p=>{p.polaroid=false;put(p)})} }
  async function updatePhoto(id,patch){ const p=state.photos.find(x=>x.id===id); if(!p)return; Object.assign(p,patch); await put(p); render(); }
  async function choosePolaroid(id){ for(const p of state.photos){ const val=p.id===id?!p.polaroid:false; if(p.polaroid!==val){p.polaroid=val;await put(p)}} render(); toast(state.photos.find(p=>p.id===id)?.polaroid?'Polaroid des Moments gewählt':'Polaroid-Auswahl entfernt'); }
  async function removePhoto(id){ if(!confirm('Dieses Foto aus der Reisegalerie entfernen?'))return; await del(id); cleanupUrl(id); state.photos=state.photos.filter(p=>p.id!==id); render(); }
  async function removeAll(){ if(!state.photos.length)return; if(!confirm('Alle lokal gespeicherten Galeriefotos entfernen?'))return; await clearAll(); state.urls.forEach(u=>URL.revokeObjectURL(u)); state.urls.clear(); state.photos=[]; render(); toast('Galerie wurde geleert'); }

  function photoCard(p,index,group){
    const card=document.createElement('article'); card.className='gallery-photo';
    card.innerHTML=`<div class="gallery-photo-media"><img alt="${escapeHtml(p.caption||makeName(group,index))}"></div><div class="gallery-photo-actions"><button class="gallery-icon-btn favorite ${p.favorite?'active':''}" aria-label="${p.favorite?'Favorit entfernen':'Als Favorit markieren'}" title="Favorit">${p.favorite?'❤️':'♡'}</button><button class="gallery-icon-btn gallery-polaroid-btn ${p.polaroid?'active':''}" aria-label="Als Polaroid des Moments wählen" title="Polaroid des Moments">${p.polaroid?'⭐':'☆'}</button></div><div class="gallery-photo-body"><div class="gallery-auto-name">${escapeHtml(makeName(group,index))}</div><span class="gallery-photo-time">Aufgenommen: ${escapeHtml(prettyTime(p.takenAt))}</span><input class="gallery-caption" maxlength="100" placeholder="Kurze Bildunterschrift …" value="${escapeAttr(p.caption||'')}"></div><button class="gallery-remove" aria-label="Foto entfernen">×</button>`;
    $('img',card).src=getUrl(p);
    $('.favorite',card).addEventListener('click',()=>updatePhoto(p.id,{favorite:!p.favorite}).then(()=>toast(!p.favorite?'Favorit gespeichert':'Favorit entfernt')));
    $('.gallery-polaroid-btn',card).addEventListener('click',()=>choosePolaroid(p.id));
    const cap=$('.gallery-caption',card); cap.addEventListener('change',()=>updatePhoto(p.id,{caption:cap.value.trim()}));
    $('.gallery-remove',card).addEventListener('click',()=>removePhoto(p.id)); return card;
  }
  function escapeHtml(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
  function escapeAttr(s){return escapeHtml(s)}
  function render(){
    state.photos.sort((a,b)=>new Date(a.takenAt)-new Date(b.takenAt));
    els.empty.hidden=state.photos.length>0; els.days.innerHTML='';
    const groups=['2026-07-31','2026-08-01','2026-08-02','other'];
    for(const group of groups){ const list=state.photos.filter(p=>p.group===group); if(!list.length)continue; const meta=DAYS[group]||DAYS.other;
      const day=document.createElement('article');day.className='gallery-day';day.innerHTML=`<div class="gallery-day-head"><div><span class="gallery-day-kicker">${meta.icon} ${meta.short}</span><h3>${escapeHtml(meta.title)}</h3><div class="gallery-day-count">${list.length} Foto${list.length===1?'':'s'} · ${list.filter(p=>p.favorite).length} Favorit${list.filter(p=>p.favorite).length===1?'':'en'}</div></div></div><div class="gallery-note-wrap"><label class="gallery-note-label" for="note-${group}">Tagesnotiz</label><textarea class="gallery-note" id="note-${group}" placeholder="Was möchtet ihr von diesem Tag festhalten?">${escapeHtml(state.notes[group]||'')}</textarea></div><div class="gallery-grid"></div>`;
      const note=$('.gallery-note',day); note.addEventListener('input',()=>{state.notes[group]=note.value;saveNotes();updateStats()});
      const grid=$('.gallery-grid',day);list.forEach((p,i)=>grid.appendChild(photoCard(p,i,group)));els.days.appendChild(day);
    }
    const pol=state.photos.find(p=>p.polaroid); els.polaroid.classList.toggle('visible',!!pol);
    if(pol){els.polaroidImg.src=getUrl(pol);els.polaroidTitle.textContent=pol.caption||'Unser Moment in Paris';els.polaroidDate.textContent=prettyTime(pol.takenAt)}else{els.polaroidImg.removeAttribute('src')}
    updateStats();
  }
  function updateStats(){ const fav=state.photos.filter(p=>p.favorite).length, notes=Object.values(state.notes).filter(v=>String(v).trim()).length; els.total.textContent=state.photos.length;els.favorites.textContent=fav;els.notes.textContent=notes;els.bookSummary.textContent=`${state.photos.length} Fotos, ${fav} Favoriten und ${notes} Tagesnotizen sind lokal für das spätere Reisebuch vorbereitet.`; }
  async function exportMetadata(){
    const data={version:1,createdAt:new Date().toISOString(),trip:'Paris 2026',notes:state.notes,photos:state.photos.map((p,i)=>({id:p.id,originalName:p.originalName,takenAt:p.takenAt,dateKey:p.dateKey,group:p.group,automaticName:makeName(p.group,state.photos.filter(x=>x.group===p.group).indexOf(p)),caption:p.caption,favorite:p.favorite,polaroid:p.polaroid}))};
    const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='paris-reisebuch-daten.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Reisebuch-Daten exportiert');
  }
  async function init(){
    Object.assign(els,{input:$('#galleryInput'),uploadText:$('#galleryUploadText'),empty:$('#galleryEmpty'),days:$('#galleryDays'),total:$('#galleryTotal'),favorites:$('#galleryFavorites'),notes:$('#galleryNotes'),polaroid:$('#galleryPolaroid'),polaroidImg:$('#galleryPolaroidImg'),polaroidTitle:$('#galleryPolaroidTitle'),polaroidDate:$('#galleryPolaroidDate'),toast:$('#galleryToast'),bookSummary:$('#galleryBookSummary')});
    if(!els.input)return; els.input.addEventListener('change',e=>importFiles(e.target.files)); $('#galleryClear').addEventListener('click',removeAll); $('#galleryExport').addEventListener('click',exportMetadata);
    try{state.photos=await getAll();normalizePolaroid();render()}catch(e){console.error(e);els.empty.innerHTML='<div class="gallery-empty-icon">⚠️</div><h3>Lokaler Speicher nicht verfügbar</h3><p>Bitte öffnet die Seite in Safari oder als installierte Web-App und erlaubt die lokale Datenspeicherung.</p>';}
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
