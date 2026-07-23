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
