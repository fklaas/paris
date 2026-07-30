-- Erinnerungen: einmal vollständig im Supabase SQL Editor ausführen.
-- Wiederholbar: Tabellen, RLS, Data-API-Rechte und Realtime werden sauber ergänzt.

create table if not exists public.reminder_status (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  reminder_key text not null,
  completed boolean not null default false,
  completed_by uuid,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique (trip_id, reminder_key)
);

create table if not exists public.custom_reminders (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  created_by uuid,
  title text not null check (char_length(trim(title)) between 1 and 120),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists reminder_status_trip_idx on public.reminder_status(trip_id);
create index if not exists custom_reminders_trip_created_idx on public.custom_reminders(trip_id, created_at);

alter table public.reminder_status enable row level security;
alter table public.custom_reminders enable row level security;

drop policy if exists "members read reminder status" on public.reminder_status;
create policy "members read reminder status" on public.reminder_status
for select to authenticated using (public.is_trip_member(trip_id));

drop policy if exists "members add reminder status" on public.reminder_status;
create policy "members add reminder status" on public.reminder_status
for insert to authenticated with check (public.is_trip_member(trip_id));

drop policy if exists "members update reminder status" on public.reminder_status;
create policy "members update reminder status" on public.reminder_status
for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

drop policy if exists "members delete reminder status" on public.reminder_status;
create policy "members delete reminder status" on public.reminder_status
for delete to authenticated using (public.is_trip_member(trip_id));

drop policy if exists "members read custom reminders" on public.custom_reminders;
create policy "members read custom reminders" on public.custom_reminders
for select to authenticated using (public.is_trip_member(trip_id));

drop policy if exists "members add custom reminders" on public.custom_reminders;
create policy "members add custom reminders" on public.custom_reminders
for insert to authenticated with check (public.is_trip_member(trip_id));

drop policy if exists "members update custom reminders" on public.custom_reminders;
create policy "members update custom reminders" on public.custom_reminders
for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));

drop policy if exists "members delete custom reminders" on public.custom_reminders;
create policy "members delete custom reminders" on public.custom_reminders
for delete to authenticated using (public.is_trip_member(trip_id));

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.reminder_status to authenticated;
grant select, insert, update, delete on public.custom_reminders to authenticated;

drop trigger if exists reminder_status_set_updated_at on public.reminder_status;
create trigger reminder_status_set_updated_at before update on public.reminder_status
for each row execute function public.set_updated_at();

drop trigger if exists custom_reminders_set_updated_at on public.custom_reminders;
create trigger custom_reminders_set_updated_at before update on public.custom_reminders
for each row execute function public.set_updated_at();

do $$
begin
  begin alter publication supabase_realtime add table public.reminder_status;
  exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.custom_reminders;
  exception when duplicate_object then null; end;
end $$;

notify pgrst, 'reload schema';

select
  has_table_privilege('authenticated', 'public.reminder_status', 'SELECT,INSERT,UPDATE,DELETE') as reminder_status_api_ok,
  has_table_privilege('authenticated', 'public.custom_reminders', 'SELECT,INSERT,UPDATE,DELETE') as custom_reminders_api_ok;
