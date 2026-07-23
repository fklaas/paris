(() => {
  'use strict';

  const SUPABASE_URL = 'https://yiadkcxgyzdgyadnhyqe.supabase.co';
  const SUPABASE_KEY = 'sb_publishable_RMrTCl-8az9LV2y8OAGPEw_dy3ioVOs';
  const TRIP_CODE = 'KLAAS-PARIS-2026';
  const TRIP_NAME = 'Paris · Unser erster Hochzeitstag';
  const MEMBER_NAME = 'Fabian & Luisa';
  const BUCKET = 'paris-gallery';
  const TRIP_LOCAL_KEY = 'parisSupabaseTripIdV2';
  const LIVE_KEY = 'parisLiveMomentsV2';
  const NOTES_KEY = 'parisGalleryNotesV2';

  const client = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
  });

  const originalSetItem = Storage.prototype.setItem;
  const originalRemoveItem = Storage.prototype.removeItem;
  let applyingRemote = false;
  let userId = null;
  let tripId = null;
  let readyResolve;
  const ready = new Promise(resolve => { readyResolve = resolve; });
  const timers = new Map();

  function parse(value, fallback) {
    try { return value == null ? fallback : JSON.parse(value); } catch { return fallback; }
  }

  function emitChange(key, oldValue, newValue) {
    try {
      window.dispatchEvent(new StorageEvent('storage', { key, oldValue, newValue, storageArea: localStorage }));
    } catch {}
    document.dispatchEvent(new CustomEvent('paris:cloud-updated', { detail: { key } }));
  }

  function isSharedStateKey(key) {
    return key.startsWith('recap-') ||
      key.startsWith('paris-memory') ||
      key.startsWith('parisMemory') ||
      key.startsWith('paris-check') ||
      key.startsWith('parisChecklist') ||
      key.startsWith('parisTrip') ||
      key.startsWith('paris-travel');
  }

  function queue(key, task, delay = 450) {
    clearTimeout(timers.get(key));
    timers.set(key, setTimeout(async () => {
      timers.delete(key);
      try { await ready; await task(); }
      catch (error) { console.warn('Paris-Synchronisierung:', error.message); }
    }, delay));
  }

  async function ensureSession() {
    let { data: { session } } = await client.auth.getSession();
    if (!session) {
      const result = await client.auth.signInAnonymously();
      if (result.error) throw result.error;
      session = result.data.session;
    }
    userId = session.user.id;
  }

  async function ensureTrip() {
    const stored = localStorage.getItem(TRIP_LOCAL_KEY);
    if (stored) {
      const { data } = await client.from('trips').select('id').eq('id', stored).maybeSingle();
      if (data?.id) { tripId = data.id; return; }
    }

    let joined = await client.rpc('join_trip_by_code', { join_code: TRIP_CODE, member_name: MEMBER_NAME });
    if (!joined.error && joined.data) {
      tripId = joined.data;
    } else {
      const created = await client.rpc('create_trip_with_code', {
        trip_name: TRIP_NAME,
        trip_code: TRIP_CODE,
        owner_name: MEMBER_NAME
      });
      if (!created.error && created.data) tripId = created.data;
      else {
        joined = await client.rpc('join_trip_by_code', { join_code: TRIP_CODE, member_name: MEMBER_NAME });
        if (joined.error) throw joined.error;
        tripId = joined.data;
      }
    }
    originalSetItem.call(localStorage, TRIP_LOCAL_KEY, tripId);
  }

  function liveFingerprint(item) {
    return `${item.title || ''}|${item.createdAt || ''}|${item.location || ''}`;
  }

  async function loadLiveMoments() {
    const { data, error } = await client.from('live_moments').select('*').eq('trip_id', tripId).order('created_at', { ascending: false });
    if (error) throw error;
    const remote = (data || []).map(row => ({
      id: row.id,
      type: 'place',
      title: row.title,
      detail: row.description || '',
      createdAt: row.created_at,
      location: row.place || null
    }));
    const local = parse(localStorage.getItem(LIVE_KEY), []);
    const fingerprints = new Set(remote.map(liveFingerprint));
    const localOnly = local.filter(item => !fingerprints.has(liveFingerprint(item)));
    for (const item of localOnly) {
      const inserted = await client.from('live_moments').insert({
        trip_id: tripId,
        created_by: userId,
        title: item.title || 'Unser Paris-Moment',
        description: item.detail || '',
        place: item.location || null,
        created_at: item.createdAt || new Date().toISOString()
      });
      if (inserted.error) console.warn(inserted.error.message);
    }
    if (localOnly.length) return loadLiveMoments();
    const value = JSON.stringify(remote);
    const old = localStorage.getItem(LIVE_KEY);
    applyingRemote = true;
    originalSetItem.call(localStorage, LIVE_KEY, value);
    applyingRemote = false;
    if (old !== value) emitChange(LIVE_KEY, old, value);
  }

  async function pushLiveMoments(value) {
    const items = parse(value, []);
    const { data, error } = await client.from('live_moments').select('id,title,created_at,place').eq('trip_id', tripId);
    if (error) throw error;
    const knownIds = new Set((data || []).map(row => row.id));
    const knownPrints = new Set((data || []).map(row => `${row.title || ''}|${row.created_at || ''}|${row.place || ''}`));
    for (const item of items) {
      if (knownIds.has(item.id) || knownPrints.has(liveFingerprint(item))) continue;
      const result = await client.from('live_moments').insert({
        trip_id: tripId,
        created_by: userId,
        title: item.title || 'Unser Paris-Moment',
        description: item.detail || '',
        place: item.location || null,
        created_at: item.createdAt || new Date().toISOString()
      });
      if (result.error) throw result.error;
    }
  }

  async function loadNotes() {
    const { data, error } = await client.from('day_notes').select('day,note').eq('trip_id', tripId);
    if (error) throw error;
    const remote = Object.fromEntries((data || []).map(row => [row.day, row.note || '']));
    const local = parse(localStorage.getItem(NOTES_KEY), {});
    for (const [day, note] of Object.entries(local)) {
      if (!(day in remote) && String(note).trim()) await upsertDayNote(day, note);
    }
    const merged = { ...local, ...remote };
    const value = JSON.stringify(merged);
    const old = localStorage.getItem(NOTES_KEY);
    applyingRemote = true;
    originalSetItem.call(localStorage, NOTES_KEY, value);
    applyingRemote = false;
    if (old !== value) emitChange(NOTES_KEY, old, value);
  }

  async function upsertDayNote(day, note) {
    const result = await client.from('day_notes').upsert({
      trip_id: tripId,
      created_by: userId,
      day,
      note: String(note || ''),
      updated_at: new Date().toISOString()
    }, { onConflict: 'trip_id,day' });
    if (result.error) throw result.error;
  }

  async function pushNotes(value) {
    const notes = parse(value, {});
    for (const [day, note] of Object.entries(notes)) await upsertDayNote(day, note);
  }

  async function saveAppState(key, value) {
    const type = `app_state:${key}`;
    const deleted = await client.from('favorites').delete().eq('trip_id', tripId).eq('type', type);
    if (deleted.error) throw deleted.error;
    if (value !== null) {
      const inserted = await client.from('favorites').insert({ trip_id: tripId, created_by: userId, type, reference: value });
      if (inserted.error) throw inserted.error;
    }
  }

  async function loadAppState() {
    const { data, error } = await client.from('favorites').select('type,reference,created_at').eq('trip_id', tripId).like('type', 'app_state:%').order('created_at');
    if (error) throw error;
    const latest = new Map();
    for (const row of data || []) latest.set(row.type.slice(10), row.reference);
    applyingRemote = true;
    try {
      for (const [key, value] of latest) {
        const old = localStorage.getItem(key);
        originalSetItem.call(localStorage, key, value);
        if (old !== value) emitChange(key, old, value);
      }
    } finally { applyingRemote = false; }
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && isSharedStateKey(key) && !latest.has(key)) queue(`state:${key}`, () => saveAppState(key, localStorage.getItem(key)), 20);
    }
  }

  Storage.prototype.setItem = function(key, value) {
    originalSetItem.call(this, key, value);
    if (this !== localStorage || applyingRemote) return;
    key = String(key); value = String(value);
    if (key === LIVE_KEY) queue(key, () => pushLiveMoments(value));
    else if (key === NOTES_KEY) queue(key, () => pushNotes(value));
    else if (isSharedStateKey(key)) queue(key, () => saveAppState(key, value));
  };

  Storage.prototype.removeItem = function(key) {
    originalRemoveItem.call(this, key);
    if (this !== localStorage || applyingRemote) return;
    key = String(key);
    if (isSharedStateKey(key)) queue(key, () => saveAppState(key, null));
  };

  function subscribe() {
    client.channel(`paris-trip-${tripId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_moments', filter: `trip_id=eq.${tripId}` }, () => loadLiveMoments().catch(console.warn))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'day_notes', filter: `trip_id=eq.${tripId}` }, () => loadNotes().catch(console.warn))
      .on('postgres_changes', { event: '*', schema: 'public', table: 'favorites', filter: `trip_id=eq.${tripId}` }, () => loadAppState().catch(console.warn))
      .subscribe();
  }

  window.ParisCloud = {
    client,
    ready,
    get tripId() { return tripId; },
    bucket: BUCKET,

    async uploadPhoto(photo) {
      await ready;
      const id = photo.id;
      const extension = (photo.originalName?.split('.').pop() || photo.blob?.type?.split('/').pop() || 'jpg').replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
      const path = `${tripId}/${id}.${extension}`;
      const upload = await client.storage.from(BUCKET).upload(path, photo.blob, { upsert: true, contentType: photo.blob.type || 'image/jpeg' });
      if (upload.error) throw upload.error;
      const record = await client.from('gallery_photos').upsert({
        id,
        trip_id: tripId,
        created_by: userId,
        storage_path: path,
        caption: photo.caption || '',
        is_favorite: Boolean(photo.favorite),
        is_polaroid: Boolean(photo.polaroid),
        taken_at: photo.takenAt || new Date().toISOString(),
        created_at: photo.createdAt || new Date().toISOString()
      }, { onConflict: 'id' });
      if (record.error) throw record.error;
      photo.storagePath = path;
    },

    async updatePhoto(id, patch) {
      await ready;
      const mapped = {};
      if ('favorite' in patch) mapped.is_favorite = Boolean(patch.favorite);
      if ('polaroid' in patch) mapped.is_polaroid = Boolean(patch.polaroid);
      if ('caption' in patch) mapped.caption = patch.caption || '';
      if (!Object.keys(mapped).length) return;
      const result = await client.from('gallery_photos').update(mapped).eq('trip_id', tripId).eq('id', id);
      if (result.error) throw result.error;
    },

    async deletePhoto(photo) {
      await ready;
      const path = photo.storagePath || (await client.from('gallery_photos').select('storage_path').eq('trip_id', tripId).eq('id', photo.id).maybeSingle()).data?.storage_path;
      if (path) await client.storage.from(BUCKET).remove([path]);
      const result = await client.from('gallery_photos').delete().eq('trip_id', tripId).eq('id', photo.id);
      if (result.error) throw result.error;
    },

    async clearPhotos() {
      await ready;
      const { data } = await client.from('gallery_photos').select('storage_path').eq('trip_id', tripId);
      const paths = (data || []).map(row => row.storage_path).filter(Boolean);
      if (paths.length) await client.storage.from(BUCKET).remove(paths);
      const result = await client.from('gallery_photos').delete().eq('trip_id', tripId);
      if (result.error) throw result.error;
    },

    async fetchPhotos() {
      await ready;
      const { data, error } = await client.from('gallery_photos').select('*').eq('trip_id', tripId).order('taken_at');
      if (error) throw error;
      const result = [];
      for (const row of data || []) {
        const file = await client.storage.from(BUCKET).download(row.storage_path);
        if (file.error) { console.warn('Foto konnte nicht geladen werden:', file.error.message); continue; }
        const taken = row.taken_at || row.created_at;
        const d = new Date(taken);
        const dateKey = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
        result.push({
          id: row.id,
          blob: file.data,
          storagePath: row.storage_path,
          originalName: row.storage_path.split('/').pop(),
          size: file.data.size,
          lastModified: new Date(row.created_at).getTime(),
          takenAt: taken,
          dateKey,
          group: ['2026-07-31','2026-08-01','2026-08-02'].includes(dateKey) ? dateKey : 'other',
          favorite: row.is_favorite,
          polaroid: row.is_polaroid,
          caption: row.caption || '',
          createdAt: row.created_at
        });
      }
      return result;
    },

    subscribePhotos(callback) {
      return client.channel(`paris-gallery-${tripId}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'gallery_photos', filter: `trip_id=eq.${tripId}` }, callback)
        .subscribe();
    }
  };



  function injectCloudUi() {
    if (document.getElementById('parisCloudButton')) return;

    const style = document.createElement('style');
    style.textContent = `
      .paris-cloud-button{position:fixed;right:16px;top:16px;z-index:9998;display:flex;align-items:center;gap:9px;border:1px solid rgba(255,255,255,.55);border-radius:999px;padding:10px 14px;background:rgba(20,39,59,.88);color:#fff;box-shadow:0 10px 30px rgba(15,31,48,.24);backdrop-filter:blur(14px);font:800 12px/1.1 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;cursor:pointer;transition:.25s ease}
      .paris-cloud-button:hover{transform:translateY(-1px)}
      .paris-cloud-button .cloud-dot{width:9px;height:9px;border-radius:50%;background:#f2c86b;box-shadow:0 0 0 5px rgba(242,200,107,.15)}
      .paris-cloud-button.is-ready .cloud-dot{background:#6ed59d;box-shadow:0 0 0 5px rgba(110,213,157,.15)}
      .paris-cloud-button.is-offline .cloud-dot{background:#ef8a8a;box-shadow:0 0 0 5px rgba(239,138,138,.15)}
      .paris-cloud-modal{position:fixed;inset:0;z-index:10020;display:none;place-items:center;padding:20px;background:rgba(10,24,38,.55);backdrop-filter:blur(8px)}
      .paris-cloud-modal.is-open{display:grid}
      .paris-cloud-card{width:min(520px,100%);border-radius:28px;padding:26px;background:#fffaf3;color:#203247;box-shadow:0 28px 80px rgba(8,24,39,.32);font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}
      .paris-cloud-card h2{margin:8px 0 10px;font:900 clamp(25px,6vw,34px)/1.05 Georgia,serif;color:#203247}
      .paris-cloud-card p{margin:0 0 14px;line-height:1.6;color:#5f6c79}
      .paris-cloud-badge{display:inline-flex;align-items:center;gap:8px;border-radius:999px;padding:8px 12px;background:#e8f7ef;color:#23734b;font-size:12px;font-weight:900}
      .paris-cloud-code{margin:16px 0;padding:14px 16px;border-radius:18px;background:#eef3f7;border:1px solid #dbe4eb}
      .paris-cloud-code small{display:block;margin-bottom:5px;color:#788795;font-weight:800;text-transform:uppercase;letter-spacing:.08em}
      .paris-cloud-code strong{font-size:17px;letter-spacing:.04em;word-break:break-word}
      .paris-cloud-actions{display:flex;gap:10px;flex-wrap:wrap;margin-top:18px}
      .paris-cloud-actions button{flex:1;min-width:150px;border:0;border-radius:999px;padding:13px 16px;font-weight:900;cursor:pointer}
      .paris-cloud-close{background:#203247;color:white}
      .paris-cloud-retry{background:#eee3d3;color:#203247}
      .paris-cloud-toast{position:fixed;left:50%;bottom:24px;z-index:10010;max-width:calc(100% - 32px);transform:translate(-50%,24px);opacity:0;padding:12px 17px;border-radius:999px;background:#203247;color:#fff;box-shadow:0 14px 38px rgba(8,24,39,.3);font:800 13px/1.2 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;transition:.35s ease;pointer-events:none;text-align:center}
      .paris-cloud-toast.is-visible{transform:translate(-50%,0);opacity:1}
      @media(max-width:700px){.paris-cloud-button{top:10px;right:10px;padding:9px 11px}.paris-cloud-button .cloud-label{max-width:122px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.paris-cloud-card{padding:22px;border-radius:24px}}
    `;
    document.head.appendChild(style);

    const button = document.createElement('button');
    button.id = 'parisCloudButton';
    button.type = 'button';
    button.className = 'paris-cloud-button';
    button.innerHTML = '<span class="cloud-dot"></span><span class="cloud-label">Cloud wird verbunden …</span>';

    const modal = document.createElement('div');
    modal.id = 'parisCloudModal';
    modal.className = 'paris-cloud-modal';
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = `
      <div class="paris-cloud-card" role="dialog" aria-modal="true" aria-labelledby="parisCloudTitle">
        <span class="paris-cloud-badge" id="parisCloudBadge">⏳ Verbindung wird geprüft</span>
        <h2 id="parisCloudTitle">Unsere gemeinsame Paris-Reise</h2>
        <p id="parisCloudText">Dieses Gerät meldet sich automatisch anonym an und verbindet sich mit eurer gemeinsamen Reise.</p>
        <div class="paris-cloud-code"><small>Gemeinsame Reise</small><strong>${TRIP_CODE}</strong></div>
        <p><strong>So kommt Luisas Handy dazu:</strong><br>Einfach dieselbe Internetadresse öffnen. Es ist kein Konto, kein Passwort und kein manuell einzugebender Code nötig.</p>
        <div class="paris-cloud-actions">
          <button type="button" class="paris-cloud-retry" id="parisCloudRetry">Verbindung neu prüfen</button>
          <button type="button" class="paris-cloud-close" id="parisCloudClose">Verstanden</button>
        </div>
      </div>`;

    const toast = document.createElement('div');
    toast.id = 'parisCloudToast';
    toast.className = 'paris-cloud-toast';
    toast.textContent = '☁️ Dieses Gerät ist mit eurer Paris-Reise verbunden.';

    document.body.append(button, modal, toast);
    const close = () => { modal.classList.remove('is-open'); modal.setAttribute('aria-hidden','true'); };
    button.addEventListener('click', () => { modal.classList.add('is-open'); modal.setAttribute('aria-hidden','false'); });
    modal.addEventListener('click', event => { if (event.target === modal) close(); });
    document.getElementById('parisCloudClose').addEventListener('click', close);
    document.getElementById('parisCloudRetry').addEventListener('click', () => window.location.reload());
  }

  function setCloudUi(status, message) {
    injectCloudUi();
    const button = document.getElementById('parisCloudButton');
    const label = button?.querySelector('.cloud-label');
    const badge = document.getElementById('parisCloudBadge');
    const text = document.getElementById('parisCloudText');
    button?.classList.remove('is-ready','is-offline');
    if (status === 'ready') {
      button?.classList.add('is-ready');
      if (label) label.textContent = 'Gemeinsam verbunden';
      if (badge) { badge.textContent = '✓ Supabase verbunden'; badge.style.background = '#e8f7ef'; badge.style.color = '#23734b'; }
      if (text) text.textContent = 'Dieses Gerät ist verbunden. Änderungen an gemeinsamen Inhalten werden automatisch mit dem anderen Handy synchronisiert.';
    } else if (status === 'offline') {
      button?.classList.add('is-offline');
      if (label) label.textContent = 'Cloud nicht verbunden';
      if (badge) { badge.textContent = '⚠ Verbindung fehlgeschlagen'; badge.style.background = '#fdeaea'; badge.style.color = '#9b3535'; }
      if (text) text.textContent = message || 'Supabase konnte nicht erreicht werden. Die App bleibt lokal nutzbar; tippe unten auf „Verbindung neu prüfen“.';
    } else {
      if (label) label.textContent = 'Cloud wird verbunden …';
    }
  }

  function showConnectedToast() {
    const toast = document.getElementById('parisCloudToast');
    if (!toast) return;
    const reveal = () => {
      toast.classList.add('is-visible');
      window.setTimeout(() => toast.classList.remove('is-visible'), 4200);
    };
    const introButton = document.getElementById('parisIntroOpen');
    if (document.getElementById('parisIntro') && introButton) introButton.addEventListener('click', () => window.setTimeout(reveal, 1050), { once:true });
    else window.setTimeout(reveal, 500);
  }

  async function start() {
    setCloudUi('connecting');
    try {
      await ensureSession();
      await ensureTrip();
      await Promise.all([loadLiveMoments(), loadNotes(), loadAppState()]);
      subscribe();
      document.documentElement.dataset.cloudSync = 'ready';
      document.dispatchEvent(new CustomEvent('paris:cloud-ready', { detail: { tripId } }));
      setCloudUi('ready');
      showConnectedToast();
    } catch (error) {
      console.error('Supabase konnte nicht gestartet werden:', error);
      document.documentElement.dataset.cloudSync = 'offline';
      setCloudUi('offline', error.message);
    } finally { readyResolve(); }
  }

  start();
})();
