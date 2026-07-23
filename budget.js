(() => {
  'use strict';

  const listeners = new Map();
  const state = {
    status: 'connecting',
    error: null,
    userId: null,
    tripId: null,
    client: null
  };

  function emit(event, detail) {
    (listeners.get(event) || new Set()).forEach(fn => {
      try { fn(detail); } catch (error) { console.warn('ParisSync listener:', error); }
    });
    document.dispatchEvent(new CustomEvent(`paris-sync:${event}`, { detail }));
  }

  function setStatus(status, error = null) {
    state.status = status;
    state.error = error ? String(error.message || error) : null;
    emit('status', { ...state });
  }

  const ready = (async () => {
    try {
      if (!window.ParisCloud?.ready) throw new Error('Cloud-Grundverbindung fehlt.');
      await window.ParisCloud.ready;
      state.client = window.ParisCloud.client;
      state.tripId = window.ParisCloud.tripId;
      const { data, error } = await state.client.auth.getUser();
      if (error) throw error;
      state.userId = data.user?.id || null;
      if (!state.tripId || !state.userId) throw new Error('Reise oder Benutzer konnte nicht ermittelt werden.');
      setStatus('ready');
      return { ...state };
    } catch (error) {
      setStatus('error', error);
      throw error;
    }
  })();

  window.ParisSync = {
    version: '2.0.0',
    ready,
    state,
    modules: {},
    on(event, callback) {
      if (!listeners.has(event)) listeners.set(event, new Set());
      listeners.get(event).add(callback);
      return () => listeners.get(event)?.delete(callback);
    },
    emit,
    requireReady: async () => {
      await ready;
      return state;
    },
    register(name, api) {
      this.modules[name] = api;
      this[name] = api;
      emit('module-ready', { name });
      return api;
    }
  };
})();
