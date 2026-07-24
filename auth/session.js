(() => {
  'use strict';
  let client = null;
  let initialized = false;
  const listeners = new Set();
  const state = { session:null, user:null, loading:true, lastEvent:null };

  function notify(){
    const snapshot=getState();
    listeners.forEach(fn=>{try{fn(snapshot)}catch(e){console.warn('ParisAuth listener',e)}});
    document.dispatchEvent(new CustomEvent('paris:auth-changed',{detail:snapshot}));
  }
  function getState(){
    const user=state.user;
    return {
      session:state.session,
      user,
      loading:state.loading,
      anonymous:Boolean(user?.is_anonymous),
      authenticated:Boolean(user && !user.is_anonymous),
      email:user?.email||'',
      provider:user?.app_metadata?.provider||((user?.identities||[])[0]?.provider)||'anonymous',
      identities:user?.identities||[],
      lastEvent:state.lastEvent
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
  async function secureAnonymousAccount({email,password,firstName,lastName,displayName}){
    const current=getState();
    if(!current.user)throw new Error('Keine aktive Anmeldung gefunden.');
    if(!current.anonymous)throw new Error('Dieses Konto ist bereits dauerhaft gesichert.');
    const name=String(displayName||`${firstName||''} ${lastName||''}`).trim();
    const emailResult=await requireClient().auth.updateUser({
      email:String(email||'').trim(),
      data:{first_name:firstName||'',last_name:lastName||'',display_name:name}
    },{emailRedirectTo:window.ParisSupabaseConfig.redirectUrl});
    if(emailResult.error)throw emailResult.error;
    const passwordResult=await requireClient().auth.updateUser({password:String(password||'')});
    if(passwordResult.error)throw passwordResult.error;
    return passwordResult.data;
  }
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

  window.ParisAuth={init,ensureInitialSession,getState,onChange,signIn,signUp,secureAnonymousAccount,resetPassword,updatePassword,signInWithProvider,linkProvider,signOut};
})();
