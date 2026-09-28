-- PetIDs: generic physical identifiers (collar/plate QR) created by an admin before any pet or owner exists.
-- Lifecycle: available/reserved -> sold -> activated (by the buyer, exactly once). Any PetID can be blocked.
-- The QR only encodes /p/{qr_token}. Knowing the token never grants write access: every write goes through
-- functions that check auth.uid() / the admin role.

-- ---------------------------------------------------------------------------
-- Roles
-- ---------------------------------------------------------------------------

alter table public.profiles
  add column role text not null default 'owner' check (role in ('owner', 'admin')),
  add column updated_at timestamptz not null default now();

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- role stays out of the column grants: only SQL (dashboard / service role) can promote an admin.

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to authenticated;

create policy "profiles: admin reads" on public.profiles
  for select to authenticated using ((select public.is_admin()));

create policy "pets: admin reads" on public.pets
  for select to authenticated using ((select public.is_admin()));

create policy "found_reports: admin reads" on public.found_reports
  for select to authenticated using ((select public.is_admin()));

create policy "scans: admin reads" on public.scans
  for select to authenticated using ((select public.is_admin()));

create policy "location_shares: admin reads" on public.location_shares
  for select to authenticated using ((select public.is_admin()));

-- ---------------------------------------------------------------------------
-- PetIDs
-- ---------------------------------------------------------------------------

create sequence public.pet_id_code_seq;

create or replace function public.next_pet_id_code()
returns text
language sql
volatile
as $$
  select 'PET-' || lpad(n::text, greatest(5, length(n::text)), '0')
  from (select nextval('public.pet_id_code_seq') as n) s;
$$;

create table public.pet_ids (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default public.next_pet_id_code(),
  qr_token text not null unique default public.generate_qr_token(),
  status text not null default 'available'
    check (status in ('available', 'reserved', 'sold', 'activated', 'blocked')),
  owner_id uuid references public.profiles (id) on delete set null,
  pet_id uuid unique references public.pets (id) on delete set null,
  notes text check (char_length(notes) <= 500),
  created_at timestamptz not null default now(),
  sold_at timestamptz,
  activated_at timestamptz,
  updated_at timestamptz not null default now(),
  constraint pet_ids_link_consistent check ((owner_id is null) = (pet_id is null)),
  constraint pet_ids_activated_is_linked check (status <> 'activated' or pet_id is not null),
  constraint pet_ids_unlinked_before_activation check (status not in ('available', 'reserved', 'sold') or pet_id is null)
);

create index pet_ids_owner_id_idx on public.pet_ids (owner_id);
create index pet_ids_status_created_at_idx on public.pet_ids (status, created_at desc);

create trigger pet_ids_set_updated_at
  before update on public.pet_ids
  for each row execute function public.set_updated_at();

alter table public.pet_ids enable row level security;

create policy "pet_ids: owner reads" on public.pet_ids
  for select to authenticated using (owner_id = (select auth.uid()));

create policy "pet_ids: admin reads" on public.pet_ids
  for select to authenticated using ((select public.is_admin()));

-- Read-only from the client. Creation, status changes and activation go through the functions below,
-- and PetIDs are never deleted so a printed token can't be reissued.
revoke all on public.pet_ids from anon, authenticated;
grant select on public.pet_ids to authenticated;

-- Deleting a pet frees its PetID so the QR shows the activation screen again (blocked ones stay blocked).
create or replace function public.release_pet_id()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.pet_ids
  set status = case when status = 'blocked' then 'blocked' else 'sold' end,
      owner_id = null,
      pet_id = null,
      activated_at = null
  where pet_id = old.id;
  return old;
end;
$$;

create trigger pets_release_pet_id
  before delete on public.pets
  for each row execute function public.release_pet_id();

-- ---------------------------------------------------------------------------
-- Pets are created only by activating a PetID; the QR token now lives on pet_ids.
-- ---------------------------------------------------------------------------

drop function public.get_public_pet(text);
alter table public.pets drop column qr_token;
drop policy "pets: owner inserts" on public.pets;
revoke insert on public.pets from authenticated;

-- ---------------------------------------------------------------------------
-- Scans and found reports reference the PetID
-- ---------------------------------------------------------------------------

alter table public.scans
  add column pet_id_reference uuid references public.pet_ids (id) on delete cascade,
  add column device text check (device in ('mobile', 'tablet', 'desktop')),
  alter column pet_id drop not null;

create index scans_pet_id_reference_idx on public.scans (pet_id_reference, scanned_at desc);

alter table public.found_reports
  add column status text not null default 'new' check (status in ('new', 'read', 'resolved'));

grant update (status) on public.found_reports to authenticated;

-- ---------------------------------------------------------------------------
-- Admin API
-- ---------------------------------------------------------------------------

create or replace function public.admin_create_pet_ids(p_count integer default 1, p_notes text default null)
returns setof public.pet_ids
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if p_count is null or p_count < 1 or p_count > 200 then
    raise exception 'invalid_count';
  end if;

  return query
    with created as (
      insert into public.pet_ids (notes)
      select left(nullif(trim(p_notes), ''), 500) from generate_series(1, p_count)
      returning *
    )
    select * from created order by code;
end;
$$;

-- available <-> reserved -> sold (and back while unactivated); anything -> blocked;
-- blocked -> activated only when it still has a pet, otherwise back to available/reserved/sold.
-- 'activated' is never set by hand: it's the result of activate_pet_id.
create or replace function public.admin_set_pet_id_status(p_id uuid, p_status text)
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

  select * into v from public.pet_ids where id = p_id for update;
  if not found then
    raise exception 'pet_id_not_found';
  end if;
  if p_status = v.status then
    return v;
  end if;

  if p_status = 'blocked' then
    null;
  elsif v.status = 'blocked' then
    if (v.pet_id is not null) <> (p_status = 'activated') then
      raise exception 'invalid_transition';
    end if;
  elsif v.status = 'activated' or p_status not in ('available', 'reserved', 'sold') then
    raise exception 'invalid_transition';
  end if;

  update public.pet_ids
  set status = p_status,
      sold_at = case
        when p_status = 'sold' then coalesce(sold_at, now())
        when p_status in ('available', 'reserved') then null
        else sold_at
      end
  where id = p_id
  returning * into v;

  return v;
end;
$$;

-- ---------------------------------------------------------------------------
-- Owner API: activation (first come, exactly once)
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
    owner_id, name, species, breed, sex, birth_date, color, weight, photo_url, description,
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
      sold_at = coalesce(sold_at, now())
  where id = v_tag.id;

  return v_pet_id;
end;
$$;

-- ---------------------------------------------------------------------------
-- Public API (anonymous visitors scanning the QR)
-- ---------------------------------------------------------------------------

create or replace function public.resolve_active_pet(p_token text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select p.id
  from public.pet_ids t
  join public.pets p on p.id = t.pet_id
  where t.qr_token = p_token and t.status = 'activated' and p.is_active;
$$;

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
    else jsonb_build_object(
      'status', 'active',
      'pet', jsonb_build_object(
        'name', p.name,
        'species', p.species,
        'breed', p.breed,
        'sex', p.sex,
        'color', p.color,
        'birth_date', p.birth_date,
        'weight', p.weight,
        'photo_url', p.photo_url,
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

-- Logs every scan of a non-blocked PetID (also before activation). Only a coarse device type is derived.
create or replace function public.record_scan(p_token text, p_user_agent text)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tag public.pet_ids;
  v_scan_id uuid;
begin
  select * into v_tag from public.pet_ids where qr_token = p_token;
  if not found or v_tag.status = 'blocked' then
    return null;
  end if;

  if (select count(*) from public.scans
      where pet_id_reference = v_tag.id and scanned_at > now() - interval '10 minutes') >= 60 then
    return null;
  end if;

  insert into public.scans (pet_id_reference, pet_id, user_agent, device)
  values (
    v_tag.id,
    v_tag.pet_id,
    left(p_user_agent, 300),
    case
      when p_user_agent ~* 'ipad|tablet' then 'tablet'
      when p_user_agent ~* 'mobi|android|iphone' then 'mobile'
      else 'desktop'
    end
  )
  returning id into v_scan_id;

  return v_scan_id;
end;
$$;

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

  if (select count(*) from public.location_shares
      where pet_id = v_pet_id and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'rate_limited';
  end if;

  insert into public.location_shares (pet_id, latitude, longitude, accuracy_m)
  values (v_pet_id, p_latitude, p_longitude, case when p_accuracy_m is not null then least(p_accuracy_m, 999999) end);

  if p_scan_id is not null then
    update public.scans
    set approximate_latitude = round(p_latitude, 2),
        approximate_longitude = round(p_longitude, 2)
    where id = p_scan_id and pet_id = v_pet_id;
  end if;
end;
$$;

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
    trim(p_reporter_name),
    trim(p_reporter_phone),
    nullif(trim(p_reporter_email), ''),
    nullif(trim(p_message), ''),
    nullif(trim(p_location_text), ''),
    p_latitude,
    p_longitude
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Function privileges
-- ---------------------------------------------------------------------------

revoke all on function public.admin_create_pet_ids(integer, text) from public;
revoke all on function public.admin_set_pet_id_status(uuid, text) from public;
revoke all on function public.activate_pet_id(text, jsonb) from public;
revoke all on function public.resolve_active_pet(text) from public;
revoke all on function public.get_public_pet_id(text) from public;

grant execute on function public.admin_create_pet_ids(integer, text) to authenticated;
grant execute on function public.admin_set_pet_id_status(uuid, text) to authenticated;
grant execute on function public.activate_pet_id(text, jsonb) to authenticated;
grant execute on function public.get_public_pet_id(text) to anon, authenticated;

-- The seed script (service role) writes directly; new tables don't get automatic grants in this project.
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
