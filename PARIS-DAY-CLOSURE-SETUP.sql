-- Erweiterung für den neuen gemeinsamen Tagesabschluss
alter table public.day_closures
  add column if not exists shared_note text,
  add column if not exists favorite_photo_id text,
  add column if not exists day_rating smallint,
  add column if not exists food_rating smallint,
  add column if not exists field_meta jsonb not null default '{}'::jsonb;

alter table public.daily_member_stats
  add column if not exists member_name text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname='day_closures_rating_range') then
    alter table public.day_closures add constraint day_closures_rating_range check (day_rating is null or day_rating between 1 and 5);
  end if;
  if not exists (select 1 from pg_constraint where conname='day_closures_food_rating_range') then
    alter table public.day_closures add constraint day_closures_food_rating_range check (food_rating is null or food_rating between 1 and 5);
  end if;
end $$;

grant select, insert, update, delete on public.day_closures to authenticated;
grant select, insert, update, delete on public.daily_member_stats to authenticated;

select
  has_table_privilege('authenticated','public.day_closures','select,insert,update,delete') as day_closures_api_ok,
  has_table_privilege('authenticated','public.daily_member_stats','select,insert,update,delete') as daily_member_stats_api_ok;


-- ------------------------------------------------------------
-- Korrektur: Schritte getrennt nach Fabian und Luisa speichern
-- ------------------------------------------------------------
-- Frühere Versionen verwendeten user_id als Teil des Primärschlüssels.
-- Wurde auf demselben Gerät zwischen Fabian und Luisa gewechselt,
-- überschrieb der zweite Wert deshalb den ersten. Ab jetzt ist
-- member_name der stabile Schlüssel pro Reisetag.

update public.daily_member_stats
set member_name = coalesce(nullif(trim(member_name), ''), 'Fabian')
where member_name is null or trim(member_name) = '';

-- Eventuelle Dubletten pro Tag/Person auf den neuesten Datensatz reduzieren.
with ranked as (
  select ctid,
         row_number() over (
           partition by trip_id, trip_day, member_name
           order by updated_at desc nulls last, ctid desc
         ) as rn
  from public.daily_member_stats
)
delete from public.daily_member_stats d
using ranked r
where d.ctid = r.ctid and r.rn > 1;

alter table public.daily_member_stats
  alter column member_name set not null;

alter table public.daily_member_stats
  drop constraint if exists daily_member_stats_pkey;

alter table public.daily_member_stats
  add constraint daily_member_stats_pkey
  primary key (trip_id, trip_day, member_name);

-- Alle Mitglieder der gemeinsamen Reise dürfen beide Personenwerte pflegen.
drop policy if exists "users add own daily member stats" on public.daily_member_stats;
drop policy if exists "users update own daily member stats" on public.daily_member_stats;
drop policy if exists "users delete own daily member stats" on public.daily_member_stats;
drop policy if exists "members add daily member stats" on public.daily_member_stats;
drop policy if exists "members update daily member stats" on public.daily_member_stats;
drop policy if exists "members delete daily member stats" on public.daily_member_stats;

create policy "members add daily member stats"
on public.daily_member_stats for insert to authenticated
with check (public.is_trip_member(trip_id));

create policy "members update daily member stats"
on public.daily_member_stats for update to authenticated
using (public.is_trip_member(trip_id))
with check (public.is_trip_member(trip_id));

create policy "members delete daily member stats"
on public.daily_member_stats for delete to authenticated
using (public.is_trip_member(trip_id));

select
  exists (
    select 1
    from pg_constraint
    where conname = 'daily_member_stats_pkey'
      and conrelid = 'public.daily_member_stats'::regclass
  ) as separate_member_steps_ready;
