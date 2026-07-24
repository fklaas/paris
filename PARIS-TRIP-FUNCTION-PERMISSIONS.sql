-- Paris-App: RPC-Berechtigungen für anonyme Supabase-Sitzungen
-- Diese Datei einmal im Supabase SQL Editor vollständig ausführen.

begin;

grant usage on schema public to anon, authenticated;

do $$
declare
  fn regprocedure;
begin
  for fn in
    select p.oid::regprocedure
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('create_trip_with_code', 'join_trip_by_code')
  loop
    execute format('grant execute on function %s to anon, authenticated', fn);
  end loop;
end
$$;

commit;

-- Kontrolle: Beide Funktionen sollten hier mit anon/authenticated erscheinen.
select
  p.proname as function_name,
  p.oid::regprocedure as signature,
  has_function_privilege('anon', p.oid, 'EXECUTE') as anon_may_execute,
  has_function_privilege('authenticated', p.oid, 'EXECUTE') as authenticated_may_execute
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in ('create_trip_with_code', 'join_trip_by_code')
order by p.proname;
