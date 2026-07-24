(() => {
  'use strict';
  const ID_KEY='parisIdentityV1', REG_KEY='parisTripRegistryV1', DEV_KEY='parisDeveloperModeV1';
  const parse=(v,f)=>{try{return v?JSON.parse(v):f}catch{return f}};
  const esc=s=>String(s??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));
  const current=()=>parse(localStorage.getItem(ID_KEY),null);
  const registry=()=>parse(localStorage.getItem(REG_KEY),[]);
  const saveRegistry=v=>localStorage.setItem(REG_KEY,JSON.stringify(v));
  function register(profile, extra={}){
    if(!profile?.tripId)return;
    const list=registry(), i=list.findIndex(x=>x.tripId===profile.tripId);
    const item={...list[i],...profile,...extra,lastOpenedAt:new Date().toISOString(),createdAt:list[i]?.createdAt||new Date().toISOString()};
    if(i>=0)list.splice(i,1); list.unshift(item); saveRegistry(list);
  }
  window.ParisTrips={register,list:registry};
  const p=current(); if(p) register(p);

  function css(){if(document.getElementById('pcCss'))return;const s=document.createElement('style');s.id='pcCss';s.textContent=`
  html,body{max-width:100%;overflow-x:clip}html.pc-open,html.pc-open body{overflow:hidden}.pc-fab{box-sizing:border-box;position:fixed;right:max(12px,env(safe-area-inset-right));top:calc(12px + env(safe-area-inset-top));z-index:25000;width:auto;max-width:calc(100vw - 24px);height:46px;padding:0 15px;border:1px solid rgba(229,151,174,.5);border-radius:999px;background:rgba(255,248,251,.96);backdrop-filter:blur(18px);-webkit-backdrop-filter:blur(18px);box-shadow:0 12px 34px rgba(64,83,102,.22);display:flex;align-items:center;justify-content:center;gap:8px;color:#9d4665;font:900 14px/1 system-ui,sans-serif;cursor:pointer;transform:translateZ(0)}.pc-fab-icon{font-size:22px;line-height:1}.pc-fab-label{display:inline-block}@media(max-width:520px){.pc-fab{right:max(10px,env(safe-area-inset-right));top:calc(10px + env(safe-area-inset-top));width:46px;min-width:46px;max-width:46px;padding:0}.pc-fab-label{display:none}}
  .pc-overlay{position:fixed;inset:0;z-index:32000;background:rgba(37,50,65,.42);backdrop-filter:blur(8px);display:grid;place-items:center;padding:14px}.pc-overlay[hidden]{display:none}.pc-shell{width:min(1080px,100%);height:min(780px,calc(100vh - 28px));background:#fbfcfd;border-radius:34px;overflow:hidden;box-shadow:0 32px 90px rgba(28,42,58,.35);display:grid;grid-template-columns:250px 1fr}.pc-side{background:linear-gradient(165deg,#fff2f6,#eef9fa);padding:28px 18px;display:flex;flex-direction:column}.pc-brand{font:900 24px Georgia;color:#355066;padding:0 12px 22px}.pc-nav{display:grid;gap:7px}.pc-nav button{border:0;background:transparent;text-align:left;padding:13px 14px;border-radius:15px;font-weight:800;color:#667784;cursor:pointer}.pc-nav button.active{background:#fff;color:#c65d7c;box-shadow:0 8px 20px rgba(65,84,101,.09)}.pc-close{margin-top:auto;border:0;background:#fff;padding:12px;border-radius:14px;font-weight:800;cursor:pointer}.pc-main{padding:30px;overflow:auto}.pc-head{display:flex;justify-content:space-between;gap:20px;align-items:start;margin-bottom:24px}.pc-head h2{margin:0;color:#314b60;font:900 36px Georgia}.pc-head p{margin:7px 0 0;color:#7a8994}.pc-grid{display:grid;gap:16px}.pc-card{background:#fff;border:1px solid #e7e9eb;border-radius:24px;padding:20px;box-shadow:0 10px 28px rgba(52,72,89,.07)}.pc-trip{display:grid;grid-template-columns:1fr auto;gap:16px}.pc-badge{display:inline-flex;padding:6px 10px;border-radius:99px;background:#eaf8f2;color:#34755a;font-size:12px;font-weight:900}.pc-test{background:#fff5e8;color:#9b6722}.pc-title{font:900 23px Georgia;color:#355066;margin:10px 0 5px}.pc-meta{color:#788893;font-size:14px;line-height:1.6}.pc-stats{display:flex;gap:8px;flex-wrap:wrap;margin-top:13px}.pc-stat{background:#f4f7f8;border-radius:12px;padding:8px 10px;font-size:12px;font-weight:800;color:#5e7180}.pc-actions{display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end;align-content:start}.pc-btn{border:0;border-radius:12px;padding:10px 13px;font-weight:850;cursor:pointer;background:#eef4f5;color:#405d70}.pc-btn.primary{background:#e76f91;color:#fff}.pc-btn.danger{background:#fff0f0;color:#b54b55}.pc-empty{text-align:center;padding:55px 20px;color:#7c8b96}.pc-row{display:flex;justify-content:space-between;gap:16px;align-items:center;padding:15px 0;border-bottom:1px solid #edf0f1}.pc-row:last-child{border-bottom:0}.pc-code{font-family:ui-monospace,monospace;background:#f2f5f6;padding:6px 9px;border-radius:9px}.pc-note{padding:14px;border-radius:15px;background:#fff7e9;color:#865d25;font-size:13px;line-height:1.55}.pc-switch{width:46px;height:26px;border-radius:99px;background:#d9e0e3;position:relative;cursor:pointer}.pc-switch.on{background:#84cdbd}.pc-switch:after{content:"";position:absolute;width:20px;height:20px;background:#fff;border-radius:50%;top:3px;left:3px;transition:.2s}.pc-switch.on:after{left:23px}.pc-mobile-detailbar{display:none}@media(max-width:760px){
  .pc-overlay{padding:0;place-items:stretch;background:rgba(37,50,65,.48)}
  .pc-shell{width:100%;height:100dvh;max-height:none;border-radius:0;display:flex;flex-direction:column;overflow:hidden}
  .pc-side{flex:0 0 auto;padding:calc(14px + env(safe-area-inset-top)) 16px 14px;background:linear-gradient(165deg,#fff2f6,#eef9fa);display:block;border-bottom:1px solid rgba(69,88,104,.08)}
  .pc-brand{padding:0 58px 12px 2px;font-size:22px;line-height:1.2}
  .pc-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px;overflow:visible}
  .pc-nav button{min-width:0;white-space:normal;text-align:left;padding:12px 11px;border-radius:14px;font-size:13px;line-height:1.25;background:rgba(255,255,255,.58);overflow-wrap:anywhere}
  .pc-nav button.active{background:#fff;box-shadow:0 7px 18px rgba(65,84,101,.1)}
  .pc-close{position:absolute;right:14px;top:calc(12px + env(safe-area-inset-top));margin:0;padding:9px 12px;border-radius:999px;z-index:2}
  .pc-main{display:none;flex:1 1 auto;min-height:0;padding:22px 18px calc(28px + env(safe-area-inset-bottom));overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch}
  .pc-mobile-detailbar{display:none}
  .pc-shell.pc-detail .pc-side{display:none}
  .pc-shell.pc-detail .pc-mobile-detailbar{display:flex;flex:0 0 auto;align-items:center;justify-content:space-between;gap:12px;padding:calc(12px + env(safe-area-inset-top)) 14px 11px;background:linear-gradient(165deg,#fff2f6,#eef9fa);border-bottom:1px solid rgba(69,88,104,.08)}
  .pc-shell.pc-detail .pc-main{display:block}
  .pc-mobile-back,.pc-mobile-close{border:0;background:#fff;border-radius:999px;padding:10px 14px;font-weight:850;color:#405d70;box-shadow:0 6px 16px rgba(65,84,101,.08)}
  .pc-mobile-title{font:900 18px Georgia;color:#355066;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .pc-head{align-items:flex-start;margin-bottom:18px;gap:12px}
  .pc-head h2{font-size:32px;line-height:1.05}
  .pc-head p{font-size:15px;line-height:1.45}
  .pc-head>.pc-btn{flex:0 0 auto;padding:10px 12px}
  .pc-card{border-radius:20px;padding:17px}
  .pc-trip{grid-template-columns:1fr;gap:14px}
  .pc-actions{justify-content:flex-start;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));width:100%}
  .pc-actions .pc-btn{width:100%}
  .pc-row{align-items:flex-start;flex-wrap:wrap}
  .pc-row>.pc-code,.pc-row>span:last-child{max-width:100%;overflow-wrap:anywhere}
  .pc-title{font-size:22px;line-height:1.15}
  .pc-meta{font-size:14px}
  .pc-code{font-size:13px;word-break:break-all}
  .pc-stat{font-size:11px}
}
@media(max-width:390px){.pc-nav{grid-template-columns:1fr}.pc-side{padding-bottom:12px}.pc-main{padding-left:15px;padding-right:15px}.pc-head{display:block}.pc-head>.pc-btn{margin-top:12px}.pc-actions{grid-template-columns:1fr 1fr}}
  `;document.head.appendChild(s)}
  function shell(){
    css();
    let o=document.getElementById('pcOverlay');
    if(o)return o;
    o=document.createElement('div');
    o.id='pcOverlay';o.className='pc-overlay';o.hidden=true;
    o.innerHTML=`<div class="pc-shell"><aside class="pc-side"><div class="pc-brand">♡ Paris Profil</div><nav class="pc-nav"><button data-tab="profile">👤 Mein Profil</button><button data-tab="trips" class="active">❤️ Meine Reisen</button><button data-tab="people">👥 Teilnehmer</button><button data-tab="sync">☁️ Synchronisation</button><button data-tab="ambient">♫ Atmosphäre</button><button data-tab="settings">⚙️ Einstellungen</button><button data-tab="dev">🧪 Entwicklertools</button></nav><button class="pc-close" data-close>Schließen</button></aside><div class="pc-mobile-detailbar"><button class="pc-mobile-back" data-back>‹ Profil</button><div class="pc-mobile-title" data-mobile-title>Bereich</div><button class="pc-mobile-close" data-close-mobile>Schließen</button></div><main class="pc-main" data-content></main></div>`;
    document.body.appendChild(o);
    const close=()=>{o.hidden=true;o.querySelector('.pc-shell')?.classList.remove('pc-detail');document.documentElement.classList.remove('pc-open')};
    o.querySelector('[data-close]').onclick=close;
    o.querySelector('[data-close-mobile]').onclick=close;
    o.querySelector('[data-back]').onclick=()=>{o.querySelector('.pc-shell')?.classList.remove('pc-detail');o.querySelector('[data-content]').scrollTop=0};
    o.addEventListener('click',e=>{if(e.target===o)close()});
    o.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{
      o.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));
      o.querySelector('[data-mobile-title]').textContent=b.textContent.trim();
      if(matchMedia('(max-width:760px)').matches)o.querySelector('.pc-shell')?.classList.add('pc-detail');
      render(b.dataset.tab);
    });
    return o
  }
  async function stats(tripId){const c=window.ParisCloud?.client;if(!c)return{};const tables=[['gallery_photos','photos'],['live_moments','moments'],['budget_entries','expenses'],['day_closures','closures']];const out={};await Promise.all(tables.map(async([t,k])=>{try{const r=await c.from(t).select('*',{count:'exact',head:true}).eq('trip_id',tripId);out[k]=r.count||0}catch{out[k]=0}}));return out}
  async function render(tab='trips'){const o=shell(),c=o.querySelector('[data-content]'),id=current();if(tab==='trips'){c.innerHTML=`<div class="pc-head"><div><h2>Meine Reisen</h2><p>Aktive Reise wechseln, Einladungen öffnen und Testreisen aufräumen.</p></div><button class="pc-btn primary" data-new>＋ Neue Reise</button></div><div class="pc-grid" data-list><div class="pc-empty">Reisen werden geladen …</div></div>`;c.querySelector('[data-new]').onclick=()=>{if(confirm('Neue Reise einrichten? Die aktuelle Reise bleibt gespeichert.')){localStorage.removeItem(ID_KEY);location.reload()}};const list=registry();const box=c.querySelector('[data-list]');if(!list.length){box.innerHTML='<div class="pc-empty">Noch keine gespeicherten Reisen auf diesem Gerät.</div>';return}box.innerHTML='';for(const t of list){const s=await stats(t.tripId),empty=!s.photos&&!s.moments&&!s.expenses&&!s.closures,active=id?.tripId===t.tripId;const card=document.createElement('article');card.className='pc-card pc-trip';card.innerHTML=`<div><span class="pc-badge ${empty?'pc-test':''}">${active?'Aktiv':empty?'Leere Testreise':'Gespeichert'}</span><div class="pc-title">${esc(t.tripName||'Paris · Unser erster Hochzeitstag')}</div><div class="pc-meta">👤 ${esc(t.memberName)} · ${t.role==='owner'?'Reisebesitzer':'Mitreisend'}<br>Einladungscode: <span class="pc-code">${esc(t.joinCode||'–')}</span></div><div class="pc-stats"><span class="pc-stat">📷 ${s.photos||0} Fotos</span><span class="pc-stat">✨ ${s.moments||0} Momente</span><span class="pc-stat">💶 ${s.expenses||0} Ausgaben</span><span class="pc-stat">🌙 ${s.closures||0} Abschlüsse</span></div></div><div class="pc-actions">${active?'':'<button class="pc-btn primary" data-activate>Aktiv setzen</button>'}<button class="pc-btn" data-invite>Einladung</button><button class="pc-btn" data-rename>Umbenennen</button><button class="pc-btn danger" data-delete>Löschen</button></div>`;card.querySelector('[data-activate]')?.addEventListener('click',()=>{localStorage.setItem(ID_KEY,JSON.stringify(t));localStorage.setItem('parisSupabaseTripIdV2',t.tripId);location.reload()});card.querySelector('[data-invite]').onclick=()=>window.ParisOnboarding?.showInvite?.(t);card.querySelector('[data-rename]').onclick=()=>{const n=prompt('Name der Reise',t.tripName||'Paris · Unser erster Hochzeitstag');if(!n)return;t.tripName=n.trim().slice(0,80);saveRegistry(registry().map(x=>x.tripId===t.tripId?t:x));render('trips')};card.querySelector('[data-delete]').onclick=async()=>{const label=empty?'Diese leere Testreise löschen?':'Diese Reise enthält Daten. Wirklich aus dieser Übersicht entfernen?';if(!confirm(label))return;saveRegistry(registry().filter(x=>x.tripId!==t.tripId));if(active){localStorage.removeItem(ID_KEY);localStorage.removeItem('parisSupabaseTripIdV2');location.reload()}else render('trips')};box.appendChild(card)}}
  else if(tab==='profile'){c.innerHTML=`<div class="pc-head"><div><h2>Mein Profil</h2><p>Dieses Profil wird Einträgen auf diesem Gerät zugeordnet.</p></div></div><div class="pc-card"><div class="pc-row"><b>Name</b><span>${esc(id?.memberName||'Nicht eingerichtet')}</span></div><div class="pc-row"><b>Rolle</b><span>${id?.role==='owner'?'Reisebesitzer':'Mitreisend'}</span></div><div class="pc-row"><b>Reisemodus</b><span>${id?.mode==='solo'?'Alleine':'Gemeinsam'}</span></div><div class="pc-row"><b>Reise-ID</b><span class="pc-code">${esc(id?.tripId||'–')}</span></div></div>`}
  else if(tab==='people'){c.innerHTML=`<div class="pc-head"><div><h2>Teilnehmer</h2><p>Persönliche Zuordnung der verbundenen Geräte.</p></div></div><div class="pc-card"><div class="pc-row"><div><b>${esc(id?.memberName||'Dieses Gerät')}</b><div class="pc-meta">${id?.role==='owner'?'Reisebesitzer':'Mitreisend'}</div></div><span class="pc-badge">Dieses Gerät</span></div><div class="pc-note">Weitere Teilnehmer werden sichtbar, sobald sie mit ihrem Namen beitreten und einen Eintrag synchronisieren.</div></div>`}
  else if(tab==='sync'){const st=window.ParisCloudStatus||{status:document.documentElement.dataset.cloudSync||'connecting'};const ready=st.status==='ready';c.innerHTML=`<div class="pc-head"><div><h2>Synchronisation</h2><p>Status der gemeinsamen Cloud-Verbindung.</p></div></div><div class="pc-card"><div class="pc-row"><div><b>Verbindungsstatus</b><div class="pc-meta">${ready?'Eure gemeinsamen Inhalte werden automatisch synchronisiert.':'Die Verbindung wird geprüft oder ist derzeit nicht verfügbar.'}</div></div><span class="pc-badge ${ready?'':'pc-test'}">${ready?'● Gemeinsam verbunden':'● Nicht verbunden'}</span></div><div class="pc-row"><b>Aktive Reise</b><span>${esc(id?.tripName||'Paris')}</span></div><div class="pc-row"><b>Einladungscode</b><span class="pc-code">${esc(id?.joinCode||'–')}</span></div><div class="pc-row"><b>Realtime</b><span class="pc-badge ${ready?'':'pc-test'}">${ready?'Aktiv':'Inaktiv'}</span></div><div class="pc-row"><button class="pc-btn" data-invite-sync>Einladung anzeigen</button><button class="pc-btn" data-retry-sync>Verbindung neu prüfen</button></div></div>`;c.querySelector('[data-invite-sync]').onclick=()=>window.ParisOnboarding?.showInvite?.();c.querySelector('[data-retry-sync]').onclick=()=>location.reload()}

  else if(tab==='ambient'){
    const a=window.ParisAmbient;
    const state=a?.getState?.()||{enabled:localStorage.getItem('paris-ambient-enabled')==='1',volume:Number(localStorage.getItem('paris-ambient-volume')||.28),title:'Automatische Reiseatmosphäre'};
    const loc=window.ParisLocation?.getState?.()||{enabled:localStorage.getItem('parisLocationEnabledV1')==='1',status:'idle'};
    const locActive=loc.status==='active';
    const locBusy=loc.status==='requesting';
    c.innerHTML=`<div class="pc-head"><div><h2>Atmosphäre</h2><p>Musik, visuelle Stimmung und zentrale Standortfunktionen.</p></div></div>
      <div class="pc-card">
        <div class="pc-row"><div><b>Atmosphäre</b><div class="pc-meta" data-ambient-state>${state.enabled?'Aktiv · '+esc(state.title||'passend zur Reisephase'):'Ausgeschaltet'}</div></div><div class="pc-switch ${state.enabled?'on':''}" data-ambient-switch role="switch" aria-checked="${state.enabled}"></div></div>
        <div class="pc-row" style="display:block"><b>Lautstärke</b><input data-ambient-volume type="range" min="0.05" max="0.55" step="0.01" value="${state.volume||.28}" style="width:100%;margin-top:14px"></div>
      </div>
      <div class="pc-card" style="margin-top:14px">
        <div class="pc-row"><div><b>📍 Standortfunktionen</b><div class="pc-meta" data-location-copy>${locActive?'Aktiv – Live Moments, Atmosphäre und Reisehinweise nutzen euren Standort.':locBusy?'Standort wird angefragt …':'Einmal aktivieren und alle standortabhängigen Funktionen der App verwenden.'}</div></div><span class="pc-badge ${locActive?'':'pc-test'}" data-location-badge>${locActive?'Aktiv':locBusy?'Wird aktiviert':'Aus'}</span></div>
        <div class="pc-note">Die Freigabe gilt zentral für <b>Live Moments</b>, die automatische <b>Atmosphäre</b>, dynamische Reisehinweise und standortabhängige Darstellungen. Der Standort wird nur auf diesem Gerät verarbeitet.</div>
        ${locActive?`<div class="pc-row"><div><b>Aktueller Standort</b><div class="pc-meta" data-current-place>${esc(loc.place?.label||'Ort wird ermittelt …')}</div></div><span class="pc-badge" data-current-accuracy>± ${Math.round(loc.position?.accuracy||0)} m</span></div><div class="pc-row"><div><b>Letzte Aktualisierung</b><div class="pc-meta" data-current-updated>${loc.position?.ts?new Date(loc.position.ts).toLocaleString('de-DE',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}):'–'}</div></div><button class="pc-btn" data-location-refresh>Neu bestimmen</button></div>`:''}
        <div class="pc-row"><button class="pc-btn ${locActive?'danger':'primary'}" data-location-toggle>${locActive?'Standort deaktivieren':'📍 Standort jetzt aktivieren'}</button></div>
        <div class="pc-note" data-location-error style="display:${loc.error?'block':'none'};margin-top:12px">${esc(loc.error||'')}</div>
      </div>`;
    const sw=c.querySelector('[data-ambient-switch]');
    sw.onclick=async()=>{await a?.toggle?.();const ns=a?.getState?.()||{};sw.classList.toggle('on',!!ns.enabled);sw.setAttribute('aria-checked',String(!!ns.enabled));c.querySelector('[data-ambient-state]').textContent=ns.enabled?'Aktiv · '+(ns.title||'passend zur Reisephase'):'Ausgeschaltet'};
    c.querySelector('[data-ambient-volume]').oninput=e=>a?.setVolume?.(Number(e.target.value));
    const applyCurrentLocation=()=>{
      const latest=window.ParisLocation?.getState?.();
      if(!latest?.position)return;
      const placeNode=c.querySelector('[data-current-place]');
      const accuracyNode=c.querySelector('[data-current-accuracy]');
      const updatedNode=c.querySelector('[data-current-updated]');
      if(placeNode)placeNode.textContent=latest.place?.label||`${latest.position.latitude.toFixed(5)}, ${latest.position.longitude.toFixed(5)}`;
      if(accuracyNode)accuracyNode.textContent=`± ${Math.round(latest.position.accuracy||0)} m`;
      if(updatedNode)updatedNode.textContent=latest.position.ts?new Date(latest.position.ts).toLocaleString('de-DE',{hour:'2-digit',minute:'2-digit',day:'2-digit',month:'2-digit'}):'–';
    };
    applyCurrentLocation();
    if(locActive&&loc.position&&!loc.place){
      window.ParisLocation?.refreshPlace?.().then(applyCurrentLocation).catch(applyCurrentLocation);
    }
    c.querySelector('[data-location-refresh]')?.addEventListener('click',async e=>{const b=e.currentTarget;b.disabled=true;b.textContent='Wird bestimmt …';try{await window.ParisLocation?.refreshPlace?.();render('ambient')}catch{b.disabled=false;b.textContent='Erneut versuchen'}});
    c.querySelector('[data-location-toggle]').onclick=async e=>{
      const button=e.currentTarget, service=window.ParisLocation;
      if(!service){alert('Die Standortfunktion ist noch nicht geladen. Bitte die Seite einmal neu laden.');return}
      const before=service.getState();
      if(before.enabled&&before.status==='active'){service.disable();render('ambient');return}
      button.disabled=true;button.textContent='Standort wird angefragt …';
      try{await service.enable();render('ambient')}
      catch(error){const ns=service.getState();button.disabled=false;button.textContent='Erneut versuchen';const err=c.querySelector('[data-location-error]');err.style.display='block';err.textContent=ns.error||'Standort konnte nicht aktiviert werden. Prüfe die Standortberechtigung dieser Website im verwendeten Browser.'}
    };
  }
  else if(tab==='settings'){c.innerHTML=`<div class="pc-head"><div><h2>Einstellungen</h2><p>Verhalten dieses Geräts.</p></div></div><div class="pc-card"><div class="pc-row"><div><b>Entwicklermodus</b><div class="pc-meta">Technische Informationen und lokale Reset-Werkzeuge anzeigen.</div></div><div class="pc-switch ${localStorage.getItem(DEV_KEY)==='1'?'on':''}" data-devswitch></div></div></div>`;c.querySelector('[data-devswitch]').onclick=e=>{const on=!e.currentTarget.classList.contains('on');e.currentTarget.classList.toggle('on',on);localStorage.setItem(DEV_KEY,on?'1':'0')}}
  else {c.innerHTML=`<div class="pc-head"><div><h2>Entwicklertools</h2><p>Werkzeuge für Tests auf Browsern und PWA-Geräten.</p></div></div><div class="pc-card"><div class="pc-row"><b>tripId</b><span class="pc-code">${esc(id?.tripId||'–')}</span></div><div class="pc-row"><b>userId</b><span class="pc-code">${esc(window.ParisCloud?.userId||'anonym')}</span></div><div class="pc-row"><b>Service Worker</b><span>${navigator.serviceWorker?.controller?'Aktiv':'Nicht aktiv'}</span></div><div class="pc-row"><button class="pc-btn" data-cache>Cache leeren</button><button class="pc-btn danger" data-reset>Lokales Profil zurücksetzen</button></div></div><div class="pc-note" style="margin-top:14px">Inkognito-Fenster besitzen jeweils eine eigene anonyme Anmeldung. Reisen aus bereits geschlossenen Inkognito-Sitzungen können deshalb nicht automatisch diesem Gerät zugeordnet werden.</div>`;c.querySelector('[data-cache]').onclick=async()=>{for(const k of await caches.keys())await caches.delete(k);alert('Cache wurde geleert.');location.reload()};c.querySelector('[data-reset]').onclick=()=>{if(confirm('Lokales Profil und Reiseauswahl zurücksetzen? Cloud-Daten bleiben erhalten.')){localStorage.removeItem(ID_KEY);localStorage.removeItem('parisSupabaseTripIdV2');location.reload()}}}}
  function open(tab='trips'){
    const o=shell();o.hidden=false;document.documentElement.classList.add('pc-open');
    const mobile=matchMedia('(max-width:760px)').matches;
    if(mobile){
      o.querySelector('.pc-shell')?.classList.remove('pc-detail');
      o.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x.dataset.tab===tab));
      o.querySelector('[data-mobile-title]').textContent=o.querySelector(`[data-tab="${tab}"]`)?.textContent.trim()||'Profil';
    }else render(tab)
  }
  function mountButton(){if(document.querySelector('.pc-fab'))return;css();const b=document.createElement('button');b.className='pc-fab';b.type='button';b.title='Profil und Reisen';b.setAttribute('aria-label','Profil und Reisen öffnen');b.innerHTML='<span class="pc-fab-icon">♡</span><span class="pc-fab-label">Profil</span>';b.onclick=()=>open('trips');document.body.appendChild(b)}if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mountButton,{once:true});else mountButton();
  window.ParisProfileCenter={open,register};
})();
