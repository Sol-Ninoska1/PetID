-- Yearly plan: activating a PetID includes one year of full service. When it expires the QR keeps working in a
-- basic mode (photo, name and ways to contact the owner) but the owner can't edit the profile and scans or shared
-- locations don't notify their phone until an admin renews it (after receiving the payment).
-- expires_at null means it never expires: demo PetIDs and PetIDs nobody has activated yet.

alter table public.pet_ids add column expires_at timestamptz;

update public.pet_ids
set expires_at = activated_at + interval '1 year'
where activated_at is not null and qr_token not like 'demo-%';

create index pet_ids_expires_at_idx on public.pet_ids (expires_at) where expires_at is not null;

-- ---------------------------------------------------------------------------
-- Activation starts the year. Deleting the pet keeps expires_at (release_pet_id doesn't touch it), so
-- re-activating the same PetID never grants a new free year.
-- ---------------------------------------------------------------------------

create or replace function public.activate_pet_id(p_token text, p_pet jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_tag public.pet_ids;
  v_pet_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into v_tag from public.pet_ids where qr_token = p_token for update;
  if not found then
    raise exception 'pet_id_not_found';
  end if;
  if v_tag.status = 'blocked' then
    raise exception 'pet_id_blocked';
  end if;
  if v_tag.pet_id is not null then
    raise exception 'pet_id_already_activated';
  end if;

  insert into public.pets (
    owner_id, name, species, breed, sex, birth_date, color, weight, photo_url, cover_url, description,
    special_needs, allergies, medications, show_health_info, show_contact_phone
  )
  values (
    v_uid,
    trim(p_pet ->> 'name'),
    p_pet ->> 'species',
    nullif(trim(p_pet ->> 'breed'), ''),
    coalesce(p_pet ->> 'sex', 'unknown'),
    nullif(p_pet ->> 'birth_date', '')::date,
    nullif(trim(p_pet ->> 'color'), ''),
    nullif(p_pet ->> 'weight', '')::numeric,
    nullif(p_pet ->> 'photo_url', ''),
    nullif(p_pet ->> 'cover_url', ''),
    nullif(trim(p_pet ->> 'description'), ''),
    nullif(trim(p_pet ->> 'special_needs'), ''),
    nullif(trim(p_pet ->> 'allergies'), ''),
    nullif(trim(p_pet ->> 'medications'), ''),
    coalesce((p_pet ->> 'show_health_info')::boolean, true),
    coalesce((p_pet ->> 'show_contact_phone')::boolean, true)
  )
  returning id into v_pet_id;

  update public.pet_ids
  set status = 'activated',
      owner_id = v_uid,
      pet_id = v_pet_id,
      activated_at = now(),
      sold_at = coalesce(sold_at, now()),
      expires_at = coalesce(expires_at, now() + interval '1 year')
  where id = v_tag.id;

  return v_pet_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public profile: basic mode once expired
-- ---------------------------------------------------------------------------

create or replace function public.get_public_pet_id(p_token text)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select case
    when t.status = 'blocked' then jsonb_build_object('status', 'blocked')
    when t.pet_id is null then jsonb_build_object('status', 'unactivated', 'code', t.code)
    when not p.is_active then jsonb_build_object('status', 'inactive')
    when t.expires_at <= now() then jsonb_build_object(
      'status', 'active',
      'expired', true,
      'pet', jsonb_build_object(
        'name', p.name,
        'species', p.species,
        'breed', p.breed,
        'sex', p.sex,
        'photo_url', p.photo_url,
        'cover_url', p.cover_url,
        'is_lost', p.is_lost,
        'owner_first_name', split_part(pr.name, ' ', 1),
        'contact_phone', case when p.show_contact_phone then pr.phone end
      )
    )
    else jsonb_build_object(
      'status', 'active',
      'expired', false,
      'pet', jsonb_build_object(
        'name', p.name,
        'species', p.species,
        'breed', p.breed,
        'sex', p.sex,
        'color', p.color,
        'birth_date', p.birth_date,
        'weight', p.weight,
        'photo_url', p.photo_url,
        'cover_url', p.cover_url,
        'description', p.description,
        'is_lost', p.is_lost,
        'special_needs', case when p.show_health_info then p.special_needs end,
        'allergies', case when p.show_health_info then p.allergies end,
        'medications', case when p.show_health_info then p.medications end,
        'owner_first_name', split_part(pr.name, ' ', 1),
        'contact_phone', case when p.show_contact_phone then pr.phone end
      )
    )
  end
  from public.pet_ids t
  left join public.pets p on p.id = t.pet_id
  left join public.profiles pr on pr.id = p.owner_id
  where t.qr_token = p_token;
$$;

-- Sharing GPS is part of the full plan. The found report form stays available in basic mode.
create or replace function public.share_location(
  p_token text,
  p_scan_id uuid,
  p_latitude numeric,
  p_longitude numeric,
  p_accuracy_m numeric
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
  if exists (select 1 from public.pet_ids where pet_id = v_pet_id and expires_at <= now()) then
    raise exception 'pet_id_expired';
  end if;

  if (select count(*) from public.location_shares
      where pet_id = v_pet_id and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'rate_limited';
  end if;

  insert into public.location_shares (pet_id, latitude, longitude, accuracy_m)
  values (v_pet_id, p_latitude, p_longitude, case when p_accuracy_m is not null then least(p_accuracy_m, 999999) end);

  if p_scan_id is not null then
    update public.scans
    set approximate_latitude = round(p_latitude, 2),
        approximate_longitude = round(p_longitude, 2),
        location_source = 'gps'
    where id = p_scan_id and pet_id = v_pet_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner can't edit an expired pet, except marking it lost/found or pausing its profile.
-- ---------------------------------------------------------------------------

create or replace function public.guard_expired_pet_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_free_fields text[] := array['is_lost', 'is_active', 'updated_at'];
begin
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;
  if exists (select 1 from public.pet_ids where pet_id = old.id and expires_at <= now())
     and (to_jsonb(new) - v_free_fields) is distinct from (to_jsonb(old) - v_free_fields) then
    raise exception 'pet_id_expired' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger pets_guard_expired
  before update on public.pets
  for each row execute function public.guard_expired_pet_update();

-- ---------------------------------------------------------------------------
-- Push: scans and shared locations of an expired PetID don't notify. Found reports always do,
-- because in basic mode the form may be the only way to reach the owner.
-- ---------------------------------------------------------------------------

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
  if tg_table_name <> 'found_reports'
     and exists (select 1 from public.pet_ids where pet_id = new.pet_id and expires_at <= now()) then
    return new;
  end if;

  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_owner_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_owner_secret';
  if v_url is null or v_secret is null then
    return new;
  end if;

  perform net.http_post(
    url := v_url,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
    body := jsonb_build_object('type', 'INSERT', 'table', tg_table_name, 'record', jsonb_build_object('id', new.id))
  );
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin: renew after receiving the payment. Adds years from today, or from the current expiry if it hasn't passed.
-- ---------------------------------------------------------------------------

create or replace function public.admin_renew_pet_id(p_id uuid, p_years integer default 1)
returns public.pet_ids
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v public.pet_ids;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_years is null or p_years not between 1 and 5 then
    raise exception 'invalid_years';
  end if;

  update public.pet_ids
  set expires_at = greatest(coalesce(expires_at, now()), now()) + make_interval(years => p_years)
  where id = p_id and (pet_id is not null or expires_at is not null)
  returning * into v;
  if not found then
    raise exception 'pet_id_not_activated';
  end if;

  return v;
end;
$$;

revoke all on function public.admin_renew_pet_id(uuid, integer) from public;
grant execute on function public.admin_renew_pet_id(uuid, integer) to authenticated;
revoke all on function public.guard_expired_pet_update() from public;

-- ---------------------------------------------------------------------------
-- Daily reminders (30 days, 7 days and the day it expires) through the push-owner Edge Function.
-- ---------------------------------------------------------------------------

create extension if not exists pg_cron with schema pg_catalog;

create or replace function private.send_expiry_reminders()
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
  v_id uuid;
  v_count integer := 0;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'push_owner_url';
  select decrypted_secret into v_secret from vault.decrypted_secrets where name = 'push_owner_secret';
  if v_url is null or v_secret is null then
    return 0;
  end if;

  for v_id in
    select id from public.pet_ids
    where status = 'activated' and pet_id is not null
      and (expires_at::date - current_date) in (30, 7, 0)
  loop
    perform net.http_post(
      url := v_url,
      headers := jsonb_build_object('Content-Type', 'application/json', 'x-webhook-secret', v_secret),
      body := jsonb_build_object('type', 'REMINDER', 'table', 'pet_ids', 'record', jsonb_build_object('id', v_id))
    );
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

select cron.schedule('petid-expiry-reminders', '0 13 * * *', 'select private.send_expiry_reminders()');

-- ---------------------------------------------------------------------------
-- Support form: renewal requests
-- ---------------------------------------------------------------------------

alter table public.support_messages drop constraint support_messages_topic_check;
alter table public.support_messages add constraint support_messages_topic_check
  check (topic in ('activacion', 'pedido', 'renovacion', 'tecnico', 'sugerencia', 'otro'));
