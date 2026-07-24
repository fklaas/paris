(() => {
  'use strict';

  const KEY = 'parisIdentityV1';
  const LEGACY_TRIP_KEY = 'parisSupabaseTripIdV2';
  const DEFAULT_CODE = 'KLAAS-PARIS-2026';
  const qs = new URLSearchParams(location.search);
  const incoming = (qs.get('paris_join') || '').trim().toUpperCase();

  const parse = value => { try { return JSON.parse(value); } catch { return null; } };
  const saved = () => parse(localStorage.getItem(KEY));
  const cleanName = value => String(value || '').trim().slice(0, 40);
  const randomCode = () => `PARIS-${crypto.getRandomValues(new Uint32Array(1))[0].toString(36).toUpperCase().slice(0, 6)}`;

  function store(profile) {
    localStorage.setItem(KEY, JSON.stringify(profile));
    localStorage.setItem('parisDeviceOwner', profile.memberName || '');
    document.documentElement.classList.add('paris-identity-ready');
    document.dispatchEvent(new CustomEvent('paris:identity-ready', { detail: profile }));
    try { window.ParisTrips?.register?.(profile); } catch {}
  }

  function inviteUrl(code) {
    const url = new URL(location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('paris_join', code);
    return url.toString();
  }

  function removeJoinParam() {
    const url = new URL(location.href);
    url.searchParams.delete('paris_join');
    history.replaceState({}, '', url.pathname + (url.search || '') + url.hash);
  }

  function addStyles() {
    if (document.getElementById('parisOnboardingCss')) return;
    const style = document.createElement('style');
    style.id = 'parisOnboardingCss';
    style.textContent = `
      .paris-onboarding{position:fixed;inset:0;z-index:30050;display:grid;place-items:center;padding:18px;background:linear-gradient(155deg,rgba(255,246,247,.98),rgba(239,249,251,.98));font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;overflow:auto;overscroll-behavior:contain}
      .paris-onboarding[hidden]{display:none}.po-shell{position:relative;width:min(1040px,100%);min-height:min(730px,calc(100vh - 36px));display:grid;grid-template-rows:auto 1fr auto;border:1px solid rgba(221,160,179,.42);border-radius:42px;background:rgba(255,255,255,.92);box-shadow:0 34px 100px rgba(45,68,86,.2);overflow:hidden;isolation:isolate}
      .po-shell:before,.po-shell:after{content:"";position:absolute;z-index:-1;border-radius:999px;filter:blur(1px);pointer-events:none}.po-shell:before{width:430px;height:430px;right:-190px;top:-210px;background:rgba(199,235,240,.58)}.po-shell:after{width:390px;height:390px;left:-180px;bottom:-210px;background:rgba(255,205,219,.58)}
      .po-header{display:flex;align-items:center;justify-content:space-between;gap:18px;padding:24px 30px 8px}.po-brand{display:flex;align-items:center;gap:10px;color:#345066;font-family:Georgia,serif;font-weight:900}.po-brand-mark{display:grid;place-items:center;width:38px;height:38px;border-radius:50%;background:#fff0f4;color:#db6889;box-shadow:0 8px 22px rgba(207,102,133,.18)}
      .po-progress{display:flex;gap:8px}.po-progress span{width:38px;height:7px;border-radius:99px;background:#e8eef0;transition:.35s}.po-progress span.is-active{background:linear-gradient(90deg,#e96d92,#8fcfd1)}.po-stage-label{font-size:12px;font-weight:900;color:#81909b;white-space:nowrap}
      .po-main{display:grid;align-items:center;padding:12px clamp(22px,5vw,62px) 28px}.po-slide{display:grid;grid-template-columns:minmax(0,1.05fr) minmax(300px,.95fr);gap:clamp(28px,5vw,70px);align-items:center;animation:poIn .46s cubic-bezier(.2,.8,.2,1) both}.po-slide.po-centered{grid-template-columns:1fr;max-width:760px;width:100%;justify-self:center;text-align:center}@keyframes poIn{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:none}}
      .po-kicker{display:inline-flex;align-items:center;gap:8px;width:max-content;padding:8px 13px;border-radius:999px;background:#fff0f4;color:#c35f7d;font-size:12px;font-weight:950;letter-spacing:.035em}.po-centered .po-kicker{margin-inline:auto}.po-title{margin:18px 0 12px;color:#304b61;font:900 clamp(42px,6.5vw,72px)/.98 Georgia,serif;letter-spacing:-.035em}.po-title.small{font-size:clamp(36px,5vw,58px)}.po-copy{max-width:660px;margin:0;color:#71818e;font-size:clamp(16px,1.8vw,20px);line-height:1.65}.po-centered .po-copy{margin-inline:auto}
      .po-art{position:relative;min-height:380px;display:grid;place-items:center}.po-art-card{position:relative;width:min(390px,94%);aspect-ratio:1.05;border-radius:44px;background:linear-gradient(145deg,#fff8fa,#edf9fa);box-shadow:0 25px 58px rgba(50,75,93,.14);border:1px solid rgba(222,192,202,.5);overflow:hidden}.po-art-sun{position:absolute;width:88px;height:88px;border-radius:50%;right:38px;top:42px;background:#ffd78c;box-shadow:0 0 0 18px rgba(255,215,140,.15)}.po-art-cloud{position:absolute;width:112px;height:38px;border-radius:99px;background:#fff;right:18px;top:120px;box-shadow:-28px -10px 0 -4px #fff,28px -6px 0 -8px #fff}.po-art-ground{position:absolute;inset:auto -8% 0;height:38%;border-radius:50% 50% 0 0/40% 40% 0 0;background:linear-gradient(#cce8df,#b9ddda)}
      .po-eiffel{position:absolute;left:50%;bottom:63px;width:128px;height:250px;transform:translateX(-50%)}.po-eiffel path{fill:none;stroke:#385b70;stroke-width:9;stroke-linecap:round;stroke-linejoin:round}.po-polaroid{position:absolute;width:112px;padding:8px 8px 28px;background:white;border-radius:8px;box-shadow:0 18px 32px rgba(53,69,82,.22)}.po-polaroid.one{left:20px;bottom:42px;transform:rotate(-8deg)}.po-polaroid.two{right:20px;bottom:35px;transform:rotate(8deg)}.po-polaroid .pic{height:86px;border-radius:4px;background:linear-gradient(#f9b7ca,#f8d7b0 55%,#8bc5ca 56%)}.po-heart-line{position:absolute;inset:20px;color:#ec7f9e;font-size:32px;letter-spacing:15px;text-align:center}
      .po-choice-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:18px;margin-top:30px}.po-choice{position:relative;min-height:220px;padding:26px;text-align:left;border:1px solid #e7dce0;border-radius:28px;background:linear-gradient(145deg,#fff,#fff8fa);box-shadow:0 14px 35px rgba(49,67,82,.08);cursor:pointer;transition:.22s}.po-choice:hover,.po-choice:focus-visible{transform:translateY(-4px);box-shadow:0 21px 48px rgba(49,67,82,.14);outline:none}.po-choice.shared{background:linear-gradient(145deg,#fff6f9,#f1fbfb)}.po-choice.join{background:linear-gradient(145deg,#f7fbff,#f1f7fb)}.po-choice-art{height:96px;display:flex;align-items:center;gap:12px}.po-person{display:grid;place-items:center;width:66px;height:82px;border-radius:36px 36px 25px 25px;background:#f8d6e0;color:#b84d70;font:900 24px Georgia,serif;box-shadow:0 10px 20px rgba(182,83,113,.13)}.po-person.blue{background:#d8eff1;color:#3b7479}.po-choice strong{display:block;color:#304b61;font-size:23px;margin-bottom:8px}.po-choice p{margin:0;color:#73828e;line-height:1.5}.po-choice-badge{position:absolute;right:18px;top:18px;padding:6px 10px;border-radius:99px;background:#eaf8f4;color:#3b7965;font-size:11px;font-weight:900}
      .po-connect-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:18px;margin-top:26px}.po-connect-card{padding:24px;border:1px solid #e5dde0;border-radius:26px;background:rgba(255,255,255,.78);text-align:left}.po-connect-card h3{margin:10px 0 7px;color:#304b61;font-size:22px}.po-connect-card p{margin:0 0 18px;color:#74828e;line-height:1.5}.po-connect-visual{height:96px;display:flex;align-items:center;justify-content:center}.po-phone{position:relative;width:54px;height:92px;border:5px solid #38566b;border-radius:15px;background:#f4fbfb;box-shadow:10px 10px 0 #f5d5df}.po-phone:after{content:"♡";position:absolute;inset:19px 0 auto;text-align:center;color:#e56f92;font-size:28px;font-weight:900}.po-code-art{display:flex;gap:7px}.po-code-art i{display:block;width:27px;height:40px;border-radius:8px;background:#edf4f5;border:1px solid #dbe5e8}.po-code-art i:nth-child(2),.po-code-art i:nth-child(5){background:#ffdfe7}
      .po-form{max-width:620px;margin:24px auto 0;text-align:left}.po-field{display:grid;gap:7px;margin:16px 0}.po-field label{font-weight:900;color:#405a6e}.po-field input{width:100%;box-sizing:border-box;padding:15px 17px;border:1px solid #d9e2e7;border-radius:16px;background:#fff;font:inherit;color:#2f485c;outline:none}.po-field input:focus{border-color:#e47b99;box-shadow:0 0 0 4px rgba(228,123,153,.12)}.po-scan-row{display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center}.po-scan-note{margin:8px 0 0;color:#7a8791;font-size:13px;line-height:1.5}.po-scanner{position:fixed;inset:0;z-index:30100;display:grid;place-items:center;padding:18px;background:rgba(26,42,54,.86);backdrop-filter:blur(8px)}.po-scanner-card{width:min(480px,100%);padding:18px;border-radius:28px;background:#fff;box-shadow:0 28px 80px rgba(0,0,0,.35);text-align:center}.po-scanner-video{width:100%;aspect-ratio:1;border-radius:20px;object-fit:cover;background:#172631}.po-scanner-guide{position:relative;margin-top:-100%;aspect-ratio:1;pointer-events:none;border:3px solid rgba(255,255,255,.9);border-radius:24px;transform:scale(.72)}.po-scanner-card h3{color:#304b61;margin:16px 0 6px}.po-scanner-card p{color:#71818e;margin:0 0 14px}.po-actions{display:flex;justify-content:center;gap:11px;flex-wrap:wrap;margin-top:24px}.po-btn{border:0;border-radius:999px;padding:14px 23px;font-weight:950;cursor:pointer;transition:.18s}.po-btn.primary{background:linear-gradient(135deg,#e96d92,#d95780);color:#fff;box-shadow:0 11px 25px rgba(217,87,128,.26)}.po-btn.secondary{background:#edf4f6;color:#405a6e}.po-btn:hover{transform:translateY(-1px)}.po-btn:disabled{opacity:.55;cursor:wait;transform:none}.po-error{display:none;margin:14px 0 0;padding:11px 14px;border-radius:13px;background:#fdebed;color:#9e3f55;font-weight:750}.po-error.show{display:block}
      .po-invite-summary{display:grid;gap:5px;margin:18px 0 4px;padding:15px 17px;border:1px solid #e3e8eb;border-radius:17px;background:linear-gradient(145deg,#f8fcfc,#fff7fa);color:#71818e}.po-invite-summary span{font-size:12px;font-weight:900;text-transform:uppercase;letter-spacing:.05em}.po-invite-summary strong{color:#304b61;font-size:20px;letter-spacing:.06em}.po-invite-summary small{line-height:1.45}
      .po-invite-box{display:grid;grid-template-columns:auto 1fr;gap:26px;align-items:center;max-width:690px;margin:26px auto 0;padding:22px;border:1px solid #e3dade;border-radius:28px;background:#fff}.po-qr{width:190px;height:190px;padding:9px;border:1px solid #e1d9dc;border-radius:22px;background:#fff}.po-code{display:inline-block;margin:10px 0;padding:11px 16px;border-radius:999px;background:#f0f5f7;color:#304b61;font-weight:950;letter-spacing:.11em}.po-member{display:inline-flex;align-items:center;gap:8px;padding:8px 12px;border-radius:999px;background:#eaf8f3;color:#34745b;font-size:13px;font-weight:850}.po-note{margin-top:15px;color:#7a8791;font-size:13px;line-height:1.5}
      .po-success-art{position:relative;width:230px;height:190px;margin:10px auto 18px}.po-success-circle{position:absolute;inset:10px 30px 20px;border-radius:50%;background:linear-gradient(145deg,#ffe5ec,#dff4f4);box-shadow:0 18px 45px rgba(61,85,101,.14)}.po-success-check{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);display:grid;place-items:center;width:82px;height:82px;border-radius:50%;background:#fff;color:#db6689;font-size:42px;font-weight:900;box-shadow:0 12px 30px rgba(72,93,107,.18)}.po-success-star{position:absolute;color:#e9a82b;font-size:25px}.po-success-star.a{left:12px;top:45px}.po-success-star.b{right:8px;top:22px}.po-success-star.c{right:28px;bottom:20px}.po-profile-pill{display:inline-flex;align-items:center;gap:9px;margin-top:18px;padding:10px 15px;border-radius:999px;background:#edf8f6;color:#3a7664;font-weight:900}
      .po-footer{display:flex;justify-content:center;padding:0 30px 25px;color:#9aa5ac;font-size:12px}.po-back-link{border:0;background:none;color:#b7657e;font-weight:900;text-decoration:underline;cursor:pointer}.paris-identity-ready .closure-person-switch button{display:none}.paris-identity-ready .closure-person-switch small{font-size:0}.paris-identity-ready .closure-person-switch small:after{content:"Dieses Gerät:";font-size:11px}.paris-identity-ready .device-owner{display:none}
      @media(max-width:760px){.paris-onboarding{padding:0}.po-shell{min-height:100%;border:0;border-radius:0}.po-header{padding:18px 18px 4px}.po-stage-label{display:none}.po-progress span{width:24px}.po-main{padding:12px 18px 24px}.po-slide{grid-template-columns:1fr;text-align:center;gap:12px}.po-kicker{margin-inline:auto}.po-copy{margin-inline:auto}.po-art{min-height:270px;order:-1}.po-art-card{width:270px;border-radius:34px}.po-eiffel{height:185px;width:95px;bottom:45px}.po-polaroid{width:78px;padding:6px 6px 20px}.po-polaroid .pic{height:57px}.po-choice-grid,.po-connect-grid{grid-template-columns:1fr;gap:12px}.po-choice{min-height:155px;padding:20px}.po-choice-art{height:62px}.po-person{width:52px;height:62px}.po-connect-card{padding:19px}.po-invite-box{grid-template-columns:1fr;text-align:center}.po-qr{width:170px;height:170px;margin:auto}.po-actions{display:grid}.po-btn{width:100%}.po-title{font-size:43px}.po-title.small{font-size:38px}.po-footer{padding-bottom:18px}}
    `;
    document.head.appendChild(style);
  }

  function shell() {
    addStyles();
    let root = document.getElementById('parisOnboarding');
    if (root) return root;
    root = document.createElement('div');
    root.id = 'parisOnboarding';
    root.className = 'paris-onboarding';
    root.hidden = true;
    root.innerHTML = `
      <section class="po-shell" role="dialog" aria-modal="true" aria-label="Paris Reise einrichten">
        <header class="po-header">
          <div class="po-brand"><span class="po-brand-mark">♡</span><span>Paris · Unser erster Hochzeitstag</span></div>
          <div class="po-progress" aria-label="Fortschritt"><span></span><span></span><span></span><span></span></div>
          <div class="po-stage-label" data-stage-label></div>
        </header>
        <main class="po-main" data-po-view></main>
        <footer class="po-footer">Einmal eingerichtet, erkennt die App dieses Gerät künftig automatisch.</footer>
      </section>`;
    document.body.appendChild(root);
    return root;
  }

  function setStage(stage, html) {
    const root = shell();
    root.hidden = false;
    root.querySelectorAll('.po-progress span').forEach((dot, index) => dot.classList.toggle('is-active', index < stage));
    const labels = ['✨ Willkommen', '❤️ Gemeinsam oder alleine?', '📱 Geräte verbinden', '🎉 Los geht\'s'];
    root.querySelector('[data-stage-label]').textContent = `${stage} / 4 · ${labels[stage - 1]}`;
    const view = root.querySelector('[data-po-view]');
    view.innerHTML = html;
    view.scrollTop = 0;
    return root;
  }

  function hide() { shell().hidden = true; }
  function showError(message) { const el = document.querySelector('.po-error'); if (el) { el.textContent = message; el.classList.add('show'); } }
  function loading(button, active, label = 'Wird eingerichtet …') { if (!button) return; button.disabled = active; if (active) { button.dataset.old = button.textContent; button.textContent = label; } else { button.textContent = button.dataset.old || button.textContent; } }

  async function rpcCreate(client, name, code, member) {
    const result = await client.rpc('create_trip_with_code', { trip_name: name, trip_code: code, owner_name: member });
    if (result.error) throw result.error;
    return result.data;
  }
  async function rpcJoin(client, code, member) {
    const result = await client.rpc('join_trip_by_code', { join_code: code, member_name: member });
    if (result.error) throw result.error;
    return result.data;
  }

  function welcome(next) {
    const root = setStage(1, `
      <div class="po-slide">
        <div>
          <span class="po-kicker">✨ Willkommen</span>
          <h1 class="po-title">Paris wartet auf euch.</h1>
          <p class="po-copy">Bevor euer gemeinsames Reisealbum beginnt, richtet ihr die App einmal ein. Danach bleiben Fotos, Erinnerungen, Momente und Tagesabschlüsse automatisch auf demselben Stand.</p>
          <div class="po-actions" style="justify-content:flex-start"><button class="po-btn primary" data-next>Unser Abenteuer starten</button></div>
        </div>
        <div class="po-art" aria-hidden="true">
          <div class="po-art-card"><div class="po-heart-line">♡ · ♡</div><div class="po-art-sun"></div><div class="po-art-cloud"></div><div class="po-art-ground"></div><svg class="po-eiffel" viewBox="0 0 180 360"><path d="M90 12 36 338M90 12l54 326M62 162h56M48 246h84M26 338h128M53 338q37-55 74 0"/></svg><div class="po-polaroid one"><div class="pic"></div></div><div class="po-polaroid two"><div class="pic"></div></div></div>
        </div>
      </div>`);
    root.querySelector('[data-next]').onclick = next;
  }

  function chooseMode(onSolo, onShared, onJoin, back) {
    const root = setStage(2, `
      <div class="po-slide po-centered">
        <div><span class="po-kicker">❤️ Gemeinsam oder alleine?</span><h1 class="po-title small">Wie möchtet ihr Erinnerungen sammeln?</h1><p class="po-copy">Richtet eine neue Reise ein oder verbindet dieses Gerät direkt mit einer Reise, die bereits auf einem anderen Gerät erstellt wurde.</p></div>
        <div class="po-choice-grid">
          <button class="po-choice" data-solo><div class="po-choice-art"><span class="po-person">Ich</span></div><strong>Ich reise alleine</strong><p>Ein persönliches Profil mit Cloud-Sicherung nur für dieses Gerät.</p></button>
          <button class="po-choice shared" data-shared><span class="po-choice-badge">Neue Reise</span><div class="po-choice-art"><span class="po-person">F</span><span style="color:#e36e91;font-size:27px">♡</span><span class="po-person blue">L</span></div><strong>Wir reisen gemeinsam</strong><p>Eine neue gemeinsame Reise erstellen und anschließend das zweite Gerät einladen.</p></button>
          <button class="po-choice join" data-join><div class="po-choice-art"><div class="po-code-art"><i></i><i></i><i></i><i></i><i></i></div></div><strong>Bestehender Reise beitreten</strong><p>QR-Code scannen oder Einladungscode manuell eingeben.</p></button>
        </div>
        <div><button class="po-back-link" data-back>Zurück</button></div>
      </div>`);
    root.querySelector('[data-solo]').onclick = onSolo;
    root.querySelector('[data-shared]').onclick = onShared;
    root.querySelector('[data-join]').onclick = onJoin;
    root.querySelector('[data-back]').onclick = back;
  }

  function soloSetup(client, resolve, back) {
    const root = setStage(3, `
      <div class="po-slide po-centered">
        <div><span class="po-kicker">📱 Dieses Gerät einrichten</span><h1 class="po-title small">Dein persönliches Reiseprofil</h1><p class="po-copy">Dein Name erscheint später bei Fotos, Erinnerungen und Einträgen.</p></div>
        <div class="po-form"><div class="po-field"><label>Dein Name</label><input data-name autocomplete="name" placeholder="Fabian"></div><div class="po-error"></div><div class="po-actions"><button class="po-btn secondary" data-back>Zurück</button><button class="po-btn primary" data-go>Profil einrichten</button></div></div>
      </div>`);
    root.querySelector('[data-back]').onclick = back;
    root.querySelector('[data-go]').onclick = async event => {
      const memberName = cleanName(root.querySelector('[data-name]').value);
      if (!memberName) return showError('Bitte gib deinen Namen ein.');
      loading(event.currentTarget, true);
      try {
        const joinCode = randomCode();
        const tripId = await rpcCreate(client, 'Meine Paris-Reise', joinCode, memberName);
        const profile = { tripId, memberName, role: 'owner', mode: 'solo', joinCode };
        store(profile);
        success(profile, resolve);
      } catch (error) { showError(error.message); loading(event.currentTarget, false); }
    };
  }

  function sharedSetup(client, resolve, back) {
    const root = setStage(3, `
      <div class="po-slide po-centered">
        <div><span class="po-kicker">📱 Geräte verbinden</span><h1 class="po-title small">Eine Reise, zwei persönliche Geräte</h1><p class="po-copy">Ein Gerät richtet eure Reise ein. Das zweite tritt anschließend per QR-Code oder Einladungscode bei.</p></div>
        <div class="po-connect-grid">
          <button class="po-connect-card po-choice shared" data-create><div class="po-connect-visual"><div class="po-phone"></div></div><h3>Reise einrichten</h3><p>Dieses Gerät wird Fabians oder Luisas erstes Profil und zeigt danach die Einladung.</p><span class="po-btn primary" style="display:inline-block">Reise erstellen</span></button>
          <button class="po-connect-card po-choice" data-join><div class="po-connect-visual"><div class="po-code-art"><i></i><i></i><i></i><i></i><i></i></div></div><h3>Reise beitreten</h3><p>Du hast bereits einen QR-Code gescannt oder einen Einladungscode erhalten.</p><span class="po-btn secondary" style="display:inline-block">Code eingeben</span></button>
        </div>
        <div><button class="po-back-link" data-back>Zurück</button></div>
      </div>`);
    root.querySelector('[data-back]').onclick = back;
    root.querySelector('[data-create]').onclick = () => createShared(client, resolve, () => sharedSetup(client, resolve, back));
    root.querySelector('[data-join]').onclick = () => joinShared(client, resolve, incoming, () => sharedSetup(client, resolve, back));
  }

  function createShared(client, resolve, back) {
    const existingTrip = localStorage.getItem(LEGACY_TRIP_KEY);
    const root = setStage(3, `
      <div class="po-slide po-centered"><div><span class="po-kicker">📱 Reise einrichten</span><h1 class="po-title small">Wer richtet eure Reise ein?</h1><p class="po-copy">Der Name wird dauerhaft diesem Gerät zugeordnet. Eure bereits vorhandenen Paris-Daten bleiben bestehen.</p></div><div class="po-form"><div class="po-field"><label>Dein Name</label><input data-name value="Fabian" autocomplete="name"></div><div class="po-error"></div><div class="po-actions"><button class="po-btn secondary" data-back>Zurück</button><button class="po-btn primary" data-go>Gemeinsame Reise erstellen</button></div></div></div>`);
    root.querySelector('[data-back]').onclick = back;
    root.querySelector('[data-go]').onclick = async event => {
      const memberName = cleanName(root.querySelector('[data-name]').value);
      if (!memberName) return showError('Bitte gib deinen Namen ein.');
      loading(event.currentTarget, true);
      try {
        let tripId, joinCode;
        if (existingTrip) {
          tripId = existingTrip;
          joinCode = DEFAULT_CODE;
          await rpcJoin(client, joinCode, memberName);
        } else {
          joinCode = randomCode();
          tripId = await rpcCreate(client, 'Paris · Unser erster Hochzeitstag', joinCode, memberName);
        }
        const profile = { tripId, memberName, role: 'owner', mode: 'shared', joinCode };
        store(profile);
        invite(profile, resolve);
      } catch (error) { showError(error.message); loading(event.currentTarget, false); }
    };
  }

  async function scanJoinQr(codeInput) {
    if (!('BarcodeDetector' in window) || !navigator.mediaDevices?.getUserMedia) {
      throw new Error('Der direkte QR-Scanner wird auf diesem Browser nicht unterstützt. Öffne den QR-Code mit der normalen Kamera-App oder gib den Code manuell ein.');
    }
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const overlay = document.createElement('div');
    overlay.className = 'po-scanner';
    overlay.innerHTML = `<div class="po-scanner-card"><video class="po-scanner-video" playsinline muted></video><div class="po-scanner-guide"></div><h3>Einladungs-QR-Code scannen</h3><p>Halte den QR-Code in den Rahmen.</p><button class="po-btn secondary" type="button">Abbrechen</button></div>`;
    document.body.appendChild(overlay);
    const video = overlay.querySelector('video');
    let stream;
    let stopped = false;
    const close = () => { stopped = true; stream?.getTracks().forEach(track => track.stop()); overlay.remove(); };
    overlay.querySelector('button').onclick = close;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
      video.srcObject = stream;
      await video.play();
      while (!stopped) {
        const codes = await detector.detect(video);
        if (codes.length) {
          const raw = String(codes[0].rawValue || '').trim();
          let code = raw;
          try { code = new URL(raw, location.href).searchParams.get('paris_join') || raw; } catch {}
          code = code.trim().toUpperCase();
          if (code) { codeInput.value = code; codeInput.dispatchEvent(new Event('input', { bubbles: true })); close(); return; }
        }
        await new Promise(r => setTimeout(r, 180));
      }
    } catch (error) { close(); throw error; }
  }


  function joinFromInvite(client, resolve, joinCode) {
    const root = setStage(3, `
      <div class="po-slide po-centered">
        <div><span class="po-kicker">❤️ Einladung angenommen</span><h1 class="po-title small">Wie heißt du?</h1><p class="po-copy">Du wurdest zu einer gemeinsamen Paris-Reise eingeladen. Trage nur noch deinen Namen ein, damit Fotos, Erinnerungen und Einträge später richtig zugeordnet werden.</p></div>
        <div class="po-form">
          <div class="po-field"><label>Dein Name</label><input data-name autocomplete="name" placeholder="Luisa" autofocus></div>
          <div class="po-invite-summary"><span>Einladungscode</span><strong>${joinCode}</strong><small>Der Code wurde über den QR-Link bereits automatisch übernommen.</small></div>
          <div class="po-error"></div>
          <div class="po-actions"><button class="po-btn primary" data-go>Der Reise beitreten</button></div>
        </div>
      </div>`);
    const nameInput = root.querySelector('[data-name]');
    window.setTimeout(() => nameInput?.focus(), 120);
    root.querySelector('[data-go]').onclick = async event => {
      const memberName = cleanName(nameInput.value);
      if (!memberName) return showError('Bitte gib deinen Namen ein.');
      loading(event.currentTarget, true, 'Reise wird verbunden …');
      try {
        const tripId = await rpcJoin(client, joinCode, memberName);
        const profile = { tripId, memberName, role: 'member', mode: 'shared', joinCode };
        store(profile);
        removeJoinParam();
        success(profile, resolve);
      } catch (error) {
        showError('Die Einladung konnte nicht geöffnet werden: ' + error.message);
        loading(event.currentTarget, false);
      }
    };
    nameInput.addEventListener('keydown', event => {
      if (event.key === 'Enter') root.querySelector('[data-go]').click();
    });
  }

  function joinShared(client, resolve, prefill = '', back) {
    const root = setStage(3, `
      <div class="po-slide po-centered"><div><span class="po-kicker">📱 Reise beitreten</span><h1 class="po-title small">Schön, dass du mitreist.</h1><p class="po-copy">Beim Scannen des QR-Codes ist der Einladungscode bereits eingesetzt.</p></div><div class="po-form"><div class="po-field"><label>Einladungscode</label><div class="po-scan-row"><input data-code value="${prefill}" autocomplete="off" autocapitalize="characters" placeholder="z. B. PARIS-8GJ4"><button class="po-btn secondary" type="button" data-scan>QR scannen</button></div><p class="po-scan-note">Alternativ kannst du den QR-Code auch mit der normalen Kamera-App öffnen. Dann wird der Code automatisch eingesetzt.</p></div><div class="po-field"><label>Dein Name</label><input data-name value="${prefill ? 'Luisa' : ''}" autocomplete="name"></div><div class="po-error"></div><div class="po-actions"><button class="po-btn secondary" data-back>Zurück</button><button class="po-btn primary" data-go>Mit der Reise verbinden</button></div></div></div>`);
    root.querySelector('[data-back]').onclick = back;
    root.querySelector('[data-scan]').onclick = async () => {
      try { await scanJoinQr(root.querySelector('[data-code]')); }
      catch (error) { showError(error.message || 'QR-Code konnte nicht gelesen werden.'); }
    };
    root.querySelector('[data-go]').onclick = async event => {
      const joinCode = root.querySelector('[data-code]').value.trim().toUpperCase();
      const memberName = cleanName(root.querySelector('[data-name]').value);
      if (!joinCode || !memberName) return showError('Bitte Einladungscode und Namen vollständig eintragen.');
      loading(event.currentTarget, true, 'Reise wird verbunden …');
      try {
        const tripId = await rpcJoin(client, joinCode, memberName);
        const profile = { tripId, memberName, role: 'member', mode: 'shared', joinCode };
        store(profile);
        removeJoinParam();
        success(profile, resolve);
      } catch (error) { showError('Die Einladung konnte nicht geöffnet werden: ' + error.message); loading(event.currentTarget, false); }
    };
  }

  function invite(profile, resolve) {
    const url = inviteUrl(profile.joinCode);
    const qr = `https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=12&data=${encodeURIComponent(url)}`;
    const root = setStage(3, `
      <div class="po-slide po-centered"><div><span class="po-kicker">📱 Geräte verbinden</span><h1 class="po-title small">Luisa kann jetzt dazukommen.</h1><p class="po-copy">QR-Code mit der Handykamera scannen oder den Einladungscode weitergeben.</p></div><div class="po-invite-box"><img class="po-qr" src="${qr}" alt="QR-Code für die gemeinsame Paris-Reise"><div><span class="po-member">✓ ${profile.memberName} · Reisebesitzer</span><br><span class="po-code">${profile.joinCode}</span><p class="po-note">Das zweite Gerät erhält ein eigenes Profil und ist danach automatisch derselben Reise zugeordnet.</p><div class="po-actions" style="justify-content:flex-start"><button class="po-btn secondary" data-copy>Einladungslink kopieren</button><button class="po-btn primary" data-next>Weiter</button></div></div></div></div>`);
    root.querySelector('[data-copy]').onclick = async event => { try { await navigator.clipboard.writeText(url); event.currentTarget.textContent = 'Link kopiert ✓'; } catch { event.currentTarget.textContent = 'Kopieren nicht möglich'; } };
    root.querySelector('[data-next]').onclick = () => success(profile, resolve);
  }

  function success(profile, resolve) {
    const together = profile.mode === 'shared';
    const root = setStage(4, `
      <div class="po-slide po-centered">
        <div class="po-success-art" aria-hidden="true"><div class="po-success-circle"></div><span class="po-success-star a">✦</span><span class="po-success-star b">✧</span><span class="po-success-star c">✦</span><div class="po-success-check">♡</div></div>
        <div><span class="po-kicker">🎉 Los geht's</span><h1 class="po-title small">Euer Paris-Abenteuer ist bereit.</h1><p class="po-copy">${together ? 'Dieses Gerät ist jetzt als ' + profile.memberName + ' mit eurer gemeinsamen Reise verbunden.' : 'Dein persönliches Reiseprofil ist eingerichtet.'} Ab jetzt werden eure Einträge automatisch richtig zugeordnet.</p><span class="po-profile-pill">✓ ${profile.memberName} · ${together ? (profile.role === 'owner' ? 'Reisebesitzer' : 'Mitreisend') : 'Allein unterwegs'}</span><div class="po-actions"><button class="po-btn primary" data-open>Reiseplan öffnen</button></div></div>
      </div>`);
    root.querySelector('[data-open]').onclick = () => {
      hide();
      resolve(profile);
      window.setTimeout(() => window.openParisTravelPlan?.(), 50);
    };
  }

  function run(client, resolve) {
    if (incoming) {
      joinFromInvite(client, resolve, incoming);
      return;
    }
    const joinExisting = () => joinShared(client, resolve, '', backToModes);
    const backToWelcome = () => welcome(() => chooseMode(
      () => soloSetup(client, resolve, backToModes),
      () => createShared(client, resolve, backToModes),
      joinExisting,
      backToWelcome
    ));
    const backToModes = () => chooseMode(
      () => soloSetup(client, resolve, backToModes),
      () => createShared(client, resolve, backToModes),
      joinExisting,
      backToWelcome
    );
    welcome(backToModes);
  }

  window.ParisOnboarding = {
    get profile() { return saved(); },
    async ensure(client) {
      let profile = saved();
      if (profile?.tripId && profile?.memberName && !incoming) {
        store(profile);
        hide();
        return profile;
      }
      return new Promise(resolve => run(client, resolve));
    },
    showInvite() {
      const profile = saved();
      if (!profile?.joinCode || profile.mode !== 'shared') return;
      invite(profile, () => hide());
    },
    reset() { localStorage.removeItem(KEY); location.reload(); }
  };

  addStyles();
})();
