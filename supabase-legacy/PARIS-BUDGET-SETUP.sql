-- Budget-Tracker: einmal vollständig im Supabase SQL Editor ausführen.
-- Dieses Skript ist wiederholbar und ergänzt insbesondere die fehlenden Data-API-Rechte.

create table if not exists public.budget_settings (
  trip_id uuid primary key references public.trips(id) on delete cascade,
  budget_limit_cents integer not null default 60000,
  updated_by uuid,
  updated_at timestamptz not null default now(),
  constraint budget_settings_limit_nonnegative check (budget_limit_cents >= 0)
);

alter table public.budget_settings enable row level security;

drop policy if exists "members read budget settings" on public.budget_settings;
create policy "members read budget settings"
on public.budget_settings for select to authenticated
using (public.is_trip_member(trip_id));

drop policy if exists "members add budget settings" on public.budget_settings;
create policy "members add budget settings"
on public.budget_settings for insert to authenticated
with check (public.is_trip_member(trip_id));

drop policy if exists "members update budget settings" on public.budget_settings;
create policy "members update budget settings"
on public.budget_settings for update to authenticated
using (public.is_trip_member(trip_id))
with check (public.is_trip_member(trip_id));

-- Entscheidend für die Data API: Die Tabelle braucht explizite Rechte.
grant usage on schema public to authenticated;
grant select, insert, update on public.budget_settings to authenticated;
grant select, insert, update, delete on public.budget_entries to authenticated;

drop trigger if exists budget_settings_set_updated_at on public.budget_settings;
create trigger budget_settings_set_updated_at
before update on public.budget_settings
for each row execute function public.set_updated_at();

do $$
begin
  begin
    alter publication supabase_realtime add table public.budget_settings;
  exception when duplicate_object then null;
  end;

  begin
    alter publication supabase_realtime add table public.budget_entries;
  exception when duplicate_object then null;
  end;
end $$;

-- PostgREST/Data API veranlassen, das Schema sofort neu einzulesen.
notify pgrst, 'reload schema';

select
  has_table_privilege('authenticated', 'public.budget_entries', 'SELECT,INSERT,UPDATE,DELETE') as budget_entries_api_ok,
  has_table_privilege('authenticated', 'public.budget_settings', 'SELECT,INSERT,UPDATE') as budget_settings_api_ok;
