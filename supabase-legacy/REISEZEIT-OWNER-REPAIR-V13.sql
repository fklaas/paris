-- Reisezeit v13: Besitzerrolle einer alleinigen, bislang rollenlosen Reise reparieren
create or replace function public.paris_claim_unowned_trip(p_trip_id uuid)
returns boolean language plpgsql security definer set search_path=public as $$
declare v_members integer; v_owner_exists boolean;
begin
  if not exists(select 1 from public.trip_members tm where (to_jsonb(tm)->>'trip_id')::uuid=p_trip_id and (to_jsonb(tm)->>'user_id')::uuid=auth.uid()) then raise exception 'Du bist kein Mitglied dieser Reise.'; end if;
  select count(*) into v_members from public.trip_members tm where (to_jsonb(tm)->>'trip_id')::uuid=p_trip_id;
  select public.paris_is_trip_owner(p_trip_id) into v_owner_exists;
  if v_owner_exists then return true; end if;
  if v_members<>1 then return false; end if;
  update public.trip_members tm set role='owner' where (to_jsonb(tm)->>'trip_id')::uuid=p_trip_id and (to_jsonb(tm)->>'user_id')::uuid=auth.uid();
  update public.trips t set owner_id=auth.uid() where t.id=p_trip_id and nullif(to_jsonb(t)->>'owner_id','') is null;
  return true;
end; $$;
grant execute on function public.paris_claim_unowned_trip(uuid) to authenticated;
