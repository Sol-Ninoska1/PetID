-- Calls the push-owner Edge Function after every scan, shared location and found report.
-- The function URL and shared secret live in Supabase Vault (names below); until they exist the triggers do nothing.
--   select vault.create_secret('https://<project>.supabase.co/functions/v1/push-owner', 'push_owner_url');
--   select vault.create_secret('<WEBHOOK_SECRET>', 'push_owner_secret');

create extension if not exists pg_net with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create or replace function private.push_owner()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_owner_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_owner_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  -- pg_net queues the request asynchronously: the visitor's scan is never slowed down.
  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body := jsonb_build_object('type', 'INSERT', 'table', tg_table_name, 'record', jsonb_build_object('id', new.id))
  );
  return new;
end;
$$;

create trigger scans_push_owner
  after insert on public.scans
  for each row when (new.pet_id is not null)
  execute function private.push_owner();

create trigger location_shares_push_owner
  after insert on public.location_shares
  for each row execute function private.push_owner();

create trigger found_reports_push_owner
  after insert on public.found_reports
  for each row execute function private.push_owner();
