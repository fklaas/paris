(function(){
  'use strict';
  const root=document.getElementById('travelAssistant');
  if(!root) return;
  const $=id=>document.getElementById(id);
  const TZ='Europe/Paris';
  const tripStart=new Date('2026-07-31T00:00:00+02:00');
  const tripEnd=new Date('2026-08-03T00:00:00+02:00');
  const parisCenter=[48.8566,2.3522];
  const disneyCenter=[48.8722,2.7758];
  const locationKey='paris-shared-location-v1';

  const events=[
    {at:'2026-07-31T02:00:00+02:00',icon:'🚗',title:'Abfahrt nach Paris',text:'Von Meppen aus startet euer Jubiläumsabenteuer.',tag:'Start'},
    {at:'2026-07-31T15:00:00+02:00',icon:'🏨',title:'Ankunft am Hôtel de Berny',text:'In Ruhe ankommen, einchecken und alles für den Abend vorbereiten.',tag:'Ankunft'},
    {at:'2026-07-31T19:00:00+02:00',icon:'🌇',title:'Perruche Rooftop',text:'Reservierung um 19:00 Uhr – mit etwas Zeitpuffer losfahren.',tag:'19:00 Uhr'},
    {at:'2026-08-01T09:30:00+02:00',icon:'🏰',title:'Disneyland Paris',text:'Ein ganzer Tag voller Disney-Magie als kleine Familie.',tag:'Disney-Tag'},
    {at:'2026-08-02T11:00:00+02:00',icon:'🧳',title:'Check-out',text:'Zimmer, Bad und Steckdosen vor der Abfahrt noch einmal prüfen.',tag:'Bis 11:00'},
    {at:'2026-08-02T17:30:00+02:00',icon:'🍝',title:'Dinner im Elio',text:'Euer letzter besonderer Paris-Moment vor der Heimfahrt.',tag:'17:30 Uhr'},
    {at:'2026-08-02T20:00:00+02:00',icon:'🚗',title:'Heimfahrt nach Meppen',text:'Ladeplanung prüfen und Paris mit vielen Erinnerungen verlassen.',tag:'Heimreise'}
  ];

  const prepTasks=[
    [['📱','Disneyland- und Verkehrs-App installieren','info'],['🗺️','Offlinekarten für Paris und die Strecke speichern','info'],['🔋','Powerbank und Ladekabel bereitlegen','soon'],['🪪','Ausweise, Führerschein und Tickets prüfen','important']],
    [['🏨','Hoteladresse und Buchungsbestätigung offline sichern','important'],['🍝','Reservierungen bei Perruche und Elio prüfen','soon'],['🍼','Livi-Reisebedarf in einer eigenen Liste sammeln','info'],['⚡','Ladekarten und Lade-Apps auf beiden iPhones testen','info']],
    [['🎟️','Disneyland-Tickets lokal auf beiden Geräten speichern','important'],['🧳','Erste Kleidung und Baby-Ersatzsachen bereitlegen','soon'],['🇫🇷','Drei Sätze für Hotel und Restaurant üben','info'],['📷','Genügend freien Speicher für Fotos schaffen','info']]
  ];

  const illustrations={
    prep:`<svg viewBox="0 0 320 220"><defs><linearGradient id="aSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff8e9"/><stop offset="1" stop-color="#dceff2"/></linearGradient><linearGradient id="aRoad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#dcae80"/><stop offset="1" stop-color="#b97d77"/></linearGradient></defs><circle cx="170" cy="108" r="92" fill="url(#aSky)"/><g fill="#fff" opacity=".9"><ellipse cx="87" cy="63" rx="31" ry="12"/><ellipse cx="109" cy="58" rx="19" ry="14"/><ellipse cx="245" cy="73" rx="29" ry="11"/></g><path d="M25 196 Q119 154 294 188" fill="none" stroke="url(#aRoad)" stroke-width="20" stroke-linecap="round"/><path d="M159 42 L127 168 M159 42 L191 168 M139 116 H179 M130 146 H188 M118 170 H201" fill="none" stroke="#966e63" stroke-width="5" stroke-linecap="round"/><path d="M159 32l9 9-9 9-9-9z" fill="#efbd62"/><g transform="translate(205 137)"><rect width="66" height="43" rx="13" fill="#fff"/><rect x="8" y="8" width="50" height="19" rx="7" fill="#dceff2"/><circle cx="15" cy="45" r="7" fill="#5f5158"/><circle cx="52" cy="45" r="7" fill="#5f5158"/><path d="M18 12h24l9 13H9z" fill="#e59a9b"/></g><path d="M69 103c0-11 14-14 20-3 5-11 20-8 20 3 0 12-20 23-20 23s-20-11-20-23z" fill="#ef7890"/></svg>`,
    travel:`<svg viewBox="0 0 320 220"><defs><linearGradient id="tSky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff5df"/><stop offset="1" stop-color="#dceff2"/></linearGradient></defs><circle cx="165" cy="107" r="92" fill="url(#tSky)"/><path d="M18 194 Q105 139 304 184" fill="none" stroke="#c68d75" stroke-width="22" stroke-linecap="round"/><path d="M163 39l-31 128m31-128 31 128m-51-52h40m-49 30h58m-69 25h80" fill="none" stroke="#9a7267" stroke-width="4.5" stroke-linecap="round"/><g transform="translate(73 142)"><rect width="73" height="42" rx="13" fill="#fff"/><path d="M14 12h35l12 16H5z" fill="#e59a9b"/><circle cx="16" cy="44" r="7" fill="#554b52"/><circle cx="57" cy="44" r="7" fill="#554b52"/></g><path d="M40 70h58" stroke="#fff" stroke-width="12" stroke-linecap="round" opacity=".9"/><circle cx="267" cy="57" r="17" fill="#efbd62" opacity=".88"/><path d="M151 181h38" stroke="#fff9e8" stroke-width="3" stroke-dasharray="7 7"/></svg>`,
    paris:`<svg viewBox="0 0 320 220"><defs><linearGradient id="pSky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#fff3da"/><stop offset="1" stop-color="#d8edf1"/></linearGradient></defs><circle cx="163" cy="108" r="94" fill="url(#pSky)"/><circle cx="244" cy="55" r="18" fill="#efbd62" opacity=".9"/><path d="M159 35l-34 139m34-139 34 139m-55-58h43m-53 33h62m-76 29h91" fill="none" stroke="#8e675e" stroke-width="5" stroke-linecap="round"/><path d="M24 190q128-33 276 0" fill="none" stroke="#c98b7a" stroke-width="18" stroke-linecap="round"/><g fill="#fff" opacity=".85"><ellipse cx="80" cy="67" rx="28" ry="10"/><ellipse cx="98" cy="61" rx="16" ry="12"/></g><path d="M224 121c0-9 11-12 17-3 4-9 16-6 16 3 0 10-16 18-16 18s-17-8-17-18z" fill="#ef7890"/><g fill="#f7d476"><circle cx="151" cy="72" r="2.6"/><circle cx="170" cy="102" r="2.6"/><circle cx="143" cy="134" r="2.6"/><circle cx="184" cy="151" r="2.6"/></g></svg>`,
    disney:`<svg viewBox="0 0 320 220"><defs><linearGradient id="dSky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f9eafa"/><stop offset="1" stop-color="#d9edf5"/></linearGradient></defs><circle cx="160" cy="108" r="94" fill="url(#dSky)"/><path d="M53 184h215" stroke="#b37a8f" stroke-width="15" stroke-linecap="round"/><g fill="#f6c6d7" stroke="#765e82" stroke-width="3"><path d="M92 178v-61l18-16 17 16v61z"/><path d="M129 178V89l30-29 31 29v89z"/><path d="M193 178v-66l18-16 18 16v66z"/></g><g fill="#806aa1"><path d="M102 101l8-27 8 27z"/><path d="M145 63l14-39 15 39z"/><path d="M202 96l9-29 9 29z"/></g><path d="M148 178v-32q11-18 23 0v32" fill="#765e82"/><g fill="#efbd62"><circle cx="57" cy="68" r="4"/><circle cx="247" cy="58" r="3"/><circle cx="267" cy="104" r="4"/><circle cx="78" cy="111" r="3"/></g><path d="M53 51q12-22 24 0-12 15-24 0zm190 85q12-22 24 0-12 15-24 0z" fill="#ef7890" opacity=".8"/></svg>`,
    home:`<svg viewBox="0 0 320 220"><defs><linearGradient id="hSky" x1="0" y1="0" x2="0" y2="1"><stop stop-color="#f8d9c9"/><stop offset=".55" stop-color="#d5c7d8"/><stop offset="1" stop-color="#a9c4cf"/></linearGradient></defs><circle cx="160" cy="108" r="94" fill="url(#hSky)"/><circle cx="242" cy="65" r="24" fill="#f0b76e" opacity=".85"/><path d="M158 49l-27 115m27-115 27 115m-44-48h35m-42 28h49m-60 24h72" fill="none" stroke="#705d65" stroke-width="4.5" stroke-linecap="round" opacity=".9"/><path d="M18 190q120-38 286 0" fill="none" stroke="#9d7474" stroke-width="20" stroke-linecap="round"/><g transform="translate(210 143)"><rect width="67" height="40" rx="12" fill="#fff"/><path d="M13 11h34l11 15H5z" fill="#d9878f"/><circle cx="15" cy="42" r="7" fill="#51474e"/><circle cx="53" cy="42" r="7" fill="#51474e"/></g><path d="M48 79h53" stroke="#fff" stroke-width="10" stroke-linecap="round" opacity=".55"/></svg>`
  };

  let lastPhase='';
  let lastIllustration='';
  function parisNow(){return new Date();}
  function dateKey(d){return new Intl.DateTimeFormat('sv-SE',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit'}).format(d);}
  function hour(d){return Number(new Intl.DateTimeFormat('en-GB',{timeZone:TZ,hour:'2-digit',hour12:false}).format(d));}
  function duration(ms){if(ms<=0)return 'Jetzt';const min=Math.floor(ms/60000),days=Math.floor(min/1440),hours=Math.floor((min%1440)/60),mins=min%60;if(days)return `in ${days} ${days===1?'Tag':'Tagen'}`;if(hours)return `in ${hours} Std.${mins?' '+mins+' Min.':''}`;return `in ${Math.max(1,mins)} Min.`;}
  function distance(a,b,c,d){const R=6371000,toRad=x=>x*Math.PI/180,da=toRad(c-a),db=toRad(d-b),q=Math.sin(da/2)**2+Math.cos(toRad(a))*Math.cos(toRad(c))*Math.sin(db/2)**2;return 2*R*Math.asin(Math.sqrt(q));}
  function getLocation(){try{const x=JSON.parse(localStorage.getItem(locationKey)||'null');if(x&&Date.now()-x.ts<21600000)return x;}catch(e){}return null;}
  function context(d){
    const key=dateKey(d),h=hour(d),loc=getLocation();
    if(d<tripStart)return {phase:'prep',status:'Vorbereitung',illustration:'prep'};
    if(d>=tripEnd)return {phase:'home',status:'Erinnerungen',illustration:'home'};
    if(key==='2026-07-31'){
      const inParis=loc&&distance(loc.latitude,loc.longitude,...parisCenter)<50000;
      if(!inParis && h<14)return {phase:'travel',status:'Unterwegs',illustration:'travel'};
      if(h>=18)return {phase:'evening',status:'Paris am Abend',illustration:'paris'};
      return {phase:'paris',status:'In Paris',illustration:'paris'};
    }
    if(key==='2026-08-01'){
      const atDisney=loc&&distance(loc.latitude,loc.longitude,...disneyCenter)<3500;
      if(atDisney||h>=7&&h<23)return {phase:'disney',status:'Disneyland',illustration:'disney'};
      return {phase:'anniversary',status:'Hochzeitstag',illustration:'paris'};
    }
    if(key==='2026-08-02'){
      if(h>=19)return {phase:'home',status:'Heimreise',illustration:'home'};
      if(h>=17)return {phase:'evening',status:'Abschiedsabend',illustration:'paris'};
      return {phase:'paris',status:'Letzter Paris-Tag',illustration:'paris'};
    }
    return {phase:'paris',status:'In Paris',illustration:'paris'};
  }
  function nextEvent(d){return events.find(e=>new Date(e.at)>d)||null;}
  function setText(id,value){const el=$(id);if(el&&el.textContent!==value)el.textContent=value;}
  function weatherData(key){
    const date={'2026-07-31':'2026-07-31','2026-08-01':'2026-08-01','2026-08-02':'2026-08-02'}[key];
    if(!date)return null;
    const card=document.querySelector(`.weather-card[data-weather-date="${date}"]`);if(!card)return null;
    return {headline:card.querySelector('[data-weather="headline"]')?.textContent?.trim(),desc:card.querySelector('[data-weather="description"]')?.textContent?.trim(),sunset:card.querySelector('[data-weather="sunset"]')?.textContent?.trim()};
  }
  function weatherAdvice(w,key,h){
    if(!w||!w.headline||w.headline==='–°')return {icon:'🌤️',title:'Prognose im Blick',text:'Die Tagesprognose erscheint kurz vor dem jeweiligen Reisetag.',tag:'Paris'};
    const s=(w.desc||'').toLowerCase(),rain=/regen|schauer|gewit/.test(s),sun=/sonn|klar/.test(s),hot=/2[7-9]°|3\d°/.test(w.headline);
    if(rain)return {icon:'☔',title:'Louvre zuerst',text:`${w.headline} · Bei Regen sind Museum oder Café der entspanntere Start.${w.sunset&&w.sunset!=='–'?` Sonnenuntergang ${w.sunset}.`:''}`,tag:'Wetter-Tipp'};
    if(key==='2026-08-01')return {icon:sun?'☀️':'🏰',title:sun?'Sonnenschutz einpacken':'Disney-Wetter im Blick',text:`${w.headline} · ${hot?'Für Livi Schattenpausen und genug Wasser einplanen.':'Zwischendurch ruhige Pausen fest einbauen.'}`,tag:'Disneyland'};
    if(w.sunset&&w.sunset!=='–'&&h>=16)return {icon:'📸',title:`Goldene Stunde vor ${w.sunset}`,text:`${w.headline} · Jetzt lohnt sich ein Fotostopp mit weichem Abendlicht.`,tag:'Licht'};
    return {icon:sun?'☀️':'🌤️',title:sun?'Ideal für Fotospots':`${w.headline} in Paris`,text:`${(w.desc||'Tagesprognose').replace(' · Prognose für Paris','')}${w.sunset&&w.sunset!=='–'?` · Sonnenuntergang ${w.sunset}`:''}`,tag:'Tagesprognose'};
  }
  function content(d,c){
    const key=dateKey(d),h=hour(d),days=Math.max(0,Math.ceil((tripStart-d)/86400000)),ev=nextEvent(d),loc=getLocation();
    if(c.phase==='prep'){
      const idx=Math.abs(Math.floor(d.getTime()/86400000))%prepTasks.length;
      return {kicker:'✨ Heute wichtig',title:days<=7?'Die Vorfreude steigt. Fast alles ist vorbereitet.':'Paris rückt jeden Tag ein bisschen näher.',intro:days<=2?'Jetzt zählen nur noch die letzten ruhigen Handgriffe. Der Assistent hält euch genau das bereit, was vor der Abfahrt noch wichtig ist.':'Noch ist Zeit, die kleinen Dinge entspannt vorzubereiten. Der Assistent erinnert euch an das, was eure Reise später leichter macht.',mobility:['📲','Offline & griffbereit','Tickets, Karten und Reservierungen zusätzlich offline sichern.','Vorbereitung'],tip:days<=3?['Nur noch das Wesentliche.','Legt Ausweise, Tickets, Ladekarten und Livi-Sachen an einen festen Platz. Alles andere darf entspannt bleiben.']:['Vorfreude ohne Last-Minute-Stress.','Speichert Hoteladresse, Reservierungen und Tickets auf beiden iPhones. So bleibt alles erreichbar, selbst wenn unterwegs das Netz schwächelt.'],items:prepTasks[idx]};
    }
    if(c.phase==='travel')return {kicker:'🚗 Unterwegs',title:'Heute beginnt euer Abenteuer.',intro:'Die Vorbereitungen sind geschafft. Jetzt zählt nur noch eine ruhige Fahrt, entspannte Ladestopps und ein gutes Ankommen als kleine Familie.',mobility:['⚡','Ladestopp mit Ruhe','Reichweite und nächsten Schnelllader im Blick behalten, bevor es knapp wird.','Auf der Fahrt'],tip:['Ankommen ist heute das Ziel.','Plant an den Ladestopps lieber ein paar Minuten mehr für Livi ein. So beginnt Paris nicht mit Zeitdruck.'],items:[['⚡','Nächsten Ladestopp frühzeitig auswählen','important'],['🍼','Bei der Pause Fläschchen und Wickeltasche auffüllen','soon'],['🏨','Hoteladresse in der Navigation geöffnet halten','info'],['🌇','Puffer für Perruche um 19:00 Uhr bewahren','important']]};
    if(c.phase==='disney'){
      const morning=h<11,evening=h>=18;
      return {kicker:'🏰 Disneyland',title:'Heute wird magisch.',intro:morning?'Startet ohne Hektik, prüft Shows und Wartezeiten und merkt euch direkt einen ruhigen Rückzugsort für Livi.':evening?'Bewahrt euch jetzt genug Energie für die Abendstimmung und das große Finale.':'Zwischen Attraktionen und Disney-Magie bleiben die ruhigen Familienpausen genauso wichtig.',mobility:['🏰','Alles in der Disney-App','Wartezeiten, Shows, Karte und Restaurants direkt in der offiziellen App prüfen.','Disney-Tag'],tip:evening?['Jetzt einen guten Platz suchen.','Für die Abendshow lieber früh einen ruhigen Standort mit Kinderwagen wählen, statt später durch die Menge zu müssen.']:['Pausen sind Teil der Magie.','Das Baby Care Center ist euer ruhiger Rückzugsort für Wickeln, Füttern und eine kleine Pause vom Parktrubel.'],items:evening?[['🎆','Ruhigen Platz für die Abendshow suchen','important'],['🍼','Livi vor dem Finale noch einmal versorgen','soon'],['🔋','Akkustand und Powerbank prüfen','soon'],['📸','Ein letztes Familienfoto bei Abendlicht machen','info']]:[['🎟️','Tickets und Disney-App vor dem Eingang öffnen','important'],['🍼','Baby Care Center direkt auf der Karte merken','soon'],['🎭','Show- und Paradezeiten prüfen','soon'],['☀️','Sonnenschutz, Wasser und Pausen einplanen','info']]};
    }
    if(c.phase==='home'&&d>=tripEnd)return {kicker:'📖 Paris bleibt',title:'Drei Tage, die jetzt zu euren Erinnerungen gehören.',intro:'Die Reise ist vorbei, aber eure Fotos, Tagesabschlüsse und kleinen Lieblingsmomente bleiben hier gesammelt.',mobility:['📸','Erinnerungen sichern','Fotos gemeinsam auswählen und eure schönsten Tagesmomente ergänzen.','Nach der Reise'],tip:['Macht aus Momenten eine Geschichte.','Wählt pro Tag nicht nur die perfekten Bilder, sondern auch ein spontanes, lustiges oder ganz leises Lieblingsfoto aus.'],items:[['📷','Fotos nach Reisetagen sortieren','info'],['❤️','Je Tag einen Lieblingsmoment festhalten','info'],['💶','Budget und Tagesabschlüsse vervollständigen','soon'],['☁️','Gemeinsames Foto-Backup prüfen','important']]};
    if(c.phase==='home')return {kicker:'🚗 Heimreise',title:'Noch ein letzter Blick auf Paris.',intro:'Der Tag darf ruhig ausklingen. Prüft die Ladeplanung, verstaut alles sicher und nehmt die schönsten Erinnerungen mit nach Hause.',mobility:['⚡','Sicher nach Hause','Ladestopps, Reichweite und eine entspannte Pause für Livi einplanen.','Heimfahrt'],tip:['Kein Abschied muss hektisch sein.','Macht vor der Abfahrt noch ein letztes gemeinsames Foto. Oft wird genau das später besonders wertvoll.'],items:[['🧳','Gepäck und Kinderwagen vollständig verstauen','important'],['⚡','Ersten Ladestopp festlegen','important'],['🍼','Wickeltasche für die Fahrt auffüllen','soon'],['📷','Fotos unterwegs automatisch sichern lassen','info']]};
    const anniversary=key==='2026-08-01';
    const evening=h>=18;
    const title=anniversary?'Heute vor einem Jahr habt ihr Ja gesagt. ❤️':key==='2026-08-02'?'Die letzten Stunden ganz bewusst genießen.':evening?'Paris leuchtet heute nur für euch.':'Bonjour! Ein neuer Tag in Paris wartet auf euch.';
    const intro=anniversary?'Euer erster Hochzeitstag, Paris und Livi an eurer Seite: Heute darf sich jeder kleine Moment besonders anfühlen.':key==='2026-08-02'?'Heute darf alles ein wenig langsamer sein: noch ein Café, ein letzter Blick auf Paris und später euer Abschlussdinner im Elio.':evening?'Lasst den Tag ohne Hektik ausklingen und bewahrt euch genug Zeit für euer nächstes besonderes Ziel.':'Der Assistent verbindet Tagesplan, Wetter und Uhrzeit zu einem ruhigen Blick auf das, was jetzt wichtig ist.';
    let mobility=['🚇','Entspannt durch Paris','Für die Innenstadt lieber Metro oder RER nutzen und den Kinderwagen im Blick behalten.','Paris-Tag'];
    if(loc)mobility=['📍','Standort aktiv','Hinweise passen sich automatisch an eure aktuelle Umgebung an.','Live'];
    let tip=anniversary?['Einmal kurz stehen bleiben.','Euer erster Hochzeitstag in Paris kommt nur einmal. Macht heute nicht nur Fotos, sondern nehmt euch zwischendurch bewusst einen stillen Moment zu dritt.']:evening?['Das weiche Abendlicht nutzen.','Kurz vor Sonnenuntergang wirken Seine und Eiffelturm besonders warm – perfekt für ein ruhiges Familienfoto.']:['Paris muss heute nicht vollständig sein.','Ein entspannter Café-Moment mit Livi kann genauso wertvoll sein wie der nächste Programmpunkt.'];
    let items=key==='2026-08-02'?[['🧳','Zimmer, Bad und Steckdosen vor dem Check-out prüfen','important'],['☕','Zeit für einen entspannten letzten Paris-Moment lassen','info'],['🍝','Mit Puffer zur Elio-Reservierung um 17:30 Uhr fahren','important'],['⚡','Ladeplanung für die Heimfahrt prüfen','soon']]:key==='2026-08-01'?[['🎟️','Disneyland-Tickets und App griffbereit halten','important'],['🍼','Baby Care Center als ruhigen Rückzugsort merken','soon'],['🎭','Parade- und Showzeiten prüfen','soon'],['❤️','Einen bewussten Hochzeitstagsmoment festhalten','info']]:[['🍼','Wickeltasche und Fläschchen auffüllen','important'],['🌇','Zeitpuffer für Perruche um 19:00 Uhr einplanen','important'],['📸','Ein gemeinsames Foto beim ersten Eiffelturm-Blick machen','info'],['🔋','Powerbank vor dem Abend prüfen','soon']];
    return {kicker:anniversary?'❤️ Hochzeitstag':evening?'🌙 Paris am Abend':'🗼 Bonjour Paris',title,intro,mobility,tip,items};
  }
  function renderIllustration(name){if(name===lastIllustration)return;lastIllustration=name;const box=$('assistantIllustration');if(!box)return;box.classList.add('is-changing');setTimeout(()=>{box.innerHTML=illustrations[name]||illustrations.prep;box.classList.remove('is-changing');},170);}
  function render(){
    const d=parisNow(),c=context(d),p=content(d,c),key=dateKey(d),h=hour(d),ev=nextEvent(d),weather=weatherAdvice(weatherData(key),key,h);
    if(c.phase!==lastPhase){root.classList.add('is-updating');setTimeout(()=>root.classList.remove('is-updating'),260);lastPhase=c.phase;}
    root.dataset.phase=c.phase;setText('assistantStatusLabel',`Persönlicher Reiseassistent · ${c.status}`);
    setText('assistantDate',new Intl.DateTimeFormat('de-DE',{weekday:'long',day:'2-digit',month:'long',year:'numeric',timeZone:TZ}).format(d));
    setText('assistantKicker',p.kicker);setText('assistantTitle',p.title);setText('assistantIntro',p.intro);
    if(ev){const at=new Date(ev.at);setText('assistantNextIcon',ev.icon);setText('assistantNextTitle',ev.title);setText('assistantNextText',ev.text);setText('assistantNextTime',duration(at-d));}
    else{setText('assistantNextIcon','❤️');setText('assistantNextTitle','Reise abgeschlossen');setText('assistantNextText','Jetzt dürfen aus euren Momenten Erinnerungen werden.');setText('assistantNextTime','Paris bleibt');}
    setText('assistantWeatherIcon',weather.icon);setText('assistantWeatherTitle',weather.title);setText('assistantWeatherText',weather.text);setText('assistantWeatherTime',weather.tag);
    setText('assistantMobilityIcon',p.mobility[0]);setText('assistantMobilityTitle',p.mobility[1]);setText('assistantMobilityText',p.mobility[2]);setText('assistantMobilityTime',p.mobility[3]);
    setText('assistantTipTitle',p.tip[0]);setText('assistantTipText',p.tip[1]);
    const list=$('assistantList');if(list)list.innerHTML=p.items.map(i=>`<li><span>${i[0]}</span><span>${i[1]}</span><span class="assistant-priority ${i[2]}">${i[2]==='important'?'Wichtig':i[2]==='soon'?'Bald':'Info'}</span></li>`).join('');
    const note=$('assistantLiveNote');if(note){const loc=getLocation();if(d>=tripStart&&d<tripEnd){note.textContent=loc?'📍 Standort aktiv · Inhalte werden automatisch angepasst.':ev?`Live-Hinweis: ${ev.title} ${duration(new Date(ev.at)-d)}.`:'';note.classList.toggle('is-visible',!!note.textContent);}else note.classList.remove('is-visible');}
    renderIllustration(c.illustration);
  }
  const toggle=$('assistantToggle');toggle?.addEventListener('click',()=>{const open=root.classList.toggle('is-open');toggle.setAttribute('aria-expanded',String(open));setText('assistantToggleText',open?'Weniger anzeigen':'Alles für heute anzeigen');});
  window.addEventListener('paris-location-updated',render);
  window.addEventListener('storage',e=>{if(e.key===locationKey)render();});
  render();setInterval(render,60000);
  document.querySelectorAll('.weather-card').forEach(card=>new MutationObserver(render).observe(card,{subtree:true,childList:true,characterData:true}));
})();
