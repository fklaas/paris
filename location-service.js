(() => {
  'use strict';
  const PREF_KEY='parisLocationEnabledV1';
  const SHARED_KEY='paris-shared-location-v1';
  const LIVE_KEY='parisSharedLocationV1';
  let watchId=null;
  let requestPromise=null;
  let state={enabled:localStorage.getItem(PREF_KEY)==='1',status:'idle',position:null,error:null};

  const emit=()=>{
    window.dispatchEvent(new CustomEvent('paris:location-state',{detail:{...state}}));
    window.dispatchEvent(new CustomEvent('paris-location-updated',{detail:state.position}));
  };
  function browserName(){
    const ua=navigator.userAgent||'';
    if(/CriOS|Chrome/i.test(ua)&&!/EdgiOS|OPR/i.test(ua))return'Chrome';
    if(/Safari/i.test(ua)&&!/Chrome|CriOS|Chromium|Android/i.test(ua))return'Safari';
    if(/Firefox|FxiOS/i.test(ua))return'Firefox';
    if(/Edg|EdgiOS/i.test(ua))return'Edge';
    return'Browser';
  }
  function savePosition(coords){
    const now=Date.now();
    const position={latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy,ts:now};
    state={...state,enabled:true,status:'active',position,error:null};
    localStorage.setItem(PREF_KEY,'1');
    localStorage.setItem(SHARED_KEY,JSON.stringify(position));
    localStorage.setItem(LIVE_KEY,JSON.stringify({lat:coords.latitude,lng:coords.longitude,accuracy:coords.accuracy,at:now}));
    emit();
  }
  function errorMessage(error){
    const browser=browserName();
    if(error?.code===1)return `Standortzugriff wurde in ${browser} abgelehnt. Bitte die Standortberechtigung dieser Website in den Browser- oder Website-Einstellungen erlauben.`;
    if(error?.code===2)return 'Der Standort ist momentan nicht verfügbar. Bitte Ortungsdienste, WLAN oder mobile Daten prüfen und erneut versuchen.';
    if(error?.code===3)return 'Die Standortabfrage hat zu lange gedauert. Bitte erneut versuchen – möglichst mit aktivem WLAN oder mobilen Daten.';
    return 'Der Standort konnte gerade nicht ermittelt werden.';
  }
  function onError(error){
    const denied=error?.code===1;
    state={...state,status:denied?'denied':'error',error:errorMessage(error)};
    if(denied){state.enabled=false;localStorage.removeItem(PREF_KEY)}
    emit();
  }
  async function permissionState(){
    try{return (await navigator.permissions?.query?.({name:'geolocation'}))?.state||'unknown'}catch{return'unknown'}
  }
  function requestOnce(options){
    return new Promise((resolve,reject)=>navigator.geolocation.getCurrentPosition(resolve,reject,options));
  }
  function startWatch(){
    if(watchId!==null||!navigator.geolocation)return;
    watchId=navigator.geolocation.watchPosition(
      pos=>savePosition(pos.coords),
      err=>{ if(err?.code===1) onError(err); },
      {enableHighAccuracy:false,maximumAge:60000,timeout:30000}
    );
  }
  async function enable(){
    if(requestPromise)return requestPromise;
    requestPromise=(async()=>{
      if(!window.isSecureContext){const err={code:0};state={...state,status:'error',error:'Standort ist nur über eine sichere HTTPS-Verbindung verfügbar.'};emit();throw err}
      if(!navigator.geolocation){const err={code:0};state={...state,status:'error',error:'Dieser Browser stellt keine Standortfunktion bereit.'};emit();throw err}
      state={...state,enabled:true,status:'requesting',error:null};
      localStorage.setItem(PREF_KEY,'1');emit();
      try{
        // iOS/Safari reagiert zuverlässiger, wenn zunächst ohne hohe Genauigkeit angefragt wird.
        let pos;
        try{pos=await requestOnce({enableHighAccuracy:false,timeout:20000,maximumAge:300000})}
        catch(firstError){
          if(firstError?.code===1)throw firstError;
          pos=await requestOnce({enableHighAccuracy:true,timeout:25000,maximumAge:60000});
        }
        savePosition(pos.coords);
        startWatch();
        return state.position;
      }catch(err){onError(err);throw err}
      finally{requestPromise=null}
    })();
    return requestPromise;
  }
  function disable(){
    if(watchId!==null){navigator.geolocation?.clearWatch?.(watchId);watchId=null}
    requestPromise=null;
    localStorage.removeItem(PREF_KEY);
    state={enabled:false,status:'idle',position:null,error:null};emit();
  }
  function getState(){return{...state}}
  try{
    const saved=JSON.parse(localStorage.getItem(SHARED_KEY)||'null');
    if(saved&&Date.now()-(saved.ts||0)<86400000){state.position=saved;state.status=state.enabled?'active':'idle'}
  }catch{}
  window.ParisLocation={enable,disable,getState,permissionState,isEnabled:()=>state.enabled};
  // Keine automatische Browser-Abfrage beim Laden: iOS verlangt dafür eine direkte Nutzeraktion.
  emit();
})();
