(() => {
  'use strict';

  const euro = value => Number(value || 0).toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
  const pending = new Map();
  let limitPending = false;
  let rows = [];
  let limitValue = 600;
  let refreshRunning = false;
  let refreshQueued = false;
  let pollTimer = null;

  const list = document.getElementById('budgetList');
  const limit = document.getElementById('budgetLimit');
  const totalEl = document.getElementById('budgetTotal');
  const hintEl = document.getElementById('budgetHint');
  const ring = document.getElementById('budgetRing');
  const addButton = document.getElementById('addBudgetRow');
  if (!list || !limit || !totalEl || !hintEl || !ring || !addButton) return;

  function updateSummary() {
    const total = rows.reduce((sum, row) => sum + (Number(row.amount) || 0), 0);
    const remaining = limitValue - total;
    totalEl.textContent = euro(total);
    hintEl.textContent = limitValue ? `${euro(remaining)} übrig` : 'Kein Limit';
    hintEl.classList.toggle('budget-overrun', remaining < 0);
    ring.classList.toggle('is-over-budget', remaining < 0);
    ring.style.setProperty('--budget-angle', `${limitValue ? Math.min(360, total / limitValue * 360) : 0}deg`);
  }

  function scheduleSave(id, patch) {
    const previous = pending.get(id);
    if (previous?.timer) clearTimeout(previous.timer);

    const state = {
      patch: { ...(previous?.patch || {}), ...patch },
      revision: (previous?.revision || 0) + 1,
      saving: previous?.saving || false,
      timer: null
    };

    const revision = state.revision;
    state.timer = setTimeout(async () => {
      const current = pending.get(id);
      if (!current || current.revision !== revision) return;

      current.timer = null;
      current.saving = true;
      const snapshot = { ...current.patch };

      try {
        const saved = await window.ParisSync.budget.update(id, snapshot);
        const latest = pending.get(id);

        if (saved) {
          const row = rows.find(item => item.id === id);
          if (row) Object.assign(row, saved);
        }

        if (latest && latest.revision === revision) {
          pending.delete(id);
        } else if (latest) {
          latest.saving = false;
          scheduleSave(id, {});
        }
      } catch (error) {
        const latest = pending.get(id);
        if (latest) latest.saving = false;
        console.error('Budget konnte nicht gespeichert werden:', error);
      }
    }, 650);

    pending.set(id, state);
  }

  function render() {
    const focused = document.activeElement;
    const focusedId = focused?.closest?.('.budget-row')?.dataset.id;
    const focusedField = focused?.dataset?.field;
    const selectionStart = typeof focused?.selectionStart === 'number' ? focused.selectionStart : null;

    list.innerHTML = '';
    rows.forEach(row => {
      const wrap = document.createElement('div');
      wrap.className = 'budget-row';
      wrap.dataset.id = row.id;

      const name = document.createElement('input');
      name.setAttribute('aria-label', 'Bezeichnung');
      name.dataset.field = 'name';
      name.value = row.name;
      name.addEventListener('input', event => {
        row.name = event.target.value;
        scheduleSave(row.id, { name: row.name });
      });

      const amount = document.createElement('input');
      amount.setAttribute('aria-label', 'Betrag');
      amount.dataset.field = 'amount';
      amount.type = 'number';
      amount.min = '0';
      amount.step = '0.01';
      amount.value = Number(row.amount) || 0;
      amount.addEventListener('input', event => {
        row.amount = Number(event.target.value) || 0;
        updateSummary();
        scheduleSave(row.id, { amount: row.amount });
      });

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.setAttribute('aria-label', 'Entfernen');
      remove.textContent = '×';
      remove.addEventListener('click', async () => {
        rows = rows.filter(item => item.id !== row.id);
        render();
        try { await window.ParisSync.budget.remove(row.id); }
        catch (error) { console.error('Budgetposition konnte nicht gelöscht werden:', error); await refresh(); }
      });

      wrap.append(name, amount, remove);
      list.appendChild(wrap);
    });
    updateSummary();

    if (focusedId && focusedField) {
      const next = list.querySelector(`.budget-row[data-id="${CSS.escape(focusedId)}"] [data-field="${focusedField}"]`);
      if (next) {
        next.focus({ preventScroll: true });
        if (selectionStart !== null && next.setSelectionRange) next.setSelectionRange(selectionStart, selectionStart);
      }
    }
  }

  async function refresh() {
    if (refreshRunning) { refreshQueued = true; return; }
    refreshRunning = true;
    try {
      const cloudRows = await window.ParisSync.budget.list();
      let cloudLimit = limitValue;
      try {
        cloudLimit = await window.ParisSync.budget.getLimit();
      } catch (limitError) {
        // Die Positionen bleiben nutzbar, selbst wenn die neue
        // budget_settings-Tabelle noch nicht für die Data API freigegeben wurde.
        console.error('Gesamtbudget konnte nicht aus der Cloud geladen werden:', limitError);
      }
      const active = document.activeElement;
      const activeRowId = active?.closest?.('.budget-row')?.dataset.id;
      const activeField = active?.dataset?.field;
      const activeValue = active?.value;
      const limitIsActive = active === limit;

      const localById = new Map(rows.map(row => [row.id, row]));
      rows = cloudRows.map(row => {
        const local = localById.get(row.id);
        const pendingEdit = pending.get(row.id)?.patch;
        const merged = pendingEdit ? { ...row, ...local, ...pendingEdit } : { ...row };

        // Ein Feld, in dem gerade geschrieben wird, darf niemals von einem
        // älteren Realtime-/Polling-Stand überschrieben werden.
        if (row.id === activeRowId && activeField && local) {
          if (activeField === 'name') merged.name = String(activeValue ?? local.name ?? '');
          if (activeField === 'amount') merged.amount = Number(activeValue) || 0;
        }
        return merged;
      });

      if (!limitPending && !limitIsActive) {
        limitValue = cloudLimit;
        limit.value = String(limitValue);
      }
      render();
    } catch (error) {
      console.error('Budget konnte nicht synchronisiert werden:', error);
    } finally {
      refreshRunning = false;
      if (refreshQueued) { refreshQueued = false; refresh(); }
    }
  }

  addButton.addEventListener('click', async () => {
    addButton.disabled = true;
    try {
      const created = await window.ParisSync.budget.create({ name: 'Neue Position', amount: 0 });
      if (!rows.some(row => row.id === created.id)) rows.push(created);
      render();
      requestAnimationFrame(() => {
        const input = list.querySelector(`.budget-row[data-id="${CSS.escape(created.id)}"] [data-field="name"]`);
        input?.focus();
        input?.select();
      });
    } catch (error) {
      console.error('Budgetposition konnte nicht ergänzt werden:', error);
    } finally { addButton.disabled = false; }
  });

  let limitTimer;
  limit.addEventListener('input', () => {
    limitValue = Math.max(0, Number(limit.value) || 0);
    limitPending = true;
    updateSummary();
    clearTimeout(limitTimer);
    const valueToSave = limitValue;
    limitTimer = setTimeout(async () => {
      try {
        await window.ParisSync.budget.setLimit(valueToSave);
        if (limitValue === valueToSave) limitPending = false;
      } catch (error) {
        console.error('Gesamtbudget konnte nicht gespeichert werden:', error);
      }
    }, 650);
  });

  limit.addEventListener('blur', () => {
    // Nach dem Verlassen bleibt der lokale Wert geschützt, bis Supabase die
    // Änderung bestätigt hat. Anschließend wird der gemeinsame Stand geladen.
    if (!limitPending) refresh();
  });

  async function init() {
    try {
      await window.ParisSync.ready;
      await window.ParisSync.budget.ensureDefaults();
      await refresh();
      await window.ParisSync.budget.subscribe(() => refresh());
      const startPolling = () => {
        clearInterval(pollTimer);
        if (!document.hidden) pollTimer = setInterval(refresh, 2000);
      };
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) refresh();
        startPolling();
      });
      window.addEventListener('focus', refresh);
      window.addEventListener('online', refresh);
      startPolling();
    } catch (error) {
      console.error('Budget-Synchronisierung konnte nicht gestartet werden:', error);
    }
  }

  init();
})();
