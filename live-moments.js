(() => {
  'use strict';
  const START = new Date('2026-07-31T00:00:00+02:00');
  const END = new Date('2026-08-03T00:00:00+02:00');
  const MEMORY_KEY = 'parisLiveMomentsV2';
  const LOC_KEY = 'parisSharedLocationV1';
  const MODE_KEY = 'parisLiveMomentsModeV1';
  const TEST_SCENE_KEY = 'parisLiveMomentsTestSceneV1';
  const locations = [
    {id:'hotel',name:'Hôtel de Berny',lat:48.7618,lng:2.3048,radius:650,icon:'🏨',fact:'Euer ruhiger Ausgangspunkt südlich von Paris.',phrase:'Nous avons une réservation au nom de Klaas.',translation:'Wir haben eine Reservierung auf den Namen Klaas.',photo:'Haltet den ersten Ankunftsmoment mit Gepäck und Livi fest.'},
    {id:'eiffel',name:'Eiffelturm',lat:48.85837,lng:2.29448,radius:850,icon:'🗼',fact:'Der schönste Blick öffnet sich vom Trocadéro.',phrase:'Une photo, s’il vous plaît.',translation:'Ein Foto, bitte.',photo:'Für ein ruhiges Familienfoto ein Stück Richtung Trocadéro gehen.'},
    {id:'louvre',name:'Louvre',lat:48.86061,lng:2.33764,radius:700,icon:'🏛️',fact:'Die Glaspyramide wirkt morgens und zum Abendlicht besonders elegant.',phrase:'Où est l’entrée, s’il vous plaît ?',translation:'Wo ist der Eingang, bitte?',photo:'Symmetrisch vor der Pyramide fotografieren und etwas Boden im Bild lassen.'},
    {id:'seine',name:'Seine',lat:48.8588,lng:2.3166,radius:900,icon:'⛵',fact:'An den Ufern wird Paris sofort ruhiger und filmischer.',phrase:'Nous aimerions nous promener au bord de la Seine.',translation:'Wir würden gern an der Seine spazieren.',photo:'Fotografiert gegen das weiche Abendlicht mit Brücke im Hintergrund.'},
    {id:'montmartre',name:'Montmartre',lat:48.8867,lng:2.3431,radius:950,icon:'🎨',fact:'Kleine Seitenstraßen wirken oft schöner als der belebte Hauptplatz.',phrase:'C’est très joli ici.',translation:'Es ist sehr schön hier.',photo:'Nutzt Häuserfluchten und Treppen als natürliche Rahmung.'},
    {id:'disney',name:'Disneyland Paris',lat:48.8722,lng:2.7758,radius:1800,icon:'🏰',fact:'Heute wird aus einem Reisetag ein Familienmärchen.',phrase:'Où est l’espace bébé, s’il vous plaît ?',translation:'Wo ist der Babybereich, bitte?',photo:'Das Schloss leicht seitlich aufnehmen, damit Liv und ihr genug Platz im Bild habt.'}
  ];
  const timelineIds=['hotel','eiffel','louvre','seine','disney'];
  let watchId=null, activeSince=0, current=null, preview='pretrip', testMode=false;
  const $=s=>document.querySelector(s);
  const els={};
  const distance=(a,b,c,d)=>{const R=6371000,p=x=>x*Math.PI/180,dp=p(c-a),dl=p(d-b),q=Math.sin(dp/2)**2+Math.cos(p(a))*Math.cos(p(c))*Math.sin(dl/2)**2;return 2*R*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));};
  const memories=()=>{try{return JSON.parse(localStorage.getItem(MEMORY_KEY)||'[]')}catch{return[]}};
  function saveMemory(type,title,detail){const all=memories();all.unshift({id:Date.now(),type,title,detail,createdAt:new Date().toISOString(),location:current?.id||null});localStorage.setItem(MEMORY_KEY,JSON.stringify(all.slice(0,80)));document.dispatchEvent(new CustomEvent('paris:memory-added',{detail:all[0]}));}
  function phase(){const n=new Date();if(testMode)return preview;if(n<START)return'pretrip';if(n<END)return'trip';return'after';}
  function nearest(lat,lng){let best=null;locations.forEach(l=>{const d=distance(lat,lng,l.lat,l.lng);if(!best||d<best.d)best={...l,d}});return best&&best.d<=best.radius?best:null;}
  function illustration(mode,loc){const icon=loc?.icon||(mode==='pretrip'?'🧳':mode==='drive'?'🚗':mode==='after'?'📖':'✨');return `<svg viewBox="0 0 320 210" aria-hidden="true"><defs><linearGradient id="lmSky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff6df"/><stop offset="1" stop-color="#dff0f2"/></linearGradient></defs><circle cx="160" cy="105" r="92" fill="url(#lmSky)"/><path d="M44 181 Q160 135 278 181" fill="none" stroke="#dcae80" stroke-width="15" stroke-linecap="round"/><path d="M160 43l-30 126m30-126 30 126m-48-46h36m-46 30h56m-66 20h77" stroke="#916b64" stroke-width="5" fill="none" stroke-linecap="round"/><circle cx="74" cy="70" r="20" fill="#fff" opacity=".75"/><circle cx="250" cy="82" r="15" fill="#fff" opacity=".75"/><text x="226" y="151" font-size="48">${icon}</text><path d="M65 112c0-14 18-17 24-4 7-13 25-10 25 4 0 15-25 28-25 28S65 127 65 112Z" fill="#ef7890"/></svg>`}
  function setCards(cards){els.grid.innerHTML=cards.map(c=>`<article class="live-moment-card"><div class="live-moment-card-icon">${c.icon}</div><small>${c.label}</small><strong>${c.title}</strong><p>${c.text}</p></article>`).join('');}
  function timeline(activeId){const seen=new Set(memories().map(m=>m.location));els.timeline.innerHTML=timelineIds.map(id=>{const l=locations.find(x=>x.id===id),cls=id===activeId?'is-active':seen.has(id)?'is-done':'';return `<div class="live-stop ${cls}"><span class="live-stop-dot"></span>${l.name.replace('Hôtel de Berny','Hotel').replace('Disneyland Paris','Disneyland')}</div>`}).join('');}
  function render(){const p=phase();els.stay.classList.remove('is-visible');let title,intro,eyebrow,cards,actions='';if(p==='pretrip'){
      title='Noch seid ihr zuhause – aber Paris rückt näher.';intro=`In ${Math.max(1,Math.ceil((START-new Date())/86400000))} Tagen beginnt euer gemeinsames Abenteuer. Heute könnt ihr schon kleine Dinge erledigen, die unterwegs Ruhe schaffen.`;eyebrow='🧳 Vorfreude auf Paris';cards=[{icon:'🌤️',label:'Wetter',title:'Paris im Blick behalten',text:'Kurz vor der Abfahrt wird die Prognose automatisch wichtiger.'},{icon:'🗣️',label:'Sprachcoach',title:'Drei Sätze reichen schon',text:'Begrüßung, Bestellung und eine höfliche Frage üben.'},{icon:'🎒',label:'Vorbereiten',title:'Packliste & Tickets',text:'Dokumente und Reservierungen zusätzlich offline sichern.'},{icon:'❤️',label:'Vorfreude',title:'Lieblingsorte ansehen',text:'Eiffelturm, Seine und Disneyland gemeinsam entdecken.'}];actions='<button class="live-moment-btn primary" data-action="gps">📍 Live-Modus für die Reise vorbereiten</button><a class="live-moment-btn secondary" href="#sprachcoach">🗣️ Jetzt kurz üben</a>';
    }else if(p==='drive'){title='Ihr seid auf dem Weg nach Paris.';intro='Der Live Moment begleitet euch auf der Fahrt und wechselt automatisch, sobald ihr euch Paris nähert.';eyebrow='🚗 Unterwegs';cards=[{icon:'🔋',label:'Fahrt',title:'Ladepausen ruhig planen',text:'Reichweite und nächste Pause rechtzeitig im Blick behalten.'},{icon:'🌦️',label:'Am Ziel',title:'Wetter in Paris',text:'Die Zielprognose ist wichtiger als das Wetter unterwegs.'},{icon:'🎫',label:'Bereit',title:'Tickets griffbereit',text:'Hotel und Reservierungen offline öffnen können.'},{icon:'❤️',label:'Moment',title:'Die Reise beginnt jetzt',text:'Auch die Fahrt gehört schon zu eurer Erinnerung.'}];actions='<button class="live-moment-btn primary" data-action="gps">📍 Standort aktivieren</button>';
    }else if(p==='after'){title='Eure Live Moments sind jetzt Erinnerungen.';intro='Besuchte Orte und gemerkte Augenblicke bleiben lokal gespeichert und können später in Galerie, Revue und Reisebuch einfließen.';eyebrow='📖 Nach der Reise';cards=[{icon:'❤️',label:'Gesammelt',title:`${memories().length} Erinnerungsmomente`,text:'Kleine Augenblicke, die ihr bewusst festgehalten habt.'},{icon:'📸',label:'Fotos',title:'Intelligente Fotomomente',text:'Zusammengehörige Bilder werden als kleine Erlebnisse erkannt.'},{icon:'🎬',label:'Revue',title:'Noch einmal erleben',text:'Eure Reise filmisch und in Ruhe ansehen.'},{icon:'📖',label:'Reisebuch',title:'Alles an einem Ort',text:'Fotos, Notizen und Momente ergeben eure Geschichte.'}];actions='<a class="live-moment-btn primary" href="#reise-revue">🎬 Revue ansehen</a><a class="live-moment-btn secondary" href="#reisegalerie">📸 Galerie öffnen</a>';
    }else if(current){title=`Ihr seid gerade am ${current.name==='Seine'?'Ufer der Seine':current.name}.`;intro=current.fact;eyebrow=`📍 Live erkannt · ${Math.round(current.d)} m entfernt`;cards=[{icon:'📸',label:'Fototipp',title:'Diesen Blick festhalten',text:current.photo},{icon:'🗣️',label:'Passender Satz',title:current.phrase,text:current.translation},{icon:'☀️',label:'Jetzt',title:'Licht & Atmosphäre',text:'Nehmt euch einen ruhigen Moment, bevor ihr weitergeht.'},{icon:'⭐',label:'Erinnerung',title:'Diesen Moment merken',text:'Der Ort wird lokal für Revue und Reisebuch gespeichert.'}];actions='<button class="live-moment-btn primary" data-action="remember">❤️ Diesen Moment merken</button><a class="live-moment-btn secondary" href="#reisegalerie">📸 Polaroid auswählen</a>';if(activeSince&&Date.now()-activeSince>600000)els.stay.classList.add('is-visible');
    }else{title='Paris ist jetzt ganz nah – Live Moments wartet auf euren Standort.';intro='Aktiviert den Standort freiwillig. Die Erkennung läuft ausschließlich auf eurem Gerät und zeigt passende Hinweise, sobald ihr an einem Reiseort seid.';eyebrow='✨ Live Moment';cards=[{icon:'📍',label:'Standort',title:'Ort automatisch erkennen',text:'Nur während die Seite geöffnet ist und nur nach eurer Freigabe.'},{icon:'📸',label:'Fototipp',title:'Passend zum Ort',text:'Ruhige Perspektiven für Familien- und Erinnerungsfotos.'},{icon:'🗣️',label:'Sprache',title:'Der richtige Satz',text:'Genau die Formulierung, die an diesem Ort helfen kann.'},{icon:'❤️',label:'Moment',title:'Bewusst festhalten',text:'Ein Klick speichert den Augenblick lokal.'}];actions='<button class="live-moment-btn primary" data-action="gps">📍 Standort aktivieren</button>'}
    els.eyebrow.textContent=eyebrow;els.title.textContent=title;els.intro.textContent=intro;els.illustration.innerHTML=illustration(p,current);els.actions.innerHTML=actions;setCards(cards);timeline(current?.id);els.phase.textContent=p==='pretrip'?'Vor der Reise':p==='after'?'Erinnerungsmodus':current?'Live in Paris':'Reisetag';bindActions();
  }
  function bindActions(){els.actions.querySelector('[data-action="gps"]')?.addEventListener('click',startGPS);els.actions.querySelector('[data-action="remember"]')?.addEventListener('click',()=>{saveMemory('place',current.name,current.fact);const b=els.actions.querySelector('[data-action="remember"]');b.textContent='✓ Moment gespeichert';b.disabled=true;timeline(current.id)});}
  function startGPS(){if(!navigator.geolocation){alert('Standort ist in diesem Browser nicht verfügbar.');return}if(watchId!==null)return;navigator.geolocation.getCurrentPosition(onPosition,onGeoError,{enableHighAccuracy:true,timeout:12000,maximumAge:20000});watchId=navigator.geolocation.watchPosition(onPosition,onGeoError,{enableHighAccuracy:true,maximumAge:30000,timeout:20000});}
  function onPosition(pos){const {latitude,longitude}=pos.coords;localStorage.setItem(LOC_KEY,JSON.stringify({lat:latitude,lng:longitude,at:Date.now()}));const found=nearest(latitude,longitude);if(found?.id!==current?.id){current=found;activeSince=found?Date.now():0}render()}
  function onGeoError(){els.intro.textContent='Der Standort konnte gerade nicht gelesen werden. Ihr könnt den Live-Modus später erneut aktivieren.'}
  function setMode(mode, shouldRender=true){
    testMode=mode==='test';
    localStorage.setItem(MODE_KEY,testMode?'test':'auto');
    els.section?.querySelector('.live-moment-shell')?.classList.toggle('is-test-mode',testMode);
    els.testScenarios.hidden=!testMode;
    els.modeRadios.forEach(r=>r.checked=r.value===(testMode?'test':'auto'));
    if(!testMode){current=null;activeSince=0;}
    else applyTestScene(preview,false);
    if(shouldRender)render();
  }
  function applyTestScene(value, shouldRender=true){
    preview=value||'pretrip';
    localStorage.setItem(TEST_SCENE_KEY,preview);
    if(els.preview)els.preview.value=preview;
    current=preview.startsWith('loc:')?locations.find(l=>l.id===preview.slice(4)):null;
    if(current)current={...current,d:35};
    activeSince=current?Date.now()-660000:0;
    if(shouldRender)render();
  }
  function closeTools(){els.toolsPanel.hidden=true;els.toolsButton.setAttribute('aria-expanded','false')}
  function openTools(){els.toolsPanel.hidden=false;els.toolsButton.setAttribute('aria-expanded','true')}
  function init(){
    Object.assign(els,{section:$('#live-moments'),phase:$('#liveMomentPhase'),eyebrow:$('#liveMomentEyebrow'),title:$('#liveMomentTitle'),intro:$('#liveMomentIntro'),illustration:$('#liveMomentIllustration'),grid:$('#liveMomentGrid'),actions:$('#liveMomentActions'),timeline:$('#liveMomentTimeline'),stay:$('#liveMomentStay'),preview:$('#liveMomentPreview'),toolsButton:$('#liveMomentToolsButton'),toolsPanel:$('#liveMomentToolsPanel'),toolsClose:$('#liveMomentToolsClose'),testScenarios:$('#liveMomentTestScenarios'),autoReturn:$('#liveMomentAutoReturn'),modeRadios:[...document.querySelectorAll('input[name="liveMomentMode"]')]});
    if(!els.section)return;
    preview=localStorage.getItem(TEST_SCENE_KEY)||'pretrip';
    if(![...els.preview.options].some(o=>o.value===preview))preview='pretrip';
    testMode=localStorage.getItem(MODE_KEY)==='test';
    els.preview.value=preview;
    els.preview.addEventListener('change',e=>applyTestScene(e.target.value));
    els.modeRadios.forEach(r=>r.addEventListener('change',()=>setMode(r.value)));
    els.toolsButton.addEventListener('click',()=>els.toolsPanel.hidden?openTools():closeTools());
    els.toolsClose.addEventListener('click',closeTools);
    els.autoReturn.addEventListener('click',()=>{setMode('auto');closeTools()});
    document.addEventListener('click',e=>{if(!els.toolsPanel.hidden&&!e.target.closest('.live-moment-tools'))closeTools()});
    document.addEventListener('keydown',e=>{if(e.key==='Escape')closeTools()});
    setMode(testMode?'test':'auto',false);
    document.addEventListener('paris:cloud-updated',e=>{if(e.detail?.key===MEMORY_KEY)render()});
    render();
    setInterval(()=>{if(!testMode)render()},60000)
  }
  document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init,{once:true}):init();
})();
