-- "¡Encontré esta mascota!" only asks for a message and an optional phone: the finder's name and phone become
-- optional (sharing the GPS has its own button on the public profile). Old reports keep their data.

do $$
declare
  c record;
begin
  for c in
    select con.conname
    from pg_constraint con
    join pg_attribute a on a.attrelid = con.conrelid and a.attnum = any (con.conkey)
    where con.conrelid = 'public.found_reports'::regclass
      and con.contype = 'c'
      and a.attname in ('reporter_name', 'reporter_phone')
  loop
    execute format('alter table public.found_reports drop constraint %I', c.conname);
  end loop;
end $$;

alter table public.found_reports
  alter column reporter_name drop not null,
  alter column reporter_phone drop not null,
  add constraint found_reports_reporter_name_length check (reporter_name is null or char_length(reporter_name) between 1 and 100),
  add constraint found_reports_reporter_phone_length check (reporter_phone is null or char_length(reporter_phone) between 6 and 30);

create or replace function public.submit_found_report(
  p_token text,
  p_reporter_name text,
  p_reporter_phone text,
  p_reporter_email text,
  p_message text,
  p_location_text text,
  p_latitude numeric,
  p_longitude numeric
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_pet_id uuid := public.resolve_active_pet(p_token);
begin
  if v_pet_id is null then
    raise exception 'pet_not_found';
  end if;

  if (select count(*) from public.found_reports
      where pet_id = v_pet_id and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'rate_limited';
  end if;

  insert into public.found_reports (
    pet_id, reporter_name, reporter_phone, reporter_email, message, location_text, latitude, longitude
  )
  values (
    v_pet_id,
    nullif(trim(p_reporter_name), ''),
    nullif(trim(p_reporter_phone), ''),
    nullif(trim(p_reporter_email), ''),
    nullif(trim(p_message), ''),
    nullif(trim(p_location_text), ''),
    p_latitude,
    p_longitude
  );
end;
$$;
