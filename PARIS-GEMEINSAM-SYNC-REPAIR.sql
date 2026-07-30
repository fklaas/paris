-- Paris-App · gemeinsamer Sync-Hotfix
-- Sicher erneut ausführbar. Stellt RLS, Rechte und Realtime für die gemeinsam
-- verwendeten Module Galerie, Budget und Erinnerungen wieder her.

begin;

create or replace function public.is_trip_member(check_trip_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.trip_members tm
    where tm.trip_id = check_trip_id and tm.user_id = auth.uid()
  );
$$;
revoke all on function public.is_trip_member(uuid) from public;
grant execute on function public.is_trip_member(uuid) to authenticated;

-- Gemeinsame Tabellenrechte
grant select, insert, update, delete on
  public.gallery_photos,
  public.budget_entries,
  public.budget_settings,
  public.reminder_status,
  public.custom_reminders
  to authenticated;

alter table public.gallery_photos enable row level security;
alter table public.budget_entries enable row level security;
alter table public.budget_settings enable row level security;
alter table public.reminder_status enable row level security;
alter table public.custom_reminders enable row level security;

-- Policies einheitlich neu setzen
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['gallery_photos','budget_entries','custom_reminders'] LOOP
    EXECUTE format('drop policy if exists %I on public.%I', t || '_member_select', t);
    EXECUTE format('create policy %I on public.%I for select to authenticated using (public.is_trip_member(trip_id))', t || '_member_select', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_member_insert', t);
    EXECUTE format('create policy %I on public.%I for insert to authenticated with check (public.is_trip_member(trip_id) and created_by = auth.uid())', t || '_member_insert', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_member_update', t);
    EXECUTE format('create policy %I on public.%I for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id))', t || '_member_update', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_member_delete', t);
    EXECUTE format('create policy %I on public.%I for delete to authenticated using (public.is_trip_member(trip_id))', t || '_member_delete', t);
  END LOOP;

  FOREACH t IN ARRAY ARRAY['budget_settings','reminder_status'] LOOP
    EXECUTE format('drop policy if exists %I on public.%I', t || '_member_select', t);
    EXECUTE format('create policy %I on public.%I for select to authenticated using (public.is_trip_member(trip_id))', t || '_member_select', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_member_insert', t);
    EXECUTE format('create policy %I on public.%I for insert to authenticated with check (public.is_trip_member(trip_id))', t || '_member_insert', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_member_update', t);
    EXECUTE format('create policy %I on public.%I for update to authenticated using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id))', t || '_member_update', t);
    EXECUTE format('drop policy if exists %I on public.%I', t || '_member_delete', t);
    EXECUTE format('create policy %I on public.%I for delete to authenticated using (public.is_trip_member(trip_id))', t || '_member_delete', t);
  END LOOP;
END $$;

-- Storage: Pfad muss mit trip_id beginnen.
drop policy if exists paris_gallery_members_select on storage.objects;
create policy paris_gallery_members_select on storage.objects for select to authenticated
using (bucket_id='paris-gallery' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
drop policy if exists paris_gallery_members_insert on storage.objects;
create policy paris_gallery_members_insert on storage.objects for insert to authenticated
with check (bucket_id='paris-gallery' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
drop policy if exists paris_gallery_members_update on storage.objects;
create policy paris_gallery_members_update on storage.objects for update to authenticated
using (bucket_id='paris-gallery' and public.is_trip_member(((storage.foldername(name))[1])::uuid))
with check (bucket_id='paris-gallery' and public.is_trip_member(((storage.foldername(name))[1])::uuid));
drop policy if exists paris_gallery_members_delete on storage.objects;
create policy paris_gallery_members_delete on storage.objects for delete to authenticated
using (bucket_id='paris-gallery' and public.is_trip_member(((storage.foldername(name))[1])::uuid));

-- Realtime idempotent registrieren
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.gallery_photos; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_entries; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.budget_settings; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.reminder_status; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_reminders; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

commit;

-- Kontrolle: Hier müssen Fabian und Luisa mit derselben trip_id erscheinen.
select
  tm.trip_id,
  t.name as trip_name,
  tm.user_id,
  au.email,
  tm.display_name,
  tm.role,
  tm.joined_at
from public.trip_members tm
join public.trips t on t.id=tm.trip_id
left join auth.users au on au.id=tm.user_id
order by tm.trip_id, tm.joined_at;
