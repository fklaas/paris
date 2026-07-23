(() => {
  'use strict';

  const BUCKET = 'paris-gallery';
  let channel = null;

  function extensionFor(photo) {
    return (photo.originalName?.split('.').pop() || photo.blob?.type?.split('/').pop() || 'jpg')
      .replace(/[^a-z0-9]/gi, '').toLowerCase() || 'jpg';
  }

  function rowToPhoto(row, blob) {
    const taken = row.taken_at || row.created_at;
    const date = new Date(taken);
    const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return {
      id: row.id,
      blob,
      storagePath: row.storage_path,
      originalName: row.original_filename || row.storage_path.split('/').pop(),
      size: row.file_size ?? blob.size,
      lastModified: new Date(row.created_at).getTime(),
      takenAt: taken,
      dateKey,
      group: ['2026-07-31', '2026-08-01', '2026-08-02'].includes(dateKey) ? dateKey : 'other',
      favorite: Boolean(row.is_favorite),
      polaroid: Boolean(row.is_polaroid),
      caption: row.description ?? row.caption ?? '',
      createdAt: row.created_at
    };
  }

  async function context() {
    return window.ParisSync.requireReady();
  }

  async function downloadRow(client, row) {
    const file = await client.storage.from(BUCKET).download(row.storage_path);
    if (file.error) throw file.error;
    return rowToPhoto(row, file.data);
  }

  const api = {
    bucket: BUCKET,

    async list() {
      const { client, tripId } = await context();
      const { data, error } = await client.from('gallery_photos')
        .select('*')
        .eq('trip_id', tripId)
        .order('taken_at', { ascending: true });
      if (error) throw error;

      const photos = [];
      for (const row of data || []) {
        try { photos.push(await downloadRow(client, row)); }
        catch (error) { console.warn(`Cloud-Foto ${row.id} konnte nicht geladen werden:`, error.message); }
      }
      return photos;
    },

    async get(id) {
      const { client, tripId } = await context();
      const result = await client.from('gallery_photos').select('*').eq('trip_id', tripId).eq('id', id).maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) return null;
      return downloadRow(client, result.data);
    },

    async upload(photo) {
      const { client, tripId, userId } = await context();
      if (!(photo.blob instanceof Blob)) throw new Error('Das Foto enthält keine gültige Bilddatei.');
      const path = `${tripId}/${photo.id}.${extensionFor(photo)}`;
      const upload = await client.storage.from(BUCKET).upload(path, photo.blob, {
        upsert: true,
        contentType: photo.blob.type || 'image/jpeg',
        cacheControl: '3600'
      });
      if (upload.error) throw upload.error;

      const record = {
        id: photo.id,
        trip_id: tripId,
        created_by: userId,
        storage_path: path,
        original_filename: photo.originalName || null,
        mime_type: photo.blob.type || null,
        file_size: photo.blob.size || photo.size || null,
        caption: photo.caption || '',
        description: photo.caption || '',
        is_favorite: Boolean(photo.favorite),
        is_polaroid: Boolean(photo.polaroid),
        taken_at: photo.takenAt || new Date().toISOString(),
        created_at: photo.createdAt || new Date().toISOString()
      };
      const saved = await client.from('gallery_photos').upsert(record, { onConflict: 'id' });
      if (saved.error) {
        await client.storage.from(BUCKET).remove([path]);
        throw saved.error;
      }
      photo.storagePath = path;
      return photo;
    },

    async update(id, patch) {
      const { client, tripId } = await context();
      const mapped = {};
      if ('favorite' in patch) mapped.is_favorite = Boolean(patch.favorite);
      if ('polaroid' in patch) mapped.is_polaroid = Boolean(patch.polaroid);
      if ('caption' in patch) {
        mapped.caption = patch.caption || '';
        mapped.description = patch.caption || '';
      }
      if (!Object.keys(mapped).length) return;
      const result = await client.from('gallery_photos').update(mapped).eq('trip_id', tripId).eq('id', id);
      if (result.error) throw result.error;
    },

    async remove(photo) {
      const { client, tripId } = await context();
      let path = photo.storagePath;
      if (!path) {
        const lookup = await client.from('gallery_photos').select('storage_path').eq('trip_id', tripId).eq('id', photo.id).maybeSingle();
        if (lookup.error) throw lookup.error;
        path = lookup.data?.storage_path;
      }
      if (path) {
        const storageResult = await client.storage.from(BUCKET).remove([path]);
        if (storageResult.error) throw storageResult.error;
      }
      const result = await client.from('gallery_photos').delete().eq('trip_id', tripId).eq('id', photo.id);
      if (result.error) throw result.error;
    },

    async clear() {
      const { client, tripId } = await context();
      const lookup = await client.from('gallery_photos').select('storage_path').eq('trip_id', tripId);
      if (lookup.error) throw lookup.error;
      const paths = (lookup.data || []).map(row => row.storage_path).filter(Boolean);
      if (paths.length) {
        const storageResult = await client.storage.from(BUCKET).remove(paths);
        if (storageResult.error) throw storageResult.error;
      }
      const result = await client.from('gallery_photos').delete().eq('trip_id', tripId);
      if (result.error) throw result.error;
    },

    async subscribe(callback) {
      const { client, tripId } = await context();
      if (channel) await client.removeChannel(channel);
      channel = client.channel(`paris-sync-gallery-${tripId}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'gallery_photos', filter: `trip_id=eq.${tripId}`
        }, payload => callback(payload))
        .subscribe();
      return () => client.removeChannel(channel);
    }
  };

  window.ParisSync.register('gallery', api);
})();
