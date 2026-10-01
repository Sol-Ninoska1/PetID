-- Live notification bell: the owner's app listens to new found reports, shared locations and scans
-- (push-owner stamps notified_at with an UPDATE). Realtime applies RLS, so each owner only hears about their pets.

do $$
declare
  t text;
begin
  foreach t in array array['found_reports', 'location_shares', 'scans'] loop
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;
