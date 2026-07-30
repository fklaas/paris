(() => {
  'use strict';

  let client = null;
  let initialized = false;
  let authSubscription = null;
  const listeners = new Set();
  const state = { session: null, user: null, loading: true, lastEvent: null };

  const PENDING_KEY = 'parisAuthPendingUpgradeV2';
  const SIGNED_OUT_KEY = 'parisAuthExplicitlySignedOutV1';

  function readPending() {
    try { return JSON.parse(localStorage.getItem(PENDING_KEY) || 'null'); }
    catch (_) { return null; }
  }
  function writePending(value) {
    if (value) localStorage.setItem(PENDING_KEY, JSON.stringify(value));
    else localStorage.removeItem(PENDING_KEY);
  }
  function isExplicitlySignedOut() {
    return localStorage.getItem(SIGNED_OUT_KEY) === '1';
  }
  function setExplicitlySignedOut(value) {
    if (value) localStorage.setItem(SIGNED_OUT_KEY, '1');
    else localStorage.removeItem(SIGNED_OUT_KEY);
  }
  function isAnonymousUser(user) {
    if (!user) return false;
    const identities = Array.isArray(user.identities) ? user.identities : [];
    const hasPermanentIdentity = identities.some(identity => identity?.provider && identity.provider !== 'anonymous');
    const hasEmailIdentity = Boolean(user.email) || identities.some(identity => identity?.provider === 'email');
    return !hasPermanentIdentity && !hasEmailIdentity;
  }
  function isPermanentUser(user) {
    return Boolean(user && !isAnonymousUser(user));
  }
  function notify() {
    const snapshot = getState();
    listeners.forEach(fn => { try { fn(snapshot); } catch (e) { console.warn('ParisAuth listener', e); } });
    document.dispatchEvent(new CustomEvent('paris:auth-changed', { detail: snapshot }));
  }
  function getState() {
    const user = state.user;
    const anonymous = isAnonymousUser(user);
    // Ein alter Wizard-Eintrag darf ein bereits bestätigtes Konto niemals wieder
    // in den Assistenten zurückschicken. Pending ist nur für echte anonyme User relevant.
    const pending = anonymous ? readPending() : null;
    return {
      session: state.session,
      user,
      loading: state.loading,
      anonymous,
      authenticated: Boolean(user && !anonymous),
      signedOut: Boolean(!user && isExplicitlySignedOut()),
      email: user?.email || pending?.email || '',
      emailConfirmed: Boolean(user?.email_confirmed_at || user?.confirmed_at),
      provider: user?.app_metadata?.provider || ((user?.identities || []).find(x => x?.provider !== 'anonymous')?.provider) || (anonymous ? 'anonymous' : ''),
      identities: user?.identities || [],
      lastEvent: state.lastEvent,
      pendingUpgrade: pending
    };
  }
  async function setFromSession(session, event) {
    state.session = session || null;
    state.user = session?.user || null;
    state.loading = false;
    state.lastEvent = event || null;
    if (isPermanentUser(state.user)) {
      setExplicitlySignedOut(false);
      writePending(null);
    }
    notify();
  }
  async function init(supabaseClient) {
    if (initialized) return getState();
    client = supabaseClient;
    initialized = true;
    const initial = await client.auth.getSession();
    if (initial.error) throw initial.error;
    let initialSession = initial.data.session;
    // getSession kann direkt nach einer E-Mail-Bestätigung noch ein älteres User-Objekt
    // enthalten. getUser holt den aktuellen Status vom Auth-Server.
    if (initialSession) {
      const fresh = await client.auth.getUser();
      if (!fresh.error && fresh.data.user) {
        initialSession = { ...initialSession, user: fresh.data.user };
      }
    }
    await setFromSession(initialSession, 'INITIAL_SESSION');
    const listener = client.auth.onAuthStateChange((event, nextSession) => {
      Promise.resolve().then(() => setFromSession(nextSession, event));
    });
    authSubscription = listener?.data?.subscription || null;
    return getState();
  }
  async function ensureInitialSession(supabaseClient) {
    await init(supabaseClient);
    const current = await supabaseClient.auth.getSession();
    if (current.error) throw current.error;
    const session = current.data.session || null;
    // Kein automatischer anonymer Login mehr. Ohne gespeicherte Sitzung bleibt die
    // App abgemeldet, bis bewusst ein Login oder „Ohne Konto fortfahren“ gewählt wird.
    await setFromSession(session, session ? 'ENSURE_SESSION' : 'SIGNED_OUT_SESSION');
    return session;
  }
  async function continueAnonymously() {
    const c = requireClient();
    const current = await c.auth.getSession();
    if (current.error) throw current.error;
    if (current.data.session) {
      setExplicitlySignedOut(false);
      await setFromSession(current.data.session, 'ANONYMOUS_CONTINUE_EXISTING');
      return current.data;
    }
    const result = await c.auth.signInAnonymously();
    if (result.error) throw result.error;
    setExplicitlySignedOut(false);
    writePending(null);
    await setFromSession(result.data.session, 'SIGNED_IN_ANONYMOUSLY');
    return result.data;
  }
  function requireClient() {
    if (!client) throw new Error('Authentifizierung ist noch nicht bereit.');
    return client;
  }
  async function refreshCurrentUser() {
    const c = requireClient();
    const sessionResult = await c.auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    if (!sessionResult.data.session) {
      await setFromSession(null, 'USER_REFRESHED_SIGNED_OUT');
      return null;
    }
    const result = await c.auth.getUser();
    if (result.error) throw result.error;
    const freshSession = await c.auth.getSession();
    if (freshSession.error) throw freshSession.error;
    const mergedSession = freshSession.data.session
      ? { ...freshSession.data.session, user: result.data.user }
      : null;
    await setFromSession(mergedSession, 'USER_REFRESHED');
    return result.data.user;
  }
  async function signIn(email, password) {
    const result = await requireClient().auth.signInWithPassword({
      email: String(email || '').trim(),
      password: String(password || '')
    });
    if (result.error) throw result.error;
    setExplicitlySignedOut(false);
    writePending(null);
    await setFromSession(result.data.session, 'SIGNED_IN');
    return result.data;
  }
  async function signUp({ email, password, firstName, lastName, displayName }) {
    const name = String(displayName || `${firstName || ''} ${lastName || ''}`).trim();
    const result = await requireClient().auth.signUp({
      email: String(email || '').trim(),
      password: String(password || ''),
      options: {
        emailRedirectTo: window.ParisSupabaseConfig.redirectUrl,
        data: { first_name: firstName || '', last_name: lastName || '', display_name: name }
      }
    });
    if (result.error) throw result.error;
    setExplicitlySignedOut(false);
    if (result.data.session) await setFromSession(result.data.session, 'SIGNED_UP');
    return result.data;
  }
  async function requestAnonymousEmail({ email, firstName, lastName, displayName }) {
    const current = getState();
    if (!current.user) throw new Error('Keine aktive Anmeldung gefunden.');
    if (!current.anonymous && !current.pendingUpgrade) throw new Error('Dieses Konto ist bereits dauerhaft gesichert.');
    const cleanEmail = String(email || '').trim().toLowerCase();
    const name = String(displayName || `${firstName || ''} ${lastName || ''}`).trim();
    const payload = {
      email: cleanEmail,
      firstName: String(firstName || ''),
      lastName: String(lastName || ''),
      displayName: name,
      userId: current.user.id,
      requestedAt: new Date().toISOString(),
      stage: 'email-sent'
    };
    const result = await requireClient().auth.updateUser({
      email: cleanEmail,
      data: { first_name: payload.firstName, last_name: payload.lastName, display_name: name }
    }, { emailRedirectTo: window.ParisSupabaseConfig.redirectUrl });
    if (result.error) throw result.error;
    writePending(payload);
    notify();
    return result.data;
  }
  async function checkUpgradeConfirmation() {
    const pending = readPending();
    if (!pending) return { confirmed: false, user: getState().user };
    const user = await refreshCurrentUser();
    const confirmed = Boolean(
      user?.email &&
      String(user.email).toLowerCase() === String(pending.email).toLowerCase() &&
      (user.email_confirmed_at || user.confirmed_at) &&
      !isAnonymousUser(user)
    );
    if (confirmed) {
      writePending({ ...pending, stage: 'email-confirmed', confirmedAt: new Date().toISOString() });
      notify();
    }
    return { confirmed, user };
  }
  async function completeAnonymousUpgrade(password) {
    const pending = readPending();
    if (!pending) throw new Error('Es wurde keine laufende Kontosicherung gefunden.');
    const checked = await checkUpgradeConfirmation();
    if (!checked.confirmed) throw new Error('Die E-Mail-Adresse ist noch nicht bestätigt. Öffne zuerst den Link aus der E-Mail.');
    const result = await requireClient().auth.updateUser({ password: String(password || '') });
    if (result.error) throw result.error;
    writePending(null);
    setExplicitlySignedOut(false);
    const sessionResult = await requireClient().auth.getSession();
    if (sessionResult.error) throw sessionResult.error;
    const nextSession = sessionResult.data.session
      ? { ...sessionResult.data.session, user: result.data.user || sessionResult.data.session.user }
      : null;
    await setFromSession(nextSession, 'ACCOUNT_UPGRADED');
    await refreshCurrentUser();
    return result.data;
  }
  function cancelPendingUpgrade() { writePending(null); notify(); }
  async function resetPassword(email) {
    const result = await requireClient().auth.resetPasswordForEmail(String(email || '').trim(), {
      redirectTo: `${window.ParisSupabaseConfig.redirectUrl}?auth=recovery`
    });
    if (result.error) throw result.error;
    return true;
  }
  async function updatePassword(password) {
    const result = await requireClient().auth.updateUser({ password: String(password || '') });
    if (result.error) throw result.error;
    await refreshCurrentUser();
    return result.data;
  }
  async function signInWithProvider(provider) {
    setExplicitlySignedOut(false);
    const result = await requireClient().auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.ParisSupabaseConfig.redirectUrl, skipBrowserRedirect: false }
    });
    if (result.error) throw result.error;
    return result.data;
  }
  async function linkProvider(provider) {
    const result = await requireClient().auth.linkIdentity({
      provider,
      options: { redirectTo: window.ParisSupabaseConfig.redirectUrl }
    });
    if (result.error) throw result.error;
    return result.data;
  }
  async function signOut() {
    const c = requireClient();
    setExplicitlySignedOut(true);
    writePending(null);
    const result = await c.auth.signOut({ scope: 'local' });
    if (result.error) {
      setExplicitlySignedOut(false);
      throw result.error;
    }
    await setFromSession(null, 'SIGNED_OUT');
  }
  function onChange(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  }

  window.ParisAuth = {
    init,
    ensureInitialSession,
    continueAnonymously,
    getState,
    onChange,
    signIn,
    signUp,
    requestAnonymousEmail,
    checkUpgradeConfirmation,
    completeAnonymousUpgrade,
    cancelPendingUpgrade,
    refreshCurrentUser,
    resetPassword,
    updatePassword,
    signInWithProvider,
    linkProvider,
    signOut
  };
})();
