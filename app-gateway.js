(() => {
  'use strict';
  const root=document.documentElement;
  const gateway=document.getElementById('appGateway');
  const authHost=document.getElementById('gatewayAuth');
  const anonymousNote=document.getElementById('gatewayAnonymousNote');
  let client=null;
  let resolved=false;
  let formRendered=false;
  let entering=false;
  let wasAuthenticated=false;

  function setAppVisible(){
    root.classList.remove('auth-booting');
  }
  function showGateway(state){
    resolved=true;
    setAppVisible();
    document.body.classList.add('app-gateway-locked');
    root.classList.add('app-gateway-locked');
    gateway.hidden=false;
    gateway.classList.remove('is-authenticated');
    gateway.setAttribute('aria-hidden','false');
    anonymousNote?.classList.toggle('is-visible',Boolean(state?.anonymous));
    if(window.ParisAuthUI?.renderAuthForm&&!formRendered){
      window.ParisAuthUI.renderAuthForm(authHost,'login');
      formRendered=true;
    }
  }
  function hideGateway(){
    resolved=true;
    setAppVisible();
    document.body.classList.remove('app-gateway-locked');
    root.classList.remove('app-gateway-locked');
    gateway.classList.add('is-authenticated');
    gateway.hidden=true;
    gateway.setAttribute('aria-hidden','true');
  }
  async function ensureClient(){
    if(client)return client;
    if(!window.supabase||!window.ParisSupabaseConfig)throw new Error('Anmeldung lädt noch.');
    client=window.ParisSupabaseClient||window.supabase.createClient(
      window.ParisSupabaseConfig.url,
      window.ParisSupabaseConfig.publishableKey,
      {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,flowType:'pkce'}}
    );
    window.ParisSupabaseClient=client;
    await window.ParisAuth.init(client);
    return client;
  }
  async function enterApp({freshLogin=false}={}){
    if(entering)return;
    entering=true;
    hideGateway();
    try{
      const c=await ensureClient();
      if(freshLogin&&window.ParisOnboarding?.chooseTrip){
        await window.ParisOnboarding.chooseTrip(c);
      }
      await window.ParisCloud?.connect?.({force:true});
      if(freshLogin&&!window.ParisCloud?.tripId&&window.ParisOnboarding?.ensure){
        await window.ParisOnboarding.ensure(c);
        await window.ParisCloud?.connect?.({force:true});
      }
      window.scrollTo(0,0);
    }catch(error){
      console.error('Reisezeit Einstieg:',error);
      const state=window.ParisAuth?.getState?.();
      if(!state?.authenticated)showGateway(state||{});
    }finally{
      entering=false;
    }
  }
  function applyState(state,{freshLogin=false}={}){
    if(state?.loading)return;
    const justSignedIn=Boolean(state?.authenticated&&!wasAuthenticated);
    wasAuthenticated=Boolean(state?.authenticated);
    if(state?.authenticated)enterApp({freshLogin:freshLogin||justSignedIn});
    else showGateway(state||{});
  }
  async function boot(){
    try{
      await ensureClient();
      const session=await window.ParisAuth.ensureInitialSession(client);
      const state=window.ParisAuth.getState();
      applyState(state);
    }catch(error){
      console.error('Auth-Start:',error);
      showGateway(window.ParisAuth?.getState?.()||{});
    }
  }
  document.addEventListener('paris:auth-changed',event=>{
    const state=event.detail||window.ParisAuth?.getState?.();
    if(!state?.loading)applyState(state);
  });
  document.addEventListener('reisezeit:login-success',()=>{ formRendered=false; });
  const wait=()=>{
    if(window.supabase&&window.ParisSupabaseConfig&&window.ParisAuth&&window.ParisAuthUI)boot();
    else setTimeout(wait,40);
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',wait,{once:true});else wait();
  setTimeout(()=>{if(!resolved&&root.classList.contains('auth-booting'))showGateway(window.ParisAuth?.getState?.()||{})},5000);
})();