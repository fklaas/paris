(() => {
  'use strict';

  let channel = null;
  let channelStatus = 'CLOSED';

  async function context() {
    return window.ParisSync.requireReady();
  }

  function statusFromRow(row) {
    return {
      key: row.reminder_key,
      completed: Boolean(row.is_completed),
      completedBy: row.completed_by || null,
      completedAt: row.completed_at || null,
      updatedAt: row.updated_at || null
    };
  }

  function customFromRow(row) {
    return {
      id: row.id,
      title: row.title || '',
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  const api = {
    async listStatuses() {
      const { client, tripId } = await context();
      const { data, error } = await client.from('reminder_status')
        .select('reminder_key,is_completed,completed_by,completed_at,updated_at')
        .eq('trip_id', tripId);
      if (error) throw error;
      return (data || []).map(statusFromRow);
    },

    async setCompleted(key, completed) {
      const { client, tripId, userId } = await context();
      const isDone = Boolean(completed);
      const payload = {
        trip_id: tripId,
        reminder_key: String(key),
        is_completed: isDone,
        completed_by: isDone ? userId : null,
        completed_at: isDone ? new Date().toISOString() : null
      };
      const { data, error } = await client.from('reminder_status')
        .upsert(payload, { onConflict: 'trip_id,reminder_key' })
        .select('reminder_key,is_completed,completed_by,completed_at,updated_at')
        .single();
      if (error) throw error;
      return statusFromRow(data);
    },

    async listCustom() {
      const { client, tripId } = await context();
      const { data, error } = await client.from('custom_reminders')
        .select('id,title,created_at,updated_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(customFromRow);
    },

    async createCustom(title) {
      const clean = String(title || '').trim();
      if (!clean) throw new Error('Bitte eine Erinnerung eingeben.');
      const { client, tripId, userId } = await context();
      const { data, error } = await client.from('custom_reminders')
        .insert({ trip_id: tripId, created_by: userId, title: clean })
        .select('id,title,created_at,updated_at')
        .single();
      if (error) throw error;
      return customFromRow(data);
    },

    async removeCustom(id) {
      const { client, tripId } = await context();
      const key = `custom:${id}`;
      const statusDelete = await client.from('reminder_status')
        .delete().eq('trip_id', tripId).eq('reminder_key', key);
      if (statusDelete.error) throw statusDelete.error;
      const { error } = await client.from('custom_reminders')
        .delete().eq('trip_id', tripId).eq('id', id);
      if (error) throw error;
    },

    async subscribe(callback, statusCallback) {
      const { client, tripId } = await context();
      if (channel) await client.removeChannel(channel);
      channelStatus = 'CONNECTING';
      channel = client.channel(`paris-sync-reminders-${tripId}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'reminder_status', filter: `trip_id=eq.${tripId}`
        }, payload => callback({ source: 'status', payload }))
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'custom_reminders', filter: `trip_id=eq.${tripId}`
        }, payload => callback({ source: 'custom', payload }))
        .subscribe(status => {
          channelStatus = status;
          if (statusCallback) statusCallback(status);
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

  window.ParisSync.register('reminders', api);
})();
