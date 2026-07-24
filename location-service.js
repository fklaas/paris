(() => {
  'use strict';
  const PREF_KEY='parisLocationEnabledV1';
  const SHARED_KEY='paris-shared-location-v1';
  const LIVE_KEY='parisSharedLocationV1';
  let watchId=null;
  let state={enabled:localStorage.getItem(PREF_KEY)==='1',status:'idle',position:null,error:null};
  const emit=()=>{
    window.dispatchEvent(new CustomEvent('paris:location-state',{detail:{...state}}));
    window.dispatchEvent(new CustomEvent('paris-location-updated',{detail:state.position}));
  };
  function savePosition(coords){
    const now=Date.now();
    const position={latitude:coords.latitude,longitude:coords.longitude,accuracy:coords.accuracy,ts:now};
    state={...state,enabled:true,status:'active',position,error:null};
    localStorage.setItem(PREF_KEY,'1');
    localStorage.setItem(SHARED_KEY,JSON.stringify(position));
    localStorage.setItem(LIVE_KEY,JSON.stringify({lat:coords.latitude,lng:coords.longitude,accuracy:coords.accuracy,at:now}));
    emit();
  }
  function onError(error){
    const denied=error?.code===1;
    state={...state,status:denied?'denied':'error',error:denied?'Standortzugriff wurde in Safari abgelehnt. Bitte in den Website-Einstellungen erlauben.':'Der Standort konnte gerade nicht ermittelt werden.'};
    if(denied){state.enabled=false;localStorage.removeItem(PREF_KEY)}
    emit();
  }
  async function permissionState(){
    try{return (await navigator.permissions?.query?.({name:'geolocation'}))?.state||'unknown'}catch{return'unknown'}
  }
  function enable(){
    return new Promise((resolve,reject)=>{
      if(!navigator.geolocation){onError({code:0});reject(new Error('Geolocation unavailable'));return}
      state={...state,enabled:true,status:'requesting',error:null};localStorage.setItem(PREF_KEY,'1');emit();
      const success=pos=>{savePosition(pos.coords);resolve(state.position)};
      const failure=err=>{onError(err);reject(err)};
      navigator.geolocation.getCurrentPosition(success,failure,{enableHighAccuracy:true,timeout:15000,maximumAge:15000});
      if(watchId===null)watchId=navigator.geolocation.watchPosition(pos=>savePosition(pos.coords),onError,{enableHighAccuracy:true,maximumAge:30000,timeout:20000});
    });
  }
  function disable(){
    if(watchId!==null){navigator.geolocation?.clearWatch?.(watchId);watchId=null}
    localStorage.removeItem(PREF_KEY);
    state={enabled:false,status:'idle',position:null,error:null};emit();
  }
  function getState(){return{...state}}
  try{
    const saved=JSON.parse(localStorage.getItem(SHARED_KEY)||'null');
    if(saved&&Date.now()-(saved.ts||0)<86400000)state.position=saved;
  }catch{}
  window.ParisLocation={enable,disable,getState,permissionState,isEnabled:()=>state.enabled};
  if(state.enabled){setTimeout(()=>enable().catch(()=>{}),300)}else emit();
})();
