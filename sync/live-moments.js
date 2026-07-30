(() => {
  'use strict';

  let channel = null;
  let channelStatus = 'CLOSED';

  async function context() {
    return window.ParisSync.requireReady();
  }

  function fromRow(row) {
    return {
      key: row.moment_key,
      triggeredAt: row.triggered_at || null,
      triggeredBy: row.triggered_by || null,
      seenAt: row.seen_at || null,
      seenBy: row.seen_by || null,
      collectedAt: row.collected_at || null,
      collectedBy: row.collected_by || null,
      favorite: Boolean(row.is_favorite),
      linkedPhotoId: row.linked_photo_id || null,
      updatedAt: row.updated_at || null
    };
  }

  async function save(key, patch) {
    const { client, tripId, userId } = await context();
    const now = new Date().toISOString();
    const payload = { trip_id: tripId, moment_key: String(key) };

    if (patch.triggered) {
      payload.triggered_at = patch.triggeredAt || now;
      payload.triggered_by = userId;
    }
    if (patch.seen) {
      payload.triggered_at = patch.triggeredAt || patch.seenAt || now;
      payload.triggered_by = userId;
      payload.seen_at = patch.seenAt || now;
      payload.seen_by = userId;
    }
    if (patch.collected) {
      payload.triggered_at = patch.triggeredAt || patch.collectedAt || now;
      payload.triggered_by = userId;
      payload.seen_at = patch.seenAt || patch.collectedAt || now;
      payload.seen_by = userId;
      payload.collected_at = patch.collectedAt || now;
      payload.collected_by = userId;
    }
    if ('favorite' in patch) payload.is_favorite = Boolean(patch.favorite);
    if ('linkedPhotoId' in patch) payload.linked_photo_id = patch.linkedPhotoId || null;

    const { data, error } = await client.from('live_moment_status')
      .upsert(payload, { onConflict: 'trip_id,moment_key' })
      .select('*')
      .single();
    if (error) throw error;
    return fromRow(data);
  }

  const api = {
    async list() {
      const { client, tripId } = await context();
      const { data, error } = await client.from('live_moment_status')
        .select('*')
        .eq('trip_id', tripId)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return (data || []).map(fromRow);
    },

    markTriggered(key, at) { return save(key, { triggered: true, triggeredAt: at }); },
    markSeen(key, at) { return save(key, { seen: true, seenAt: at }); },
    collect(key, at) { return save(key, { collected: true, collectedAt: at }); },
    setFavorite(key, favorite) { return save(key, { favorite }); },
    linkPhoto(key, linkedPhotoId) { return save(key, { linkedPhotoId }); },

    async migrateLegacy(items) {
      const list = Array.isArray(items) ? items : [];
      for (const item of list) {
        const key = item.location || item.momentKey;
        if (!key) continue;
        await save(key, { collected: true, collectedAt: item.createdAt || new Date().toISOString() });
      }
    },

    async subscribe(callback, statusCallback) {
      const { client, tripId } = await context();
      if (channel) await client.removeChannel(channel);
      channelStatus = 'CONNECTING';
      channel = client.channel(`paris-sync-live-moments-${tripId}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'live_moment_status', filter: `trip_id=eq.${tripId}`
        }, payload => callback(payload))
        .subscribe(status => {
          channelStatus = status;
          statusCallback?.(status);
        });
      return () => {
        const current = channel;
        channel = null;
        channelStatus = 'CLOSED';
        return current ? client.removeChannel(current) : Promise.resolve();
      };
    },

    getRealtimeStatus() { return channelStatus; }
  };

  window.ParisSync.register('liveMoments', api);
})();
