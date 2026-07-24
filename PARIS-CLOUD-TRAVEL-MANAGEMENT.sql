-- Paris App: cloudbasierte Reiseverwaltung
-- Einmal vollständig im Supabase SQL Editor ausführen.

create table if not exists public.trip_settings (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  trip_name text not null default 'Paris · Unser erster Hochzeitstag',
  updated_at timestamptz not null default now(),
  updated_by uuid null
);

alter table public.trip_settings enable row level security;

-- Der Zugriff auf trip_settings erfolgt ausschließlich über die folgenden
-- SECURITY-DEFINER-Funktionen. Direkter Tabellenzugriff bleibt gesperrt.
revoke all on public.trip_settings from anon, authenticated;

create or replace function public.paris_is_trip_owner(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.trip_members tm
    where (to_jsonb(tm)->>'trip_id')::uuid = p_trip_id
      and (to_jsonb(tm)->>'user_id')::uuid = auth.uid()
      and lower(coalesce(to_jsonb(tm)->>'role','member')) in ('owner','admin')
  ) or exists (
    select 1
    from public.trips t
    where t.id = p_trip_id
      and nullif(to_jsonb(t)->>'owner_id','')::uuid = auth.uid()
  );
$$;

drop function if exists public.paris_list_my_trips();

create or replace function public.paris_list_my_trips()
returns table (
  trip_id uuid,
  trip_name text,
  join_code text,
  member_name text,
  member_role text,
  created_at timestamptz,
  member_count bigint,
  photos bigint,
  moments bigint,
  expenses bigint,
  closures bigint,
  notes bigint,
  total_content bigint,
  is_owner boolean
)
language sql
stable
security definer
set search_path = public
as $$
  with memberships as (
    select
      (to_jsonb(tm)->>'trip_id')::uuid as trip_id,
      coalesce(nullif(to_jsonb(tm)->>'display_name',''), nullif(to_jsonb(tm)->>'member_name',''), nullif(to_jsonb(tm)->>'name',''), 'Mitreisend') as member_name,
      lower(coalesce(nullif(to_jsonb(tm)->>'role',''), 'member')) as member_role
    from public.trip_members tm
    where (to_jsonb(tm)->>'user_id')::uuid = auth.uid()
  )
  select
    t.id,
    coalesce(s.trip_name, nullif(to_jsonb(t)->>'name',''), nullif(to_jsonb(t)->>'trip_name',''), 'Paris · Unser erster Hochzeitstag'),
    coalesce(nullif(to_jsonb(t)->>'join_code',''), nullif(to_jsonb(t)->>'code',''), nullif(to_jsonb(t)->>'trip_code','')),
    m.member_name,
    m.member_role,
    coalesce(nullif(to_jsonb(t)->>'created_at','')::timestamptz, now()),
    (select count(*) from public.trip_members tm2 where (to_jsonb(tm2)->>'trip_id')::uuid = t.id),
    (select count(*) from public.gallery_photos x where x.trip_id = t.id),
    (select count(*) from public.live_moments x where x.trip_id = t.id),
    (select count(*) from public.budget_entries x where x.trip_id = t.id),
    (select count(*) from public.day_closures x where x.trip_id = t.id),
    (select count(*) from public.day_notes x where x.trip_id = t.id),
    (select count(*) from public.gallery_photos x where x.trip_id = t.id)
      + (select count(*) from public.live_moments x where x.trip_id = t.id)
      + (select count(*) from public.budget_entries x where x.trip_id = t.id)
      + (select count(*) from public.day_closures x where x.trip_id = t.id)
      + (select count(*) from public.day_notes x where x.trip_id = t.id)
      + (select count(*) from public.favorites x where x.trip_id = t.id),
    public.paris_is_trip_owner(t.id)
  from memberships m
  join public.trips t on t.id = m.trip_id
  left join public.trip_settings s on s.trip_id = t.id
  order by coalesce(nullif(to_jsonb(t)->>'created_at','')::timestamptz, now()) desc;
$$;

create or replace function public.paris_rename_trip(p_trip_id uuid, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare v_name text;
begin
  if not public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Nur der Reisebesitzer darf diese Reise umbenennen.';
  end if;
  v_name := left(trim(coalesce(p_name,'')), 80);
  if length(v_name) < 2 then raise exception 'Bitte einen gültigen Reisenamen eingeben.'; end if;
  insert into public.trip_settings(trip_id, trip_name, updated_at, updated_by)
  values (p_trip_id, v_name, now(), auth.uid())
  on conflict (trip_id) do update set trip_name=excluded.trip_name, updated_at=now(), updated_by=auth.uid();
  return v_name;
end;
$$;

create or replace function public.paris_delete_empty_trip(p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_total bigint := 0;
  v_table text;
  v_count bigint;
begin
  if not public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Nur der Reisebesitzer darf diese Reise löschen.';
  end if;

  foreach v_table in array array[
    'gallery_photos','live_moments','budget_entries','day_closures','day_notes',
    'favorites','reminders','reminder_completions','phrase_favorites','custom_phrases'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('select count(*) from public.%I where trip_id = $1', v_table)
        into v_count using p_trip_id;
      v_total := v_total + coalesce(v_count,0);
    end if;
  end loop;

  if v_total > 0 then
    raise exception 'Diese Reise enthält noch % Einträge und wurde aus Sicherheitsgründen nicht gelöscht.', v_total;
  end if;

  delete from public.trip_settings where trip_id = p_trip_id;
  delete from public.trip_members tm where (to_jsonb(tm)->>'trip_id')::uuid = p_trip_id;
  delete from public.trips where id = p_trip_id;
  return jsonb_build_object('deleted', true, 'trip_id', p_trip_id);
end;
$$;

grant execute on function public.paris_list_my_trips() to anon, authenticated;
grant execute on function public.paris_rename_trip(uuid,text) to anon, authenticated;
grant execute on function public.paris_delete_empty_trip(uuid) to anon, authenticated;
grant execute on function public.paris_is_trip_owner(uuid) to anon, authenticated;

notify pgrst, 'reload schema';

-- Vollständiges Löschen einer eigenen Reise. Die App verlangt zusätzlich
-- die exakt eingegebene Bestätigung LÖSCHEN.
create or replace function public.paris_delete_trip(p_trip_id uuid, p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
declare
  v_table text;
begin
  if p_confirmation is distinct from 'LÖSCHEN' then
    raise exception 'Bestätigung fehlt.';
  end if;
  if not public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Nur der Reisebesitzer darf diese Reise endgültig löschen.';
  end if;

  foreach v_table in array array[
    'reminder_completions','reminders','phrase_favorites','custom_phrases',
    'favorites','day_notes','day_closures','budget_entries','live_moments','gallery_photos'
  ] loop
    if to_regclass('public.' || v_table) is not null then
      execute format('delete from public.%I where trip_id = $1', v_table) using p_trip_id;
    end if;
  end loop;

  -- Hochgeladene Galeriedateien liegen unter <trip-id>/...
  if to_regclass('storage.objects') is not null then
    delete from storage.objects
    where bucket_id = 'paris-gallery'
      and name like p_trip_id::text || '/%';
  end if;

  delete from public.trip_settings where trip_id = p_trip_id;
  delete from public.trip_members tm where (to_jsonb(tm)->>'trip_id')::uuid = p_trip_id;
  delete from public.trips where id = p_trip_id;
  return jsonb_build_object('deleted', true, 'trip_id', p_trip_id);
end;
$$;

create or replace function public.paris_leave_trip(p_trip_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Der Reisebesitzer kann die Reise nicht verlassen. Übertrage zuerst die Besitzerrolle oder lösche die Reise.';
  end if;
  delete from public.trip_members tm
  where (to_jsonb(tm)->>'trip_id')::uuid = p_trip_id
    and (to_jsonb(tm)->>'user_id')::uuid = auth.uid();
  return jsonb_build_object('left', true, 'trip_id', p_trip_id);
end;
$$;

grant execute on function public.paris_delete_trip(uuid,text) to anon, authenticated;
grant execute on function public.paris_leave_trip(uuid) to anon, authenticated;
notify pgrst, 'reload schema';
