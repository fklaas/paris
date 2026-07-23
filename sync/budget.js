(() => {
  'use strict';

  let channel = null;
  let channelStatus = 'CLOSED';

  async function context() {
    return window.ParisSync.requireReady();
  }

  function rowToEntry(row) {
    return {
      id: row.id,
      name: row.title || '',
      amount: Number(row.amount_cents || 0) / 100,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };
  }

  const api = {
    async list() {
      const { client, tripId } = await context();
      const { data, error } = await client.from('budget_entries')
        .select('id,title,amount_cents,created_at,updated_at')
        .eq('trip_id', tripId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return (data || []).map(rowToEntry);
    },

    async create(entry) {
      const { client, tripId, userId } = await context();
      const payload = {
        ...(entry.id ? { id: entry.id } : {}),
        trip_id: tripId,
        created_by: userId,
        title: String(entry.name || 'Neue Position').trim() || 'Neue Position',
        category: 'Reisekosten',
        amount_cents: Math.max(0, Math.round((Number(entry.amount) || 0) * 100)),
        currency: 'EUR'
      };
      const { data, error } = await client.from('budget_entries')
        .upsert(payload, { onConflict: 'id' })
        .select('id,title,amount_cents,created_at,updated_at')
        .single();
      if (error) throw error;
      return rowToEntry(data);
    },

    async update(id, patch) {
      const { client, tripId } = await context();
      const mapped = {};
      if ('name' in patch) mapped.title = String(patch.name || '').trim() || 'Neue Position';
      if ('amount' in patch) mapped.amount_cents = Math.max(0, Math.round((Number(patch.amount) || 0) * 100));
      if (!Object.keys(mapped).length) return null;
      const { data, error } = await client.from('budget_entries')
        .update(mapped)
        .eq('trip_id', tripId)
        .eq('id', id)
        .select('id,title,amount_cents,created_at,updated_at')
        .single();
      if (error) throw error;
      return rowToEntry(data);
    },

    async remove(id) {
      const { client, tripId } = await context();
      const { error } = await client.from('budget_entries')
        .delete().eq('trip_id', tripId).eq('id', id);
      if (error) throw error;
    },

    async getLimit() {
      const { client, tripId } = await context();
      const { data, error } = await client.from('budget_settings')
        .select('budget_limit_cents')
        .eq('trip_id', tripId)
        .maybeSingle();
      if (error) throw error;
      return data ? Number(data.budget_limit_cents || 0) / 100 : 600;
    },

    async setLimit(amount) {
      const { client, tripId, userId } = await context();
      const { error } = await client.from('budget_settings').upsert({
        trip_id: tripId,
        updated_by: userId,
        budget_limit_cents: Math.max(0, Math.round((Number(amount) || 0) * 100))
      }, { onConflict: 'trip_id' });
      if (error) throw error;
    },

    async ensureDefaults() {
      const current = await this.list();
      if (current.length) return current;
      const defaults = [
        ['11111111-1111-4111-8111-111111111111', 'Hotel (bereits bezahlt)'],
        ['22222222-2222-4222-8222-222222222222', 'Disney-Tickets (bezahlt)'],
        ['33333333-3333-4333-8333-333333333333', 'Restaurants'],
        ['44444444-4444-4444-8444-444444444444', 'Maut & Laden'],
        ['55555555-5555-4555-8555-555555555555', 'Snacks & Souvenirs']
      ];
      for (const [id, name] of defaults) {
        try { await this.create({ id, name, amount: 0 }); } catch (error) {
          console.warn('Budget-Standardposition konnte nicht angelegt werden:', error.message);
        }
      }
      return this.list();
    },

    async subscribe(callback, statusCallback) {
      const { client, tripId } = await context();
      if (channel) await client.removeChannel(channel);
      channelStatus = 'CONNECTING';
      channel = client.channel(`paris-sync-budget-${tripId}-${Math.random().toString(36).slice(2)}`)
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'budget_entries', filter: `trip_id=eq.${tripId}`
        }, payload => callback({ source: 'entries', payload }))
        .on('postgres_changes', {
          event: '*', schema: 'public', table: 'budget_settings', filter: `trip_id=eq.${tripId}`
        }, payload => callback({ source: 'settings', payload }))
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

  window.ParisSync.register('budget', api);
})();
