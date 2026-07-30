(() => {
  'use strict';

  const DB_NAME = 'paris-reisegalerie';
  const DB_VERSION = 1;
  const STORE = 'photos';
  const NOTE_KEY = 'parisGalleryNotesV2';
  const OLD_NOTE_KEY = 'parisGalleryNotesV1';
  const GROUPS = ['2026-07-31', '2026-08-01', '2026-08-02', 'other'];
  const DAYS = {
    '2026-07-31': {
      short: '31. Juli 2026',
      dateLabel: 'Freitag, 31. Juli',
      title: 'Anreise & erstes Paris',
      subtitle: 'Die Fahrt, die Ankunft und der erste Blick auf Paris.',
      icon: '🗼',
      emptyIcon: '🚗',
      emptyText: 'Hier erscheinen automatisch alle Fotos, die am 31. Juli aufgenommen wurden.'
    },
    '2026-08-01': {
      short: '1. August 2026',
      dateLabel: 'Samstag, 1. August',
      title: 'Unser erster Hochzeitstag',
      subtitle: 'Disneyland Paris, kleine magische Momente und ganz viel Wir. ❤️',
      icon: '❤️',
      emptyIcon: '🏰',
      emptyText: 'Hier erscheinen automatisch alle Fotos vom Hochzeitstag und aus Disneyland.'
    },
    '2026-08-02': {
      short: '2. August 2026',
      dateLabel: 'Sonntag, 2. August',
      title: 'Au revoir Paris',
      subtitle: 'Ein letzter Tag, letzte Lieblingsorte und die Heimreise.',
      icon: '✨',
      emptyIcon: '🥐',
      emptyText: 'Hier erscheinen automatisch alle Fotos, die am 2. August aufgenommen wurden.'
    },
    other: {
      short: 'Weitere Aufnahmetage',
      dateLabel: 'Außerhalb der Reisetage',
      title: 'Weitere Reisemomente',
      subtitle: 'Testbilder und Fotos außerhalb des eigentlichen Reisezeitraums.',
      icon: '📂',
      emptyIcon: '🖼️',
      emptyText: 'Hier landen Bilder, deren Aufnahmedatum nicht zum 31. Juli, 1. August oder 2. August gehört.'
    }
  };

  const state = {
    photos: [],
    urls: new Map(),
    notes: loadNotes(),
    busy: false
  };
  const $ = (selector, root = document) => root.querySelector(selector);
  const els = {};

  function openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  async function getAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readonly').objectStore(STORE).getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => reject(request.error);
    });
  }

  async function put(item) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).put(item);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function del(id) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).delete(id);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  async function clearAll() {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const request = db.transaction(STORE, 'readwrite').objectStore(STORE).clear();
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  function loadNotes() {
    try {
      const current = localStorage.getItem(NOTE_KEY);
      if (current) return JSON.parse(current);
      const legacy = localStorage.getItem(OLD_NOTE_KEY);
      return legacy ? JSON.parse(legacy) : {};
    } catch {
      return {};
    }
  }

  function saveNotes() {
    localStorage.setItem(NOTE_KEY, JSON.stringify(state.notes));
  }

  function toast(message) {
    if (!els.toast) return;
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toast.timer);
    toast.timer = setTimeout(() => els.toast.classList.remove('show'), 2400);
  }

  function dateKey(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function tripGroup(key) {
    return DAYS[key] ? key : 'other';
  }

  function prettyTime(iso) {
    return new Intl.DateTimeFormat('de-DE', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
  }

  function prettyClock(iso) {
    return new Intl.DateTimeFormat('de-DE', { hour: '2-digit', minute: '2-digit' }).format(new Date(iso));
  }

  function uniqueId(file) {
    return `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`;
  }

  function arrayBufferSlice(file, start, length) {
    return file.slice(start, start + length).arrayBuffer();
  }

  async function exifDate(file) {
    if (!/jpe?g/i.test(file.type) && !/\.jpe?g$/i.test(file.name)) return null;
    try {
      const buffer = await arrayBufferSlice(file, 0, Math.min(file.size, 256 * 1024));
      const view = new DataView(buffer);
      if (view.getUint16(0, false) !== 0xFFD8) return null;
      let offset = 2;
      while (offset + 4 < view.byteLength) {
        if (view.getUint8(offset) !== 0xFF) break;
        const marker = view.getUint8(offset + 1);
        const length = view.getUint16(offset + 2, false);
        if (marker === 0xE1 && offset + 4 + length <= view.byteLength) {
          const start = offset + 4;
          if (view.getUint32(start, false) !== 0x45786966) return null;
          const tiff = start + 6;
          const little = view.getUint16(tiff, false) === 0x4949;
          const u16 = position => view.getUint16(position, little);
          const u32 = position => view.getUint32(position, little);
          const readAscii = (position, count) => {
            let value = '';
            for (let index = 0; index < count - 1 && position + index < view.byteLength; index++) value += String.fromCharCode(view.getUint8(position + index));
            return value;
          };
          const ifd0 = tiff + u32(tiff + 4);
          const count = u16(ifd0);
          let exifPointer = null;
          for (let index = 0; index < count; index++) {
            const entry = ifd0 + 2 + index * 12;
            if (u16(entry) === 0x8769) exifPointer = tiff + u32(entry + 8);
          }
          const parseIfd = position => {
            if (!position || position + 2 >= view.byteLength) return null;
            const entryCount = u16(position);
            for (let index = 0; index < entryCount; index++) {
              const entry = position + 2 + index * 12;
              const tag = u16(entry);
              const chars = u32(entry + 4);
              if (tag === 0x9003 || tag === 0x0132) {
                const pointer = chars <= 4 ? entry + 8 : tiff + u32(entry + 8);
                return readAscii(pointer, chars);
              }
            }
            return null;
          };
          const raw = parseIfd(exifPointer) || parseIfd(ifd0);
          if (raw) {
            const match = raw.match(/(\d{4}):(\d{2}):(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/);
            if (match) return new Date(+match[1], +match[2] - 1, +match[3], +match[4], +match[5], +match[6]);
          }
          return null;
        }
        if (marker === 0xDA || length < 2) break;
        offset += 2 + length;
      }
    } catch (error) {
      console.warn('EXIF-Datum nicht lesbar', error);
    }
    return null;
  }

  async function takenDate(file) {
    return await exifDate(file) || new Date(file.lastModified || Date.now());
  }

  function makeName(group, index) {
    const meta = DAYS[group] || DAYS.other;
    const prefix = group === 'other' ? 'Weitere' : meta.short.replace(' 2026', '');
    return `${prefix} · ${meta.title} · Foto ${String(index + 1).padStart(2, '0')}`;
  }

  function getUrl(photo) {
    if (!state.urls.has(photo.id)) state.urls.set(photo.id, URL.createObjectURL(photo.blob));
    return state.urls.get(photo.id);
  }

  function cleanupUrl(id) {
    const url = state.urls.get(id);
    if (url) URL.revokeObjectURL(url);
    state.urls.delete(id);
  }

  async function importFiles(files) {
    const images = [...files].filter(file => file.type.startsWith('image/'));
    if (!images.length) {
      toast('Bitte wählt Bilder aus.');
      return;
    }
    if (state.busy) return;
    state.busy = true;
    els.input.disabled = true;
    els.uploadText.textContent = 'Fotos werden sortiert …';
    let added = 0;
    try {
      for (const file of images) {
        const duplicate = state.photos.some(photo => photo.originalName === file.name && photo.size === file.size && photo.lastModified === file.lastModified);
        if (duplicate) continue;
        const date = await takenDate(file);
        const key = dateKey(date);
        const group = tripGroup(key);
        const item = {
          id: uniqueId(file),
          blob: file,
          originalName: file.name,
          size: file.size,
          lastModified: file.lastModified,
          takenAt: date.toISOString(),
          dateKey: key,
          group,
          favorite: false,
          polaroid: false,
          caption: '',
          createdAt: new Date().toISOString()
        };
        await put(item);
        state.photos.push(item);
        added++;
      }
      await normalizePolaroids();
      render();
      toast(added ? `${added} Foto${added === 1 ? '' : 's'} automatisch einsortiert` : 'Keine neuen Fotos gefunden');
    } catch (error) {
      console.error(error);
      toast('Die Fotos konnten nicht vollständig gespeichert werden.');
    } finally {
      state.busy = false;
      els.input.disabled = false;
      els.input.value = '';
      els.uploadText.textContent = 'Fotos auswählen';
    }
  }

  async function normalizePolaroids() {
    for (const group of GROUPS) {
      const selected = state.photos.filter(photo => photo.group === group && photo.polaroid);
      for (const photo of selected.slice(1)) {
        photo.polaroid = false;
        await put(photo);
      }
    }
  }

  async function updatePhoto(id, patch, rerender = true) {
    const photo = state.photos.find(item => item.id === id);
    if (!photo) return;
    Object.assign(photo, patch);
    await put(photo);
    if (rerender) render();
  }

  async function toggleFavorite(id) {
    const photo = state.photos.find(item => item.id === id);
    if (!photo) return;
    const nextValue = !photo.favorite;
    await updatePhoto(id, { favorite: nextValue });
    toast(nextValue ? 'Favorit hinzugefügt' : 'Favorit entfernt');
  }

  async function choosePolaroid(id) {
    const target = state.photos.find(photo => photo.id === id);
    if (!target) return;
    const nextValue = !target.polaroid;
    for (const photo of state.photos.filter(photo => photo.group === target.group)) {
      const value = photo.id === id ? nextValue : false;
      if (photo.polaroid !== value) {
        photo.polaroid = value;
        await put(photo);
      }
    }
    render();
    toast(nextValue ? 'Polaroid des Moments ausgewählt' : 'Polaroid des Moments entfernt');
  }

  async function removePhoto(id) {
    if (!confirm('Dieses Foto aus der Reisegalerie entfernen?')) return;
    await del(id);
    cleanupUrl(id);
    state.photos = state.photos.filter(photo => photo.id !== id);
    render();
    toast('Foto entfernt');
  }

  async function removeAll() {
    if (!state.photos.length && !Object.values(state.notes).some(value => String(value).trim())) return;
    if (!confirm('Alle lokal gespeicherten Galeriefotos und Tagesnotizen entfernen?')) return;
    await clearAll();
    state.urls.forEach(url => URL.revokeObjectURL(url));
    state.urls.clear();
    state.photos = [];
    state.notes = {};
    saveNotes();
    render();
    toast('Galerie wurde geleert');
  }

  function photoCard(photo, index, group, compact = false) {
    const card = document.createElement('article');
    card.className = `gallery-photo${compact ? ' gallery-photo-compact' : ''}`;
    card.innerHTML = `
      <div class="gallery-photo-media"><img alt="${escapeHtml(photo.caption || makeName(group, index))}"></div>
      <div class="gallery-photo-actions">
        <button class="gallery-icon-btn favorite ${photo.favorite ? 'active' : ''}" aria-label="${photo.favorite ? 'Favorit entfernen' : 'Als Favorit markieren'}" title="${photo.favorite ? 'Favorit entfernen' : 'Favorit hinzufügen'}">${photo.favorite ? '❤️' : '♡'}</button>
        ${compact ? '' : `<button class="gallery-icon-btn gallery-polaroid-btn ${photo.polaroid ? 'active' : ''}" aria-label="${photo.polaroid ? 'Polaroid entfernen' : 'Als Polaroid des Moments wählen'}" title="Polaroid des Moments">${photo.polaroid ? '⭐' : '☆'}</button>`}
      </div>
      ${compact ? '' : `<div class="gallery-photo-body"><div class="gallery-auto-name">${escapeHtml(makeName(group, index))}</div><span class="gallery-photo-time">Aufgenommen: ${escapeHtml(prettyTime(photo.takenAt))}</span><input class="gallery-caption" maxlength="100" placeholder="Kurze Bildunterschrift …" value="${escapeAttr(photo.caption || '')}"></div><button class="gallery-remove" aria-label="Foto entfernen">×</button>`}
    `;
    $('img', card).src = getUrl(photo);
    $('.favorite', card).addEventListener('click', () => toggleFavorite(photo.id));
    if (!compact) {
      $('.gallery-polaroid-btn', card).addEventListener('click', () => choosePolaroid(photo.id));
      const caption = $('.gallery-caption', card);
      caption.addEventListener('change', () => updatePhoto(photo.id, { caption: caption.value.trim() }));
      $('.gallery-remove', card).addEventListener('click', () => removePhoto(photo.id));
    }
    return card;
  }

  function dayCover(list, meta) {
    if (list.length) {
      const cover = list[0];
      return `<div class="gallery-day-cover has-photo"><img src="${getUrl(cover)}" alt="Titelbild ${escapeHtml(meta.title)}"><div class="gallery-cover-shade"></div><div class="gallery-cover-copy"><span>${escapeHtml(meta.dateLabel)}</span><strong>${escapeHtml(meta.title)}</strong><small>${escapeHtml(meta.subtitle)}</small></div></div>`;
    }
    return `<div class="gallery-day-cover gallery-day-cover-empty"><div class="gallery-cover-illustration" aria-hidden="true">${meta.emptyIcon}</div><div class="gallery-cover-copy"><span>${escapeHtml(meta.dateLabel)}</span><strong>${escapeHtml(meta.title)}</strong><small>${escapeHtml(meta.subtitle)}</small></div></div>`;
  }

  function dayPolaroid(list, group) {
    const selected = list.find(photo => photo.polaroid);
    if (!selected) {
      return `<div class="gallery-day-polaroid-empty"><span>⭐</span><div><strong>Polaroid des Moments</strong><small>Tippt bei eurem Lieblingsbild auf den Stern.</small></div></div>`;
    }
    return `<div class="gallery-day-polaroid"><div class="gallery-polaroid-badge">⭐ Polaroid des Moments</div><div class="gallery-polaroid-paper"><img src="${getUrl(selected)}" alt="Polaroid des Moments"><div class="gallery-polaroid-copy"><strong>${escapeHtml(selected.caption || 'Unser Moment in Paris')}</strong><span>${escapeHtml(DAYS[group].dateLabel)} · ${escapeHtml(prettyClock(selected.takenAt))} Uhr</span></div></div></div>`;
  }

  function renderHighlights() {
    const favorites = state.photos.filter(photo => photo.favorite).sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
    els.highlights.innerHTML = '';
    const section = document.createElement('section');
    section.className = 'gallery-highlights';
    section.innerHTML = `<div class="gallery-highlights-head"><div><span class="gallery-day-kicker">❤️ Unsere Highlights</span><h3>Lieblingsmomente auf einen Blick</h3><p>${favorites.length ? `${favorites.length} ausgewählte Erinnerung${favorites.length === 1 ? '' : 'en'} für euer späteres Reisebuch.` : 'Herzt eure schönsten Bilder – dann erscheinen sie automatisch hier.'}</p></div><span class="gallery-highlight-count">${favorites.length}</span></div><div class="gallery-highlight-grid"></div>`;
    const grid = $('.gallery-highlight-grid', section);
    if (favorites.length) {
      favorites.forEach(photo => {
        const groupList = state.photos.filter(item => item.group === photo.group).sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
        grid.appendChild(photoCard(photo, groupList.indexOf(photo), photo.group, true));
      });
    } else {
      grid.innerHTML = '<div class="gallery-highlight-empty"><span>♡</span><strong>Noch keine Favoriten</strong><small>Ein Tipp auf das Herz sammelt euer Foto hier.</small></div>';
    }
    els.highlights.appendChild(section);
  }

  function renderDay(group) {
    const list = state.photos.filter(photo => photo.group === group).sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
    const meta = DAYS[group];
    const favorites = list.filter(photo => photo.favorite).length;
    const day = document.createElement('article');
    day.className = `gallery-day gallery-day-${group === 'other' ? 'other' : 'trip'}`;
    day.innerHTML = `
      ${dayCover(list, meta)}
      <div class="gallery-day-inner">
        <div class="gallery-day-head">
          <div><span class="gallery-day-kicker">${meta.icon} ${escapeHtml(meta.short)}</span><h3>${escapeHtml(meta.title)}</h3><div class="gallery-day-count">${list.length} Foto${list.length === 1 ? '' : 's'} · ${favorites} Favorit${favorites === 1 ? '' : 'en'}</div></div>
        </div>
        ${dayPolaroid(list, group)}
        <div class="gallery-journal">
          <div class="gallery-journal-heading"><span>✍️</span><div><strong>Tagesnotiz</strong><small>Ein kleiner Satz reicht, um den Tag später wieder lebendig zu machen.</small></div></div>
          <textarea class="gallery-note" id="note-${group}" placeholder="Heute haben wir …">${escapeHtml(state.notes[group] || '')}</textarea>
        </div>
        <div class="gallery-grid"></div>
      </div>
    `;
    const note = $('.gallery-note', day);
    note.addEventListener('input', () => {
      state.notes[group] = note.value;
      saveNotes();
      updateStats();
    });
    const grid = $('.gallery-grid', day);
    if (list.length) {
      list.forEach((photo, index) => grid.appendChild(photoCard(photo, index, group)));
    } else {
      grid.innerHTML = `<div class="gallery-day-empty"><span>${meta.emptyIcon}</span><strong>Noch keine Fotos</strong><p>${escapeHtml(meta.emptyText)}</p></div>`;
    }
    return day;
  }

  function render() {
    state.photos.sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
    els.empty.hidden = state.photos.length > 0;
    renderHighlights();
    els.days.innerHTML = '';
    GROUPS.forEach(group => els.days.appendChild(renderDay(group)));
    updateStats();
    document.dispatchEvent(new CustomEvent('paris:gallery-updated', { detail: { count: state.photos.length } }));
  }

  function updateStats() {
    const favorites = state.photos.filter(photo => photo.favorite).length;
    const notes = Object.values(state.notes).filter(value => String(value).trim()).length;
    els.total.textContent = state.photos.length;
    els.favorites.textContent = favorites;
    els.notes.textContent = notes;
    els.bookSummary.textContent = `${state.photos.length} Fotos, ${favorites} Favoriten und ${notes} Tagesnotizen sind lokal für das spätere Reisebuch vorbereitet.`;
  }

  async function exportMetadata() {
    const data = {
      version: 2,
      createdAt: new Date().toISOString(),
      trip: 'Paris 2026',
      notes: state.notes,
      days: GROUPS.map(group => ({
        group,
        title: DAYS[group].title,
        coverPhotoId: state.photos.filter(photo => photo.group === group).sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt))[0]?.id || null,
        polaroidPhotoId: state.photos.find(photo => photo.group === group && photo.polaroid)?.id || null
      })),
      photos: state.photos.map(photo => {
        const groupPhotos = state.photos.filter(item => item.group === photo.group).sort((a, b) => new Date(a.takenAt) - new Date(b.takenAt));
        return {
          id: photo.id,
          originalName: photo.originalName,
          takenAt: photo.takenAt,
          dateKey: photo.dateKey,
          group: photo.group,
          automaticName: makeName(photo.group, groupPhotos.indexOf(photo)),
          caption: photo.caption,
          favorite: photo.favorite,
          polaroid: photo.polaroid
        };
      })
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'paris-reisebuch-daten.json';
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    toast('Reisebuch-Daten exportiert');
  }

  function escapeHtml(value) {
    return String(value).replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[character]));
  }

  function escapeAttr(value) {
    return escapeHtml(value);
  }

  async function init() {
    Object.assign(els, {
      input: $('#galleryInput'),
      uploadText: $('#galleryUploadText'),
      empty: $('#galleryEmpty'),
      highlights: $('#galleryHighlights'),
      days: $('#galleryDays'),
      total: $('#galleryTotal'),
      favorites: $('#galleryFavorites'),
      notes: $('#galleryNotes'),
      toast: $('#galleryToast'),
      bookSummary: $('#galleryBookSummary')
    });
    if (!els.input) return;
    els.input.addEventListener('change', event => importFiles(event.target.files));
    $('#galleryClear').addEventListener('click', removeAll);
    $('#galleryExport').addEventListener('click', exportMetadata);
    try {
      state.photos = await getAll();
      state.photos.forEach(photo => {
        photo.group = tripGroup(photo.dateKey || dateKey(new Date(photo.takenAt)));
        photo.favorite = Boolean(photo.favorite);
        photo.polaroid = Boolean(photo.polaroid);
        photo.caption = photo.caption || '';
      });
      await normalizePolaroids();
      render();
    } catch (error) {
      console.error(error);
      els.empty.innerHTML = '<div class="gallery-empty-icon">⚠️</div><h3>Lokaler Speicher nicht verfügbar</h3><p>Bitte öffnet die Seite in Safari oder als installierte Web-App und erlaubt die lokale Datenspeicherung.</p>';
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
