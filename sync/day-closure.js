(() => {
  'use strict';
  let closureChannel = null;
  let statsChannel = null;
  async function context(){ return window.ParisSync.requireReady(); }
  function mapClosure(row){
    if(!row) return null;
    return {
      day: row.trip_day,
      best_moment: row.best_moment || '',
      shared_note: row.shared_note || '',
      lasting_memory: row.lasting_memory || '',
      favorite_photo_id: row.favorite_photo_id || null,
      day_rating: row.day_rating || null,
      food_rating: row.food_rating || null,
      field_meta: row.field_meta || {},
      updated_at: row.updated_at || null
    };
  }
  const api = {
    async list(){
      const {client,tripId}=await context();
      const [{data:closures,error:cErr},{data:stats,error:sErr}] = await Promise.all([
        client.from('day_closures').select('*').eq('trip_id',tripId).order('trip_day'),
        client.from('daily_member_stats').select('*').eq('trip_id',tripId).order('trip_day')
      ]);
      if(cErr) throw cErr; if(sErr) throw sErr;
      return {closures:(closures||[]).map(mapClosure),stats:stats||[]};
    },
    async saveField(day, field, value, memberName){
      const {client,tripId,userId}=await context();
      const now=new Date().toISOString();
      const existing=await client.from('day_closures').select('field_meta').eq('trip_id',tripId).eq('trip_day',day).maybeSingle();
      if(existing.error) throw existing.error;
      const meta={...(existing.data?.field_meta||{}),[field]:{user_id:userId,name:memberName||'Gemeinsam',at:now}};
      const payload={trip_id:tripId,trip_day:day,updated_by:userId,field_meta:meta,[field]:value===''?null:value};
      const {data,error}=await client.from('day_closures').upsert(payload,{onConflict:'trip_id,trip_day'}).select('*').single();
      if(error) throw error;
      return mapClosure(data);
    },
    async saveSteps(day,steps,memberName){
      const {client,tripId,userId}=await context();
      const {data,error}=await client.from('daily_member_stats').upsert({trip_id:tripId,trip_day:day,user_id:userId,steps:Number(steps),member_name:memberName||null},{onConflict:'trip_id,trip_day,member_name'}).select('*').single();
      if(error) throw error; return data;
    },
    async photoRows(){
      const {client,tripId}=await context();
      const {data,error}=await client.from('gallery_photos').select('id,taken_at,created_at,caption,description,storage_path').eq('trip_id',tripId).order('taken_at');
      if(error) throw error; return data||[];
    },
    async liveRows(){
      const {client,tripId}=await context();
      const {data,error}=await client.from('live_moment_status').select('moment_key,collected_at').eq('trip_id',tripId).not('collected_at','is',null);
      if(error) throw error; return data||[];
    },
    async subscribe(callback){
      const {client,tripId}=await context();
      if(closureChannel) await client.removeChannel(closureChannel);
      if(statsChannel) await client.removeChannel(statsChannel);
      closureChannel=client.channel(`day-closures-${tripId}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'day_closures',filter:`trip_id=eq.${tripId}`},callback).subscribe();
      statsChannel=client.channel(`day-stats-${tripId}-${Math.random().toString(36).slice(2)}`).on('postgres_changes',{event:'*',schema:'public',table:'daily_member_stats',filter:`trip_id=eq.${tripId}`},callback).subscribe();
      return async()=>{const a=closureChannel,b=statsChannel;closureChannel=statsChannel=null;if(a)await client.removeChannel(a);if(b)await client.removeChannel(b)};
    }
  };
  window.ParisSync.register('dayClosure',api);
})();
