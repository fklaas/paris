-- Paris App: Teilnehmer-Center, Präsenz, Aktivitäten und Live-Karte
-- Einmal vollständig im Supabase SQL Editor ausführen.

create or replace function public.paris_is_trip_member(p_trip_id uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1 from public.trip_members tm
    where (to_jsonb(tm)->>'trip_id')::uuid=p_trip_id
      and (to_jsonb(tm)->>'user_id')::uuid=auth.uid()
  );
$$;

create table if not exists public.paris_member_profiles (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  member_name text not null,
  avatar_data text,
  avatar_color text not null default '#e76f91',
  location_sharing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(trip_id,user_id)
);

create table if not exists public.paris_member_presence (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  device_id text not null,
  member_name text not null,
  device_type text not null default 'Web',
  platform text,
  activity_key text,
  activity_text text,
  activity_at timestamptz,
  last_seen_at timestamptz not null default now(),
  last_sync_at timestamptz not null default now(),
  is_visible boolean not null default true,
  primary key(trip_id,user_id,device_id)
);

create table if not exists public.paris_member_locations (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  member_name text not null,
  latitude double precision not null,
  longitude double precision not null,
  accuracy double precision,
  heading double precision,
  speed double precision,
  place_label text,
  updated_at timestamptz not null default now(),
  primary key(trip_id,user_id)
);

create table if not exists public.paris_member_activity_feed (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  member_name text not null,
  activity_key text not null,
  activity_text text not null,
  created_at timestamptz not null default now()
);
create index if not exists paris_member_activity_feed_trip_created_idx on public.paris_member_activity_feed(trip_id,created_at desc);

alter table public.paris_member_profiles enable row level security;
alter table public.paris_member_presence enable row level security;
alter table public.paris_member_locations enable row level security;
alter table public.paris_member_activity_feed enable row level security;
revoke all on public.paris_member_profiles, public.paris_member_presence, public.paris_member_locations, public.paris_member_activity_feed from anon, authenticated;

create or replace function public.paris_upsert_member_profile(
  p_trip_id uuid,p_member_name text,p_avatar_data text default null,p_avatar_color text default '#e76f91',p_location_sharing boolean default false
) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  insert into public.paris_member_profiles(trip_id,user_id,member_name,avatar_data,avatar_color,location_sharing,updated_at)
  values(p_trip_id,auth.uid(),left(trim(p_member_name),60),p_avatar_data,left(coalesce(p_avatar_color,'#e76f91'),20),p_location_sharing,now())
  on conflict(trip_id,user_id) do update set member_name=excluded.member_name,
    avatar_data=coalesce(excluded.avatar_data,public.paris_member_profiles.avatar_data),
    avatar_color=excluded.avatar_color,location_sharing=excluded.location_sharing,updated_at=now();
  return jsonb_build_object('saved',true);
end;$$;

create or replace function public.paris_update_presence(
  p_trip_id uuid,p_device_id text,p_member_name text,p_device_type text,p_platform text,
  p_activity_key text default null,p_activity_text text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  insert into public.paris_member_presence(trip_id,user_id,device_id,member_name,device_type,platform,activity_key,activity_text,activity_at,last_seen_at,last_sync_at)
  values(p_trip_id,auth.uid(),left(p_device_id,100),left(trim(p_member_name),60),left(p_device_type,40),left(coalesce(p_platform,''),100),p_activity_key,p_activity_text,case when p_activity_text is null then null else now() end,now(),now())
  on conflict(trip_id,user_id,device_id) do update set member_name=excluded.member_name,device_type=excluded.device_type,
    platform=excluded.platform,activity_key=coalesce(excluded.activity_key,public.paris_member_presence.activity_key),
    activity_text=coalesce(excluded.activity_text,public.paris_member_presence.activity_text),
    activity_at=case when excluded.activity_text is null then public.paris_member_presence.activity_at else now() end,
    last_seen_at=now(),last_sync_at=now(),is_visible=true;
  return jsonb_build_object('saved',true,'at',now());
end;$$;

create or replace function public.paris_update_member_location(
  p_trip_id uuid,p_member_name text,p_latitude double precision,p_longitude double precision,
  p_accuracy double precision default null,p_heading double precision default null,p_speed double precision default null,p_place_label text default null
) returns jsonb language plpgsql security definer set search_path=public as $$
declare sharing boolean;
begin
  if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  select location_sharing into sharing from public.paris_member_profiles where trip_id=p_trip_id and user_id=auth.uid();
  if coalesce(sharing,false)=false then raise exception 'Standortfreigabe ist deaktiviert.'; end if;
  insert into public.paris_member_locations(trip_id,user_id,member_name,latitude,longitude,accuracy,heading,speed,place_label,updated_at)
  values(p_trip_id,auth.uid(),left(trim(p_member_name),60),p_latitude,p_longitude,p_accuracy,p_heading,p_speed,left(coalesce(p_place_label,''),180),now())
  on conflict(trip_id,user_id) do update set member_name=excluded.member_name,latitude=excluded.latitude,longitude=excluded.longitude,
    accuracy=excluded.accuracy,heading=excluded.heading,speed=excluded.speed,place_label=excluded.place_label,updated_at=now();
  return jsonb_build_object('saved',true);
end;$$;

create or replace function public.paris_add_member_activity(p_trip_id uuid,p_member_name text,p_activity_key text,p_activity_text text)
returns jsonb language plpgsql security definer set search_path=public as $$
begin
  if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
  insert into public.paris_member_activity_feed(trip_id,user_id,member_name,activity_key,activity_text)
  values(p_trip_id,auth.uid(),left(trim(p_member_name),60),left(p_activity_key,40),left(p_activity_text,180));
  delete from public.paris_member_activity_feed where trip_id=p_trip_id and created_at < now()-interval '24 hours';
  return jsonb_build_object('saved',true);
end;$$;

create or replace function public.paris_list_participants(p_trip_id uuid)
returns table(
 user_id uuid,member_name text,member_role text,avatar_data text,avatar_color text,location_sharing boolean,
 device_type text,platform text,last_seen_at timestamptz,last_sync_at timestamptz,activity_key text,activity_text text,activity_at timestamptz,
 latitude double precision,longitude double precision,accuracy double precision,heading double precision,speed double precision,place_label text,location_updated_at timestamptz,
 photos bigint,moments bigint,steps_today bigint
) language plpgsql stable security definer set search_path=public as $$
begin
 if not public.paris_is_trip_member(p_trip_id) then raise exception 'Kein Zugriff auf diese Reise.'; end if;
 return query
 with members as (
   select (to_jsonb(tm)->>'user_id')::uuid uid,
     coalesce(nullif(to_jsonb(tm)->>'display_name',''),nullif(to_jsonb(tm)->>'member_name',''),nullif(to_jsonb(tm)->>'name',''),'Mitreisend') nm,
     lower(coalesce(nullif(to_jsonb(tm)->>'role',''),'member')) rl
   from public.trip_members tm where (to_jsonb(tm)->>'trip_id')::uuid=p_trip_id
 ), latest_presence as (
   select distinct on (x.user_id) x.* from public.paris_member_presence x where x.trip_id=p_trip_id order by x.user_id,x.last_seen_at desc
 )
 select m.uid,coalesce(mp.member_name,m.nm),m.rl,mp.avatar_data,coalesce(mp.avatar_color,'#e76f91'),coalesce(mp.location_sharing,false),
   pr.device_type,pr.platform,pr.last_seen_at,pr.last_sync_at,pr.activity_key,pr.activity_text,pr.activity_at,
   case when coalesce(mp.location_sharing,false) then ml.latitude end,
   case when coalesce(mp.location_sharing,false) then ml.longitude end,
   case when coalesce(mp.location_sharing,false) then ml.accuracy end,
   case when coalesce(mp.location_sharing,false) then ml.heading end,
   case when coalesce(mp.location_sharing,false) then ml.speed end,
   case when coalesce(mp.location_sharing,false) then ml.place_label end,
   case when coalesce(mp.location_sharing,false) then ml.updated_at end,
   (select count(*) from public.gallery_photos g where g.trip_id=p_trip_id and g.created_by=m.uid),
   (select count(*) from public.live_moments lm where lm.trip_id=p_trip_id and nullif(to_jsonb(lm)->>'created_by','')::uuid=m.uid),
   coalesce((select max((to_jsonb(ds)->>'steps')::bigint) from public.daily_member_stats ds where (to_jsonb(ds)->>'trip_id')::uuid=p_trip_id and coalesce(to_jsonb(ds)->>'member_name','')=coalesce(mp.member_name,m.nm) and coalesce(to_jsonb(ds)->>'trip_day','')=to_char(current_date,'YYYY-MM-DD')),0)
 from members m left join public.paris_member_profiles mp on mp.trip_id=p_trip_id and mp.user_id=m.uid
 left join latest_presence pr on pr.user_id=m.uid left join public.paris_member_locations ml on ml.trip_id=p_trip_id and ml.user_id=m.uid
 order by case when m.rl in ('owner','admin') then 0 else 1 end,coalesce(mp.member_name,m.nm);
end;$$;

create or replace function public.paris_list_member_activity(p_trip_id uuid,p_limit integer default 30)
returns table(id bigint,user_id uuid,member_name text,activity_key text,activity_text text,created_at timestamptz)
language sql stable security definer set search_path=public as $$
 select a.id,a.user_id,a.member_name,a.activity_key,a.activity_text,a.created_at from public.paris_member_activity_feed a
 where a.trip_id=p_trip_id and public.paris_is_trip_member(p_trip_id) and a.created_at>now()-interval '24 hours'
 order by a.created_at desc limit greatest(1,least(coalesce(p_limit,30),100));
$$;

grant execute on function public.paris_is_trip_member(uuid) to anon,authenticated;
grant execute on function public.paris_upsert_member_profile(uuid,text,text,text,boolean) to anon,authenticated;
grant execute on function public.paris_update_presence(uuid,text,text,text,text,text,text) to anon,authenticated;
grant execute on function public.paris_update_member_location(uuid,text,double precision,double precision,double precision,double precision,double precision,text) to anon,authenticated;
grant execute on function public.paris_add_member_activity(uuid,text,text,text) to anon,authenticated;
grant execute on function public.paris_list_participants(uuid) to anon,authenticated;
grant execute on function public.paris_list_member_activity(uuid,integer) to anon,authenticated;
notify pgrst,'reload schema';
