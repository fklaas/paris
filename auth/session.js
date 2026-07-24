(() => {
  'use strict';
  let client = null;
  let initialized = false;
  const listeners = new Set();
  const state = { session:null, user:null, loading:true, lastEvent:null };
  const PENDING_KEY = 'parisAuthPendingUpgradeV2';

  function readPending(){
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); }
    catch (_) { return null; }
  }
  function writePending(value){
    if(value) localStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else localStorage.removeItem(PENDING_KEY);
  }
  function notify(){
    const snapshot=getState();
    listeners.forEach(fn=>{try{fn(snapshot)}catch(e){console.warn('ParisAuth listener',e)}});
    document.dispatchEvent(new CustomEvent('paris:auth-changed',{detail:snapshot}));
  }
  function getState(){
    const user=state.user;
    const pending=readPending();
    return {
      session:state.session,
      user,
      loading:state.loading,
      anonymous:Boolean(user?.is_anonymous),
      authenticated:Boolean(user && !user.is_anonymous),
      email:user?.email||pending?.email||'',
      emailConfirmed:Boolean(user?.email_confirmed_at || user?.confirmed_at),
      provider:user?.app_metadata?.provider||((user?.identities||[])[0]?.provider)||'anonymous',
      identities:user?.identities||[],
      lastEvent:state.lastEvent,
      pendingUpgrade:pending
    };
  }
  async function setFromSession(session,event){
    state.session=session||null; state.user=session?.user||null; state.loading=false; state.lastEvent=event||null; notify();
  }
  async function init(supabaseClient){
    if(initialized) return getState();
    client=supabaseClient; initialized=true;
    const {data:{session}}=await client.auth.getSession();
    await setFromSession(session,'INITIAL_SESSION');
    client.auth.onAuthStateChange((event,nextSession)=>setFromSession(nextSession,event));
    return getState();
  }
  async function ensureInitialSession(supabaseClient){
    await init(supabaseClient);
    let {data:{session},error}=await supabaseClient.auth.getSession();
    if(error) throw error;
    if(!session){
      const result=await supabaseClient.auth.signInAnonymously();
      if(result.error) throw result.error;
      session=result.data.session;
    }
    await setFromSession(session,'ENSURE_SESSION');
    return session;
  }
  function requireClient(){if(!client)throw new Error('Authentifizierung ist noch nicht bereit.');return client}
  async function refreshCurrentUser(){
    const c=requireClient();
    const refreshed=await c.auth.refreshSession();
    if(refreshed.error) console.warn('Session refresh',refreshed.error);
    const result=await c.auth.getUser();
    if(result.error) throw result.error;
    const {data:{session}}=await c.auth.getSession();
    await setFromSession(session,'USER_REFRESHED');
    return result.data.user;
  }
  async function signIn(email,password){
    const result=await requireClient().auth.signInWithPassword({email:String(email||'').trim(),password:String(password||'')});
    if(result.error)throw result.error; return result.data;
  }
  async function signUp({email,password,firstName,lastName,displayName}){
    const name=String(displayName||`${firstName||''} ${lastName||''}`).trim();
    const result=await requireClient().auth.signUp({
      email:String(email||'').trim(), password:String(password||''),
      options:{emailRedirectTo:window.ParisSupabaseConfig.redirectUrl,data:{first_name:firstName||'',last_name:lastName||'',display_name:name}}
    });
    if(result.error)throw result.error; return result.data;
  }
  async function requestAnonymousEmail({email,firstName,lastName,displayName}){
    const current=getState();
    if(!current.user)throw new Error('Keine aktive Anmeldung gefunden.');
    if(!current.anonymous && !current.pendingUpgrade)throw new Error('Dieses Konto ist bereits dauerhaft gesichert.');
    const cleanEmail=String(email||'').trim().toLowerCase();
    const name=String(displayName||`${firstName||''} ${lastName||''}`).trim();
    const payload={
      email:cleanEmail,
      firstName:String(firstName||''),
      lastName:String(lastName||''),
      displayName:name,
      userId:current.user.id,
      requestedAt:new Date().toISOString(),
      stage:'email-sent'
    };
    const result=await requireClient().auth.updateUser({
      email:cleanEmail,
      data:{first_name:payload.firstName,last_name:payload.lastName,display_name:name}
    },{emailRedirectTo:window.ParisSupabaseConfig.redirectUrl});
    if(result.error)throw result.error;
    writePending(payload);
    notify();
    return result.data;
  }
  async function checkUpgradeConfirmation(){
    const pending=readPending();
    if(!pending) return {confirmed:false,user:getState().user};
    const user=await refreshCurrentUser();
    const confirmed=Boolean(user?.email && String(user.email).toLowerCase()===String(pending.email).toLowerCase() && (user.email_confirmed_at || user.confirmed_at) && !user.is_anonymous);
    if(confirmed){writePending({...pending,stage:'email-confirmed',confirmedAt:new Date().toISOString()});notify();}
    return {confirmed,user};
  }
  async function completeAnonymousUpgrade(password){
    const pending=readPending();
    if(!pending)throw new Error('Es wurde keine laufende Kontosicherung gefunden.');
    const checked=await checkUpgradeConfirmation();
    if(!checked.confirmed)throw new Error('Die E-Mail-Adresse ist noch nicht bestätigt. Öffne zuerst den Link aus der E-Mail.');
    const result=await requireClient().auth.updateUser({password:String(password||'')});
    if(result.error)throw result.error;
    writePending(null);
    await refreshCurrentUser();
    return result.data;
  }
  function cancelPendingUpgrade(){writePending(null);notify();}
  async function resetPassword(email){
    const result=await requireClient().auth.resetPasswordForEmail(String(email||'').trim(),{redirectTo:`${window.ParisSupabaseConfig.redirectUrl}?auth=recovery`});
    if(result.error)throw result.error; return true;
  }
  async function updatePassword(password){const r=await requireClient().auth.updateUser({password:String(password||'')});if(r.error)throw r.error;return r.data}
  async function signInWithProvider(provider){
    const result=await requireClient().auth.signInWithOAuth({provider,options:{redirectTo:window.ParisSupabaseConfig.redirectUrl,skipBrowserRedirect:false}});
    if(result.error)throw result.error; return result.data;
  }
  async function linkProvider(provider){
    const result=await requireClient().auth.linkIdentity({provider,options:{redirectTo:window.ParisSupabaseConfig.redirectUrl}});
    if(result.error)throw result.error; return result.data;
  }
  async function signOut(){const r=await requireClient().auth.signOut({scope:'local'});if(r.error)throw r.error;location.reload()}
  function onChange(fn){listeners.add(fn);return()=>listeners.delete(fn)}

  window.ParisAuth={init,ensureInitialSession,getState,onChange,signIn,signUp,requestAnonymousEmail,checkUpgradeConfirmation,completeAnonymousUpgrade,cancelPendingUpgrade,refreshCurrentUser,resetPassword,updatePassword,signInWithProvider,linkProvider,signOut};
})();
