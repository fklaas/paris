(() => {
  'use strict';

  const checklist = document.getElementById('memoryChecklist');
  const form = document.getElementById('memoryAddForm');
  const input = document.getElementById('memoryAddInput');
  const addButton = document.getElementById('memoryAddButton');
  const progressText = document.getElementById('memoryProgressText');
  const progressCount = document.getElementById('memoryProgressCount');
  const progressFill = document.getElementById('memoryProgressFill');
  if (!checklist || !form || !input || !addButton) return;

  const FIXED_KEYS = Array.from(checklist.querySelectorAll('[data-memory]')).map(el => el.dataset.memory);
  const statusMap = new Map();
  const pending = new Map();
  const writeGuards = new Map();
  let customRows = [];
  let refreshRunning = false;
  let refreshQueued = false;
  let pollTimer = null;

  const customAccents = ['#ea7899', '#58b3b5', '#a17bd8', '#e7a72d', '#65b69d'];
  const customIcons = ['♡', '✦', '📍', '📸', '🌷'];

  function keyForCustom(id) { return `custom:${id}`; }

  function guardedValue(key) {
    const guard = writeGuards.get(key);
    if (!guard) return null;
    if (Date.now() > guard.until) { writeGuards.delete(key); return null; }
    return guard.value;
  }

  function applyCheckboxState(box, key) {
    const guarded = guardedValue(key);
    const value = pending.has(key) ? pending.get(key) : guarded !== null ? guarded : Boolean(statusMap.get(key)?.completed);
    box.checked = value;
    box.closest('.memory-check')?.classList.toggle('is-complete', value);
  }

  function updateProgress() {
    const allKeys = [...FIXED_KEYS, ...customRows.map(row => keyForCustom(row.id))];
    const done = allKeys.filter(key => {
      if (pending.has(key)) return pending.get(key);
      const guarded = guardedValue(key);
      return guarded !== null ? guarded : Boolean(statusMap.get(key)?.completed);
    }).length;
    const total = allKeys.length;
    const percent = total ? Math.round(done / total * 100) : 0;
    if (progressCount) progressCount.textContent = `${done} / ${total}`;
    if (progressFill) progressFill.style.width = `${percent}%`;
    if (progressText) {
      progressText.textContent = done === 0 ? 'Noch wartet eure Paris-Liste' :
        done === total && total ? 'Alle Herzensmomente gesammelt! ♡' :
        done >= Math.ceil(total / 2) ? 'Eure Paris-Geschichte wächst' : 'Die ersten Erinnerungen sind gesammelt';
    }
  }

  async function changeStatus(key, checked, box) {
    const previous = Boolean(statusMap.get(key)?.completed);
    pending.set(key, checked);
    writeGuards.set(key, { value: checked, until: Date.now() + 8000 });
    applyCheckboxState(box, key);
    updateProgress();
    try {
      const saved = await window.ParisSync.reminders.setCompleted(key, checked);
      statusMap.set(key, saved);
      pending.delete(key);
      writeGuards.set(key, { value: checked, until: Date.now() + 3500 });
      applyCheckboxState(box, key);
      updateProgress();
      setTimeout(() => {
        const guard = writeGuards.get(key);
        if (guard && guard.value === checked) {
          writeGuards.delete(key);
          refresh();
        }
      }, 3600);
    } catch (error) {
      console.error('Erinnerung konnte nicht gespeichert werden:', error);
      pending.delete(key);
      writeGuards.delete(key);
      statusMap.set(key, { ...(statusMap.get(key) || { key }), completed: previous });
      applyCheckboxState(box, key);
      updateProgress();
    }
  }

  function bindFixed() {
    checklist.querySelectorAll('[data-memory]').forEach(box => {
      if (box.dataset.syncBound === '1') return;
      box.dataset.syncBound = '1';
      box.addEventListener('change', () => changeStatus(box.dataset.memory, box.checked, box));
    });
  }

  function renderCustom() {
    checklist.querySelectorAll('.memory-custom-row').forEach(node => node.remove());
    customRows.forEach((row, index) => {
      const wrap = document.createElement('div');
      wrap.className = 'memory-custom-row';
      wrap.dataset.customId = row.id;
      const accent = customAccents[index % customAccents.length];
      const icon = customIcons[index % customIcons.length];
      const label = document.createElement('label');
      label.className = 'memory-check';
      label.style.setProperty('--memory-accent', accent);
      const iconEl = document.createElement('span');
      iconEl.className = 'memory-check-icon';
      iconEl.textContent = icon;
      const text = document.createElement('span');
      text.className = 'memory-check-text';
      text.textContent = row.title;
      const box = document.createElement('input');
      box.type = 'checkbox';
      box.dataset.memory = keyForCustom(row.id);
      box.setAttribute('aria-label', `${row.title} abhaken`);
      box.addEventListener('change', () => changeStatus(box.dataset.memory, box.checked, box));
      label.append(iconEl, text, box);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.className = 'memory-delete';
      remove.textContent = '×';
      remove.setAttribute('aria-label', `${row.title} löschen`);
      remove.addEventListener('click', async event => {
        event.preventDefault();
        event.stopPropagation();
        remove.disabled = true;
        const oldRows = customRows;
        customRows = customRows.filter(item => item.id !== row.id);
        renderCustom();
        updateProgress();
        try { await window.ParisSync.reminders.removeCustom(row.id); }
        catch (error) {
          console.error('Eigene Erinnerung konnte nicht gelöscht werden:', error);
          customRows = oldRows;
          renderCustom();
          updateProgress();
        }
      });
      wrap.append(label, remove);
      checklist.appendChild(wrap);
      applyCheckboxState(box, box.dataset.memory);
    });
    bindFixed();
    checklist.querySelectorAll('[data-memory]').forEach(box => applyCheckboxState(box, box.dataset.memory));
    updateProgress();
  }

  async function migrateLocalOnce(remoteStatuses) {
    const marker = 'paris-reminders-cloud-migrated-v1';
    if (localStorage.getItem(marker)) return;
    localStorage.setItem(marker, '1');
    if (remoteStatuses.length) return;
    for (const key of FIXED_KEYS) {
      let checked = false;
      try { checked = JSON.parse(localStorage.getItem(`memory-${key}`) || 'false') === true; } catch {}
      if (checked) {
        try {
          const saved = await window.ParisSync.reminders.setCompleted(key, true);
          statusMap.set(key, saved);
        } catch (error) { console.warn('Altes Erinnerungshäkchen konnte nicht übernommen werden:', error); }
      }
    }
  }

  async function refresh() {
    if (refreshRunning) { refreshQueued = true; return; }
    refreshRunning = true;
    try {
      const [statuses, customs] = await Promise.all([
        window.ParisSync.reminders.listStatuses(),
        window.ParisSync.reminders.listCustom()
      ]);
      await migrateLocalOnce(statuses);
      const incoming = new Map(statuses.map(item => [item.key, item]));
      const allKeys = new Set([...statusMap.keys(), ...incoming.keys()]);
      allKeys.forEach(key => {
        const remote = incoming.get(key);
        const guard = writeGuards.get(key);
        if (guard && Date.now() <= guard.until) {
          if (remote && Boolean(remote.completed) === guard.value) {
            statusMap.set(key, remote);
            writeGuards.delete(key);
          } else {
            statusMap.set(key, { ...(statusMap.get(key) || { key }), completed: guard.value });
          }
        } else if (remote) {
          statusMap.set(key, remote);
        } else {
          statusMap.delete(key);
        }
      });
      customRows = customs;
      renderCustom();
    } catch (error) {
      console.error('Erinnerungen konnten nicht synchronisiert werden:', error);
    } finally {
      refreshRunning = false;
      if (refreshQueued) { refreshQueued = false; refresh(); }
    }
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const title = input.value.trim();
    if (!title) { input.focus(); return; }
    addButton.disabled = true;
    try {
      const created = await window.ParisSync.reminders.createCustom(title);
      if (!customRows.some(row => row.id === created.id)) customRows.push(created);
      input.value = '';
      renderCustom();
      input.focus();
    } catch (error) {
      console.error('Erinnerung konnte nicht hinzugefügt werden:', error);
    } finally { addButton.disabled = false; }
  });

  async function init() {
    bindFixed();
    await window.ParisSync.ready;
    await refresh();
    await window.ParisSync.reminders.subscribe(() => refresh(), status => {
      if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setTimeout(refresh, 500);
    });
    pollTimer = window.setInterval(() => { if (!document.hidden) refresh(); }, 2000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
    window.addEventListener('focus', refresh);
    window.addEventListener('online', refresh);
  }

  init().catch(error => console.error('Erinnerungsmodul konnte nicht gestartet werden:', error));
})();
