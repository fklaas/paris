-- ============================================================================
-- REISEZEIT / PARIS 2026 · V13
-- Vollständige Supabase-Erstinstallation für ein LEERES Projekt
-- Zielprojekt: bsbvvikslbugkipdjrzs
--
-- Diese Datei ersetzt für eine Neuinstallation alle einzelnen PARIS-*.sql-
-- Erweiterungen. Im Supabase SQL Editor vollständig in EINEM Durchlauf starten.
-- ============================================================================

begin;

create extension if not exists pgcrypto;

grant usage on schema public to authenticated;

-- --------------------------------------------------------------------------
-- 1. Zentrale Reise- und Mitgliedschaftstabellen
-- --------------------------------------------------------------------------

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  code text not null,
  name text not null default 'Paris · Unser erster Hochzeitstag',
  owner uuid,
  owner_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trips_code_length check (char_length(trim(code)) between 4 and 64),
  constraint trips_name_length check (char_length(trim(name)) between 2 and 120)
);

create unique index if not exists trips_code_upper_unique
  on public.trips (upper(code));

create table if not exists public.trip_members (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  display_name text not null default 'Reisemitglied',
  role text not null default 'member',
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint trip_members_unique_user unique (trip_id, user_id),
  constraint trip_members_role_check check (role in ('owner','admin','member')),
  constraint trip_members_name_length check (char_length(trim(display_name)) between 1 and 80)
);

create index if not exists trip_members_user_idx on public.trip_members(user_id);
create index if not exists trip_members_trip_idx on public.trip_members(trip_id);

-- --------------------------------------------------------------------------
-- 2. Gemeinsame Reiseinhalte
-- --------------------------------------------------------------------------

create table if not exists public.live_moments (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  title text not null,
  description text,
  place text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.visited_places (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  title text not null,
  place text,
  note text,
  visited_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.day_notes (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  day text not null,
  note text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint day_notes_trip_day_unique unique (trip_id, day)
);

create table if not exists public.favorites (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  type text not null,
  reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  storage_path text not null unique,
  original_filename text,
  mime_type text,
  file_size bigint,
  caption text,
  description text,
  is_favorite boolean not null default false,
  is_polaroid boolean not null default false,
  taken_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint gallery_file_size_nonnegative check (file_size is null or file_size >= 0)
);

create index if not exists live_moments_trip_idx on public.live_moments(trip_id, created_at desc);
create index if not exists visited_places_trip_idx on public.visited_places(trip_id, visited_at desc);
create index if not exists day_notes_trip_idx on public.day_notes(trip_id, updated_at desc);
create index if not exists favorites_trip_idx on public.favorites(trip_id, created_at);
create index if not exists gallery_photos_trip_idx on public.gallery_photos(trip_id, taken_at, created_at);

-- --------------------------------------------------------------------------
-- 3. Budget
-- --------------------------------------------------------------------------

create table if not exists public.budget_entries (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  title text not null,
  category text not null default 'Reisekosten',
  amount_cents integer not null default 0,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint budget_entries_amount_nonnegative check (amount_cents >= 0),
  constraint budget_entries_currency_length check (char_length(currency) = 3)
);

create table if not exists public.budget_settings (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  budget_limit_cents integer not null default 60000,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint budget_settings_limit_nonnegative check (budget_limit_cents >= 0)
);

create index if not exists budget_entries_trip_created_idx
  on public.budget_entries(trip_id, created_at);

-- --------------------------------------------------------------------------
-- 4. Erinnerungen und Live-Moment-Status
-- --------------------------------------------------------------------------

create table if not exists public.reminder_status (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  reminder_key text not null,
  is_completed boolean not null default false,
  completed_by uuid,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint reminder_status_trip_key_unique unique (trip_id, reminder_key)
);

create table if not exists public.custom_reminders (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid not null default auth.uid(),
  title text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint custom_reminders_title_length check (char_length(trim(title)) between 1 and 120)
);

create table if not exists public.live_moment_status (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  moment_key text not null,
  triggered_at timestamptz,
  triggered_by uuid,
  seen_at timestamptz,
  seen_by uuid,
  collected_at timestamptz,
  collected_by uuid,
  is_favorite boolean not null default false,
  linked_photo_id text,
  updated_at timestamptz not null default now(),
  constraint live_moment_status_trip_key_unique unique (trip_id, moment_key)
);

create index if not exists reminder_status_trip_idx on public.reminder_status(trip_id);
create index if not exists custom_reminders_trip_created_idx on public.custom_reminders(trip_id, created_at);
create index if not exists live_moment_status_trip_updated_idx on public.live_moment_status(trip_id, updated_at desc);

-- --------------------------------------------------------------------------
-- 5. Gemeinsamer Tagesabschluss und Schritte
-- --------------------------------------------------------------------------

create table if not exists public.day_closures (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_day text not null,
  best_moment text,
  shared_note text,
  lasting_memory text,
  favorite_photo_id text,
  day_rating smallint,
  food_rating smallint,
  field_meta jsonb not null default '{}'::jsonb,
  updated_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint day_closures_trip_day_unique unique (trip_id, trip_day),
  constraint day_closures_rating_range check (day_rating is null or day_rating between 1 and 5),
  constraint day_closures_food_rating_range check (food_rating is null or food_rating between 1 and 5)
);

create table if not exists public.daily_member_stats (
  trip_id uuid not null references public.trips(id) on delete cascade,
  trip_day text not null,
  member_name text not null,
  user_id uuid not null default auth.uid(),
  steps bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (trip_id, trip_day, member_name),
  constraint daily_member_stats_steps_nonnegative check (steps >= 0)
);

create index if not exists day_closures_trip_day_idx on public.day_closures(trip_id, trip_day);
create index if not exists daily_member_stats_trip_day_idx on public.daily_member_stats(trip_id, trip_day);

-- --------------------------------------------------------------------------
-- 6. Cloud-Reiseverwaltung
-- --------------------------------------------------------------------------

create table if not exists public.trip_settings (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  trip_name text not null default 'Paris · Unser erster Hochzeitstag',
  updated_at timestamptz not null default now(),
  updated_by uuid
);

-- --------------------------------------------------------------------------
-- 7. Teilnehmer, Präsenz, Live-Karte und Aktivitätsfeed
-- --------------------------------------------------------------------------

create table if not exists public.paris_member_profiles (
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  member_name text not null,
  avatar_data text,
  avatar_color text not null default '#e76f91',
  location_sharing boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key (trip_id, user_id)
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
  primary key (trip_id, user_id, device_id)
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
  primary key (trip_id, user_id)
);

create table if not exists public.paris_member_activity_feed (
  id bigint generated always as identity primary key,
  trip_id uuid not null references public.trips(id) on delete cascade,
  user_id uuid not null,
  member_name text not null,
  activity_key text not null,
  activity_text text not null,
  event_type text,
  category text,
  icon text,
  metadata jsonb not null default '{}'::jsonb,
  aggregate_key text,
  event_count integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists paris_member_activity_feed_trip_created_idx
  on public.paris_member_activity_feed(trip_id, created_at desc);
create index if not exists paris_member_activity_feed_trip_updated_idx
  on public.paris_member_activity_feed(trip_id, updated_at desc);
create index if not exists paris_member_activity_feed_aggregate_idx
  on public.paris_member_activity_feed(trip_id, user_id, aggregate_key, updated_at desc)
  where aggregate_key is not null;

-- --------------------------------------------------------------------------
-- 8. Hilfsfunktionen und Zeitstempel
-- --------------------------------------------------------------------------

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.is_trip_member(check_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and exists (
    select 1
    from public.trip_members tm
    where tm.trip_id = check_trip_id
      and tm.user_id = auth.uid()
  );
$$;

create or replace function public.paris_is_trip_member(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.is_trip_member(p_trip_id);
$$;

create or replace function public.paris_is_trip_owner(p_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select auth.uid() is not null and (
    exists (
      select 1
      from public.trip_members tm
      where tm.trip_id = p_trip_id
        and tm.user_id = auth.uid()
        and tm.role in ('owner','admin')
    )
    or exists (
      select 1
      from public.trips t
      where t.id = p_trip_id
        and (t.owner = auth.uid() or t.owner_id = auth.uid())
    )
  );
$$;

-- Einen Storage-Pfad sicher in seine Reise-ID auflösen. Ungültige Pfade
-- liefern NULL statt einen Cast-Fehler in einer Storage-RLS-Policy.
create or replace function public.paris_storage_trip_id(object_name text)
returns uuid
language plpgsql
stable
security definer
set search_path = public, storage
as $$
declare
  folder text;
begin
  folder := (storage.foldername(object_name))[1];
  if folder is null then return null; end if;
  return folder::uuid;
exception when others then
  return null;
end;
$$;

-- updated_at-Trigger

do $$
declare
  table_name text;
  trigger_name text;
begin
  foreach table_name in array array[
    'trips','trip_members','live_moments','visited_places','day_notes','favorites',
    'gallery_photos','budget_entries','budget_settings','reminder_status',
    'custom_reminders','live_moment_status','day_closures','daily_member_stats',
    'trip_settings','paris_member_profiles','paris_member_activity_feed'
  ] loop
    trigger_name := table_name || '_set_updated_at';
    execute format('drop trigger if exists %I on public.%I', trigger_name, table_name);
    execute format(
      'create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      trigger_name, table_name
    );
  end loop;
end $$;

-- --------------------------------------------------------------------------
-- 9. Reise-RPCs
-- --------------------------------------------------------------------------

create or replace function public.create_trip_with_code(
  trip_name text,
  trip_code text,
  owner_name text default 'Fabian'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_trip_id uuid;
  clean_name text;
  clean_code text;
  clean_owner_name text;
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich.';
  end if;

  clean_name := left(trim(coalesce(trip_name, '')), 120);
  clean_code := upper(left(trim(coalesce(trip_code, '')), 64));
  clean_owner_name := left(coalesce(nullif(trim(owner_name), ''), 'Reisebesitzer'), 80);

  if char_length(clean_name) < 2 then
    raise exception 'Bitte einen gültigen Reisenamen eingeben.';
  end if;
  if char_length(clean_code) < 4 then
    raise exception 'Bitte einen gültigen Einladungscode eingeben.';
  end if;

  insert into public.trips(code, name, owner, owner_id)
  values(clean_code, clean_name, auth.uid(), auth.uid())
  returning id into new_trip_id;

  insert into public.trip_members(trip_id, user_id, display_name, role)
  values(new_trip_id, auth.uid(), clean_owner_name, 'owner');

  insert into public.trip_settings(trip_id, trip_name, updated_by)
  values(new_trip_id, clean_name, auth.uid())
  on conflict (trip_id) do update
    set trip_name = excluded.trip_name,
        updated_by = excluded.updated_by,
        updated_at = now();

  return new_trip_id;
exception
  when unique_violation then
    raise exception 'Dieser Einladungscode ist bereits vergeben. Bitte einen anderen Code verwenden.';
end;
$$;

create or replace function public.join_trip_by_code(
  join_code text,
  member_name text default 'Reisemitglied'
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  found_trip_id uuid;
  clean_member_name text;
begin
  if auth.uid() is null then
    raise exception 'Anmeldung erforderlich.';
  end if;

  select t.id into found_trip_id
  from public.trips t
  where upper(t.code) = upper(trim(join_code))
  limit 1;

  if found_trip_id is null then
    raise exception 'Reisecode nicht gefunden.';
  end if;

  clean_member_name := left(coalesce(nullif(trim(member_name), ''), 'Reisemitglied'), 80);

  insert into public.trip_members(trip_id, user_id, display_name, role)
  values(found_trip_id, auth.uid(), clean_member_name, 'member')
  on conflict (trip_id, user_id) do update
    set display_name = excluded.display_name,
        role = case
          when public.trip_members.role in ('owner','admin') then public.trip_members.role
          else 'member'
        end,
        updated_at = now();

  return found_trip_id;
end;
$$;

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
  select
    t.id,
    coalesce(s.trip_name, t.name, 'Paris · Unser erster Hochzeitstag'),
    t.code,
    tm.display_name,
    tm.role,
    t.created_at,
    (select count(*) from public.trip_members x where x.trip_id = t.id),
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
  from public.trip_members tm
  join public.trips t on t.id = tm.trip_id
  left join public.trip_settings s on s.trip_id = t.id
  where tm.user_id = auth.uid()
  order by t.created_at desc;
$$;

create or replace function public.paris_rename_trip(p_trip_id uuid, p_name text)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  clean_name text;
begin
  if not public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Nur der Reisebesitzer darf diese Reise umbenennen.';
  end if;

  clean_name := left(trim(coalesce(p_name, '')), 120);
  if char_length(clean_name) < 2 then
    raise exception 'Bitte einen gültigen Reisenamen eingeben.';
  end if;

  update public.trips
  set name = clean_name,
      updated_at = now()
  where id = p_trip_id;

  insert into public.trip_settings(trip_id, trip_name, updated_at, updated_by)
  values(p_trip_id, clean_name, now(), auth.uid())
  on conflict (trip_id) do update
    set trip_name = excluded.trip_name,
        updated_at = now(),
        updated_by = auth.uid();

  return clean_name;
end;
$$;

create or replace function public.paris_delete_trip(p_trip_id uuid, p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = public, storage
as $$
begin
  if p_confirmation is distinct from 'LÖSCHEN' then
    raise exception 'Bestätigung fehlt.';
  end if;
  if not public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Nur der Reisebesitzer darf diese Reise endgültig löschen.';
  end if;

  delete from storage.objects
  where bucket_id = 'paris-gallery'
    and name like p_trip_id::text || '/%';

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
  if not public.is_trip_member(p_trip_id) then
    raise exception 'Du bist kein Mitglied dieser Reise.';
  end if;
  if public.paris_is_trip_owner(p_trip_id) then
    raise exception 'Der Reisebesitzer kann die Reise nicht verlassen. Lösche die Reise oder übertrage zuerst die Besitzerrolle.';
  end if;

  delete from public.paris_member_presence
    where trip_id = p_trip_id and user_id = auth.uid();
  delete from public.paris_member_locations
    where trip_id = p_trip_id and user_id = auth.uid();
  delete from public.paris_member_profiles
    where trip_id = p_trip_id and user_id = auth.uid();
  delete from public.trip_members
    where trip_id = p_trip_id and user_id = auth.uid();

  return jsonb_build_object('left', true, 'trip_id', p_trip_id);
end;
$$;

create or replace function public.paris_claim_unowned_trip(p_trip_id uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  member_total integer;
  owner_exists boolean;
begin
  if not public.is_trip_member(p_trip_id) then
    raise exception 'Du bist kein Mitglied dieser Reise.';
  end if;

  select count(*) into member_total
  from public.trip_members
  where trip_id = p_trip_id;

  select exists(
    select 1
    from public.trip_members
    where trip_id = p_trip_id and role in ('owner','admin')
  ) or exists(
    select 1
    from public.trips
    where id = p_trip_id and (owner is not null or owner_id is not null)
  ) into owner_exists;

  if owner_exists then return true; end if;
  if member_total <> 1 then return false; end if;

  update public.trip_members
  set role = 'owner', updated_at = now()
  where trip_id = p_trip_id and user_id = auth.uid();

  update public.trips
  set owner = auth.uid(), owner_id = auth.uid(), updated_at = now()
  where id = p_trip_id;

  return true;
end;
$$;

-- --------------------------------------------------------------------------
-- 10. Teilnehmer-/Präsenz-RPCs
-- --------------------------------------------------------------------------

create or replace function public.paris_upsert_member_profile(
  p_trip_id uuid,
  p_member_name text,
  p_avatar_data text default null,
  p_avatar_color text default '#e76f91',
  p_location_sharing boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.paris_is_trip_member(p_trip_id) then
    raise exception 'Kein Zugriff auf diese Reise.';
  end if;

  insert into public.paris_member_profiles(
    trip_id, user_id, member_name, avatar_data, avatar_color,
    location_sharing, updated_at
  ) values (
    p_trip_id, auth.uid(), left(coalesce(nullif(trim(p_member_name), ''), 'Mitreisend'), 60), p_avatar_data,
    left(coalesce(p_avatar_color, '#e76f91'), 20), p_location_sharing, now()
  )
  on conflict (trip_id, user_id) do update
    set member_name = excluded.member_name,
        avatar_data = coalesce(excluded.avatar_data, public.paris_member_profiles.avatar_data),
        avatar_color = excluded.avatar_color,
        location_sharing = excluded.location_sharing,
        updated_at = now();

  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.paris_update_presence(
  p_trip_id uuid,
  p_device_id text,
  p_member_name text,
  p_device_type text,
  p_platform text,
  p_activity_key text default null,
  p_activity_text text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.paris_is_trip_member(p_trip_id) then
    raise exception 'Kein Zugriff auf diese Reise.';
  end if;

  insert into public.paris_member_presence(
    trip_id, user_id, device_id, member_name, device_type, platform,
    activity_key, activity_text, activity_at, last_seen_at, last_sync_at
  ) values (
    p_trip_id, auth.uid(), left(coalesce(nullif(p_device_id, ''), 'web-device'), 100), left(coalesce(nullif(trim(p_member_name), ''), 'Mitreisend'), 60),
    left(p_device_type, 40), left(coalesce(p_platform, ''), 100),
    p_activity_key, p_activity_text,
    case when p_activity_text is null then null else now() end,
    now(), now()
  )
  on conflict (trip_id, user_id, device_id) do update
    set member_name = excluded.member_name,
        device_type = excluded.device_type,
        platform = excluded.platform,
        activity_key = coalesce(excluded.activity_key, public.paris_member_presence.activity_key),
        activity_text = coalesce(excluded.activity_text, public.paris_member_presence.activity_text),
        activity_at = case
          when excluded.activity_text is null then public.paris_member_presence.activity_at
          else now()
        end,
        last_seen_at = now(),
        last_sync_at = now(),
        is_visible = true;

  return jsonb_build_object('saved', true, 'at', now());
end;
$$;

create or replace function public.paris_update_member_location(
  p_trip_id uuid,
  p_member_name text,
  p_latitude double precision,
  p_longitude double precision,
  p_accuracy double precision default null,
  p_heading double precision default null,
  p_speed double precision default null,
  p_place_label text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  sharing boolean;
begin
  if not public.paris_is_trip_member(p_trip_id) then
    raise exception 'Kein Zugriff auf diese Reise.';
  end if;

  select location_sharing into sharing
  from public.paris_member_profiles
  where trip_id = p_trip_id and user_id = auth.uid();

  if coalesce(sharing, false) = false then
    raise exception 'Standortfreigabe ist deaktiviert.';
  end if;

  insert into public.paris_member_locations(
    trip_id, user_id, member_name, latitude, longitude, accuracy,
    heading, speed, place_label, updated_at
  ) values (
    p_trip_id, auth.uid(), left(coalesce(nullif(trim(p_member_name), ''), 'Mitreisend'), 60), p_latitude,
    p_longitude, p_accuracy, p_heading, p_speed,
    left(coalesce(p_place_label, ''), 180), now()
  )
  on conflict (trip_id, user_id) do update
    set member_name = excluded.member_name,
        latitude = excluded.latitude,
        longitude = excluded.longitude,
        accuracy = excluded.accuracy,
        heading = excluded.heading,
        speed = excluded.speed,
        place_label = excluded.place_label,
        updated_at = now();

  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.paris_add_member_activity(
  p_trip_id uuid,
  p_member_name text,
  p_activity_key text,
  p_activity_text text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.paris_is_trip_member(p_trip_id) then
    raise exception 'Kein Zugriff auf diese Reise.';
  end if;

  insert into public.paris_member_activity_feed(
    trip_id, user_id, member_name, activity_key, activity_text,
    event_type, category, icon, created_at, updated_at
  ) values (
    p_trip_id, auth.uid(), left(coalesce(nullif(trim(p_member_name), ''), 'Mitreisend'), 60),
    left(coalesce(nullif(p_activity_key, ''), 'general'), 40), left(p_activity_text, 220),
    left(p_activity_key || '.action', 80), left(p_activity_key, 40), '•', now(), now()
  );

  delete from public.paris_member_activity_feed
  where trip_id = p_trip_id and updated_at < now() - interval '24 hours';

  return jsonb_build_object('saved', true);
end;
$$;

create or replace function public.paris_list_participants(p_trip_id uuid)
returns table (
  user_id uuid,
  member_name text,
  member_role text,
  avatar_data text,
  avatar_color text,
  location_sharing boolean,
  device_type text,
  platform text,
  last_seen_at timestamptz,
  last_sync_at timestamptz,
  activity_key text,
  activity_text text,
  activity_at timestamptz,
  latitude double precision,
  longitude double precision,
  accuracy double precision,
  heading double precision,
  speed double precision,
  place_label text,
  location_updated_at timestamptz,
  photos bigint,
  moments bigint,
  steps_today bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if not public.paris_is_trip_member(p_trip_id) then
    raise exception 'Kein Zugriff auf diese Reise.';
  end if;

  return query
  with latest_presence as (
    select distinct on (p.user_id) p.*
    from public.paris_member_presence p
    where p.trip_id = p_trip_id
    order by p.user_id, p.last_seen_at desc
  )
  select
    tm.user_id,
    coalesce(mp.member_name, tm.display_name),
    tm.role,
    mp.avatar_data,
    coalesce(mp.avatar_color, '#e76f91'),
    coalesce(mp.location_sharing, false),
    pr.device_type,
    pr.platform,
    pr.last_seen_at,
    pr.last_sync_at,
    pr.activity_key,
    pr.activity_text,
    pr.activity_at,
    case when coalesce(mp.location_sharing, false) then ml.latitude end,
    case when coalesce(mp.location_sharing, false) then ml.longitude end,
    case when coalesce(mp.location_sharing, false) then ml.accuracy end,
    case when coalesce(mp.location_sharing, false) then ml.heading end,
    case when coalesce(mp.location_sharing, false) then ml.speed end,
    case when coalesce(mp.location_sharing, false) then ml.place_label end,
    case when coalesce(mp.location_sharing, false) then ml.updated_at end,
    (select count(*) from public.gallery_photos g
      where g.trip_id = p_trip_id and g.created_by = tm.user_id),
    (select count(*) from public.live_moments lm
      where lm.trip_id = p_trip_id and lm.created_by = tm.user_id),
    coalesce((
      select max(ds.steps)
      from public.daily_member_stats ds
      where ds.trip_id = p_trip_id
        and ds.member_name = coalesce(mp.member_name, tm.display_name)
        and ds.trip_day = to_char(current_date, 'YYYY-MM-DD')
    ), 0)
  from public.trip_members tm
  left join public.paris_member_profiles mp
    on mp.trip_id = p_trip_id and mp.user_id = tm.user_id
  left join latest_presence pr on pr.user_id = tm.user_id
  left join public.paris_member_locations ml
    on ml.trip_id = p_trip_id and ml.user_id = tm.user_id
  where tm.trip_id = p_trip_id
  order by case when tm.role in ('owner','admin') then 0 else 1 end,
           coalesce(mp.member_name, tm.display_name);
end;
$$;

create or replace function public.paris_list_member_activity(
  p_trip_id uuid,
  p_limit integer default 30
)
returns table (
  id bigint,
  user_id uuid,
  member_name text,
  activity_key text,
  activity_text text,
  created_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select a.id, a.user_id, a.member_name, a.activity_key, a.activity_text, a.created_at
  from public.paris_member_activity_feed a
  where a.trip_id = p_trip_id
    and public.paris_is_trip_member(p_trip_id)
    and a.created_at > now() - interval '24 hours'
  order by a.created_at desc
  limit greatest(1, least(coalesce(p_limit, 30), 100));
$$;

create or replace function public.paris_track_event(
  p_trip_id uuid,
  p_member_name text,
  p_event_type text,
  p_category text,
  p_activity_text text,
  p_icon text default null,
  p_metadata jsonb default '{}'::jsonb,
  p_aggregate_key text default null,
  p_aggregate_window_seconds integer default 0
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  existing_id bigint;
  saved_id bigint;
begin
  if not public.paris_is_trip_member(p_trip_id) then
    raise exception 'Kein Zugriff auf diese Reise.';
  end if;

  if p_aggregate_key is not null and coalesce(p_aggregate_window_seconds, 0) > 0 then
    select a.id into existing_id
    from public.paris_member_activity_feed a
    where a.trip_id = p_trip_id
      and a.user_id = auth.uid()
      and a.aggregate_key = left(p_aggregate_key, 120)
      and a.updated_at > now() - (
        greatest(1, least(p_aggregate_window_seconds, 300)) || ' seconds'
      )::interval
    order by a.updated_at desc
    limit 1
    for update;
  end if;

  if existing_id is not null then
    update public.paris_member_activity_feed
    set activity_text = left(p_activity_text, 220),
        event_count = event_count + 1,
        updated_at = now(),
        metadata = coalesce(metadata, '{}'::jsonb) || coalesce(p_metadata, '{}'::jsonb),
        icon = coalesce(p_icon, icon)
    where id = existing_id
    returning id into saved_id;
  else
    insert into public.paris_member_activity_feed(
      trip_id, user_id, member_name, activity_key, activity_text,
      event_type, category, icon, metadata, aggregate_key,
      event_count, created_at, updated_at
    ) values (
      p_trip_id, auth.uid(), left(coalesce(nullif(trim(p_member_name), ''), 'Mitreisend'), 60),
      left(coalesce(nullif(p_category, ''), 'general'), 40), left(p_activity_text, 220),
      left(p_event_type, 80), left(coalesce(p_category, 'general'), 40),
      left(coalesce(p_icon, '•'), 12), coalesce(p_metadata, '{}'::jsonb),
      left(p_aggregate_key, 120), 1, now(), now()
    ) returning id into saved_id;
  end if;

  delete from public.paris_member_activity_feed
  where trip_id = p_trip_id and updated_at < now() - interval '24 hours';

  return jsonb_build_object(
    'saved', true,
    'aggregated', existing_id is not null,
    'id', saved_id
  );
end;
$$;

create or replace function public.paris_list_activity_events(
  p_trip_id uuid,
  p_limit integer default 100
)
returns table (
  id bigint,
  user_id uuid,
  member_name text,
  activity_key text,
  activity_text text,
  event_type text,
  category text,
  icon text,
  metadata jsonb,
  aggregate_key text,
  event_count integer,
  created_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id, a.user_id, a.member_name, a.activity_key, a.activity_text,
    a.event_type, a.category, a.icon, a.metadata, a.aggregate_key,
    a.event_count, a.created_at, a.updated_at
  from public.paris_member_activity_feed a
  where a.trip_id = p_trip_id
    and public.paris_is_trip_member(p_trip_id)
    and a.updated_at > now() - interval '24 hours'
  order by a.updated_at desc
  limit greatest(1, least(coalesce(p_limit, 100), 250));
$$;

-- --------------------------------------------------------------------------
-- 11. Row Level Security
-- --------------------------------------------------------------------------

alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.live_moments enable row level security;
alter table public.visited_places enable row level security;
alter table public.day_notes enable row level security;
alter table public.favorites enable row level security;
alter table public.gallery_photos enable row level security;
alter table public.budget_entries enable row level security;
alter table public.budget_settings enable row level security;
alter table public.reminder_status enable row level security;
alter table public.custom_reminders enable row level security;
alter table public.live_moment_status enable row level security;
alter table public.day_closures enable row level security;
alter table public.daily_member_stats enable row level security;
alter table public.trip_settings enable row level security;
alter table public.paris_member_profiles enable row level security;
alter table public.paris_member_presence enable row level security;
alter table public.paris_member_locations enable row level security;
alter table public.paris_member_activity_feed enable row level security;

-- Reisen und Mitgliedschaften

drop policy if exists trips_member_select on public.trips;
create policy trips_member_select
on public.trips for select to authenticated
using (
  owner = auth.uid()
  or owner_id = auth.uid()
  or public.is_trip_member(id)
);

drop policy if exists trips_owner_update on public.trips;
create policy trips_owner_update
on public.trips for update to authenticated
using (public.paris_is_trip_owner(id))
with check (public.paris_is_trip_owner(id));

drop policy if exists trips_owner_delete on public.trips;
create policy trips_owner_delete
on public.trips for delete to authenticated
using (public.paris_is_trip_owner(id));

drop policy if exists trip_members_member_select on public.trip_members;
create policy trip_members_member_select
on public.trip_members for select to authenticated
using (user_id = auth.uid() or public.is_trip_member(trip_id));

-- Gemeinsame, direkt über die Data API verwendete Tabellen

do $$
declare
  table_name text;
  policy_prefix text;
begin
  foreach table_name in array array[
    'visited_places','budget_settings','reminder_status','live_moment_status',
    'day_closures','daily_member_stats'
  ] loop
    policy_prefix := table_name || '_members';
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_select', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_trip_member(trip_id))',
      policy_prefix || '_select', table_name
    );
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_insert', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_trip_member(trip_id))',
      policy_prefix || '_insert', table_name
    );
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_update', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id))',
      policy_prefix || '_update', table_name
    );
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_delete', table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_trip_member(trip_id))',
      policy_prefix || '_delete', table_name
    );
  end loop;
end $$;

-- Tabellen mit created_by-Zuordnung

do $$
declare
  table_name text;
  policy_prefix text;
begin
  foreach table_name in array array[
    'live_moments','day_notes','favorites','gallery_photos',
    'budget_entries','custom_reminders'
  ] loop
    policy_prefix := table_name || '_members';
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_select', table_name);
    execute format(
      'create policy %I on public.%I for select to authenticated using (public.is_trip_member(trip_id))',
      policy_prefix || '_select', table_name
    );
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_insert', table_name);
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (public.is_trip_member(trip_id) and created_by = auth.uid())',
      policy_prefix || '_insert', table_name
    );
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_update', table_name);
    execute format(
      'create policy %I on public.%I for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id))',
      policy_prefix || '_update', table_name
    );
    execute format('drop policy if exists %I on public.%I', policy_prefix || '_delete', table_name);
    execute format(
      'create policy %I on public.%I for delete to authenticated using (public.is_trip_member(trip_id))',
      policy_prefix || '_delete', table_name
    );
  end loop;
end $$;

-- trip_settings sowie Profile/Standorte werden nur über SECURITY DEFINER-RPCs
-- verändert. Presence und Aktivitätsfeed brauchen SELECT für Realtime.

drop policy if exists paris_presence_realtime_select on public.paris_member_presence;
create policy paris_presence_realtime_select
on public.paris_member_presence for select to authenticated
using (public.paris_is_trip_member(trip_id));

drop policy if exists paris_activity_realtime_select on public.paris_member_activity_feed;
create policy paris_activity_realtime_select
on public.paris_member_activity_feed for select to authenticated
using (public.paris_is_trip_member(trip_id));

-- --------------------------------------------------------------------------
-- 12. Data-API-Rechte
-- --------------------------------------------------------------------------

-- Supabase-Projekte können öffentliche Default-Rechte besitzen. Deshalb zuerst
-- alle Clientrechte entfernen und anschließend nur die tatsächlich benötigten
-- Rechte wieder erteilen.
revoke all on
  public.trips,
  public.trip_members,
  public.live_moments,
  public.visited_places,
  public.day_notes,
  public.favorites,
  public.gallery_photos,
  public.budget_entries,
  public.budget_settings,
  public.reminder_status,
  public.custom_reminders,
  public.live_moment_status,
  public.day_closures,
  public.daily_member_stats,
  public.trip_settings,
  public.paris_member_profiles,
  public.paris_member_presence,
  public.paris_member_locations,
  public.paris_member_activity_feed
from anon, authenticated;

grant select, update, delete on public.trips to authenticated;
grant select on public.trip_members to authenticated;

grant select, insert, update, delete on
  public.live_moments,
  public.visited_places,
  public.day_notes,
  public.favorites,
  public.gallery_photos,
  public.budget_entries,
  public.reminder_status,
  public.custom_reminders,
  public.live_moment_status,
  public.day_closures,
  public.daily_member_stats
  to authenticated;

grant select, insert, update on public.budget_settings to authenticated;
grant select on public.paris_member_presence, public.paris_member_activity_feed to authenticated;

revoke all on public.trip_settings from anon, authenticated;
revoke all on public.paris_member_profiles from anon, authenticated;
revoke all on public.paris_member_locations from anon, authenticated;

-- Funktionen standardmäßig nicht öffentlich ausführbar lassen.
revoke all on function public.set_updated_at() from public;
revoke all on function public.is_trip_member(uuid) from public;
revoke all on function public.paris_is_trip_member(uuid) from public;
revoke all on function public.paris_is_trip_owner(uuid) from public;
revoke all on function public.paris_storage_trip_id(text) from public;
revoke all on function public.create_trip_with_code(text,text,text) from public;
revoke all on function public.join_trip_by_code(text,text) from public;
revoke all on function public.paris_list_my_trips() from public;
revoke all on function public.paris_rename_trip(uuid,text) from public;
revoke all on function public.paris_delete_trip(uuid,text) from public;
revoke all on function public.paris_leave_trip(uuid) from public;
revoke all on function public.paris_claim_unowned_trip(uuid) from public;
revoke all on function public.paris_upsert_member_profile(uuid,text,text,text,boolean) from public;
revoke all on function public.paris_update_presence(uuid,text,text,text,text,text,text) from public;
revoke all on function public.paris_update_member_location(uuid,text,double precision,double precision,double precision,double precision,double precision,text) from public;
revoke all on function public.paris_add_member_activity(uuid,text,text,text) from public;
revoke all on function public.paris_list_participants(uuid) from public;
revoke all on function public.paris_list_member_activity(uuid,integer) from public;
revoke all on function public.paris_track_event(uuid,text,text,text,text,text,jsonb,text,integer) from public;
revoke all on function public.paris_list_activity_events(uuid,integer) from public;

-- Die RLS-Hilfsfunktionen und die von der App aufgerufenen RPCs werden gezielt
-- für angemeldete Supabase-Nutzer freigegeben.
grant execute on function public.is_trip_member(uuid) to authenticated;
grant execute on function public.paris_is_trip_member(uuid) to authenticated;
grant execute on function public.paris_is_trip_owner(uuid) to authenticated;
grant execute on function public.paris_storage_trip_id(text) to authenticated;
grant execute on function public.create_trip_with_code(text,text,text) to authenticated;
grant execute on function public.join_trip_by_code(text,text) to authenticated;
grant execute on function public.paris_list_my_trips() to authenticated;
grant execute on function public.paris_rename_trip(uuid,text) to authenticated;
grant execute on function public.paris_delete_trip(uuid,text) to authenticated;
grant execute on function public.paris_leave_trip(uuid) to authenticated;
grant execute on function public.paris_claim_unowned_trip(uuid) to authenticated;
grant execute on function public.paris_upsert_member_profile(uuid,text,text,text,boolean) to authenticated;
grant execute on function public.paris_update_presence(uuid,text,text,text,text,text,text) to authenticated;
grant execute on function public.paris_update_member_location(uuid,text,double precision,double precision,double precision,double precision,double precision,text) to authenticated;
grant execute on function public.paris_add_member_activity(uuid,text,text,text) to authenticated;
grant execute on function public.paris_list_participants(uuid) to authenticated;
grant execute on function public.paris_list_member_activity(uuid,integer) to authenticated;
grant execute on function public.paris_track_event(uuid,text,text,text,text,text,jsonb,text,integer) to authenticated;
grant execute on function public.paris_list_activity_events(uuid,integer) to authenticated;

-- --------------------------------------------------------------------------
-- 13. Privater Galerie-Bucket und Storage-RLS
-- --------------------------------------------------------------------------

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values (
  'paris-gallery',
  'paris-gallery',
  false,
  15728640,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists paris_gallery_members_select on storage.objects;
create policy paris_gallery_members_select
on storage.objects for select to authenticated
using (
  bucket_id = 'paris-gallery'
  and public.is_trip_member(public.paris_storage_trip_id(name))
);

drop policy if exists paris_gallery_members_insert on storage.objects;
create policy paris_gallery_members_insert
on storage.objects for insert to authenticated
with check (
  bucket_id = 'paris-gallery'
  and public.is_trip_member(public.paris_storage_trip_id(name))
);

drop policy if exists paris_gallery_members_update on storage.objects;
create policy paris_gallery_members_update
on storage.objects for update to authenticated
using (
  bucket_id = 'paris-gallery'
  and public.is_trip_member(public.paris_storage_trip_id(name))
)
with check (
  bucket_id = 'paris-gallery'
  and public.is_trip_member(public.paris_storage_trip_id(name))
);

drop policy if exists paris_gallery_members_delete on storage.objects;
create policy paris_gallery_members_delete
on storage.objects for delete to authenticated
using (
  bucket_id = 'paris-gallery'
  and public.is_trip_member(public.paris_storage_trip_id(name))
);

-- --------------------------------------------------------------------------
-- 14. Realtime
-- --------------------------------------------------------------------------

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'live_moments','day_notes','favorites','gallery_photos',
    'budget_entries','budget_settings','reminder_status','custom_reminders',
    'live_moment_status','day_closures','daily_member_stats',
    'paris_member_presence','paris_member_activity_feed'
  ] loop
    execute format('alter table public.%I replica identity full', table_name);
    if not exists (
      select 1
      from pg_publication_tables
      where pubname = 'supabase_realtime'
        and schemaname = 'public'
        and tablename = table_name
    ) then
      execute format('alter publication supabase_realtime add table public.%I', table_name);
    end if;
  end loop;
end $$;

commit;

notify pgrst, 'reload schema';

-- --------------------------------------------------------------------------
-- 15. Abschlusskontrolle
-- Bei erfolgreicher Installation muss jede Spalte TRUE anzeigen.
-- --------------------------------------------------------------------------

select
  to_regclass('public.trips') is not null as trips_ok,
  to_regclass('public.gallery_photos') is not null as gallery_ok,
  to_regclass('public.budget_entries') is not null as budget_ok,
  to_regclass('public.reminder_status') is not null as reminders_ok,
  to_regclass('public.live_moment_status') is not null as live_moments_ok,
  to_regclass('public.day_closures') is not null as day_closure_ok,
  to_regclass('public.paris_member_presence') is not null as people_ok,
  exists(select 1 from storage.buckets where id = 'paris-gallery') as storage_ok,
  has_function_privilege('authenticated', 'public.create_trip_with_code(text,text,text)', 'EXECUTE') as create_trip_rpc_ok,
  has_function_privilege('authenticated', 'public.join_trip_by_code(text,text)', 'EXECUTE') as join_trip_rpc_ok,
  has_function_privilege('authenticated', 'public.paris_list_my_trips()', 'EXECUTE') as trip_list_rpc_ok,
  has_table_privilege('authenticated', 'public.gallery_photos', 'SELECT,INSERT,UPDATE,DELETE') as gallery_api_ok;
