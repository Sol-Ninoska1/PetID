-- Scan alerts: approximate location for every scan (IP-based city, upgraded to GPS when the finder shares it)
-- and Web Push subscriptions so owners get a notification on their phone.

-- ---------------------------------------------------------------------------
-- Scan location
-- ---------------------------------------------------------------------------

alter table public.scans
  add column location_source text check (location_source in ('ip', 'gps')),
  add column city text check (char_length(city) <= 80),
  add column region text check (char_length(region) <= 80),
  add column country text check (char_length(country) <= 2);

comment on column public.scans.location_source is
  'ip: city-level estimate from the visitor connection (can be off by kilometres); gps: shared by the visitor, rounded to ~1 km.';

-- p_geo comes from the hosting edge (Cloudflare request.cf) via the browser: it's a hint, not proof.
drop function public.record_scan(text, text);

create function public.record_scan(p_token text, p_user_agent text, p_geo jsonb default null)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_tag public.pet_ids;
  v_scan_id uuid;
  v_lat numeric;
  v_lng numeric;
begin
  select * into v_tag from public.pet_ids where qr_token = p_token;
  if not found or v_tag.status = 'blocked' then
    return null;
  end if;

  if (select count(*) from public.scans
      where pet_id_reference = v_tag.id and scanned_at > now() - interval '10 minutes') >= 60 then
    return null;
  end if;

  begin
    v_lat := round((p_geo ->> 'latitude')::numeric, 2);
    v_lng := round((p_geo ->> 'longitude')::numeric, 2);
    if v_lat not between -90 and 90 or v_lng not between -180 and 180 then
      v_lat := null;
      v_lng := null;
    end if;
  exception when others then
    v_lat := null;
    v_lng := null;
  end;

  insert into public.scans (
    pet_id_reference, pet_id, user_agent, device,
    approximate_latitude, approximate_longitude, location_source, city, region, country
  )
  values (
    v_tag.id,
    v_tag.pet_id,
    left(p_user_agent, 300),
    case
      when p_user_agent ~* 'ipad|tablet' then 'tablet'
      when p_user_agent ~* 'mobi|android|iphone' then 'mobile'
      else 'desktop'
    end,
    v_lat,
    v_lng,
    case when v_lat is not null or nullif(trim(p_geo ->> 'city'), '') is not null then 'ip' end,
    left(nullif(trim(p_geo ->> 'city'), ''), 80),
    left(nullif(trim(p_geo ->> 'region'), ''), 80),
    case when p_geo ->> 'country' ~ '^[A-Za-z]{2}$' then upper(p_geo ->> 'country') end
  )
  returning id into v_scan_id;

  return v_scan_id;
end;
$$;

revoke all on function public.record_scan(text, text, jsonb) from public;
grant execute on function public.record_scan(text, text, jsonb) to anon, authenticated;

-- Same as before, plus marking the scan's location as GPS.
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
        approximate_longitude = round(p_longitude, 2),
        location_source = 'gps'
    where id = p_scan_id and pet_id = v_pet_id;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Web Push subscriptions (one row per browser/device)
-- ---------------------------------------------------------------------------

create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) <= 200),
  auth text not null check (char_length(auth) <= 100),
  user_agent text,
  created_at timestamptz not null default now()
);

create index push_subscriptions_user_id_idx on public.push_subscriptions (user_id);

alter table public.push_subscriptions enable row level security;

create policy "push_subscriptions: owner reads" on public.push_subscriptions
  for select to authenticated using (user_id = (select auth.uid()));

revoke all on public.push_subscriptions from anon, authenticated;
grant select on public.push_subscriptions to authenticated;
grant all on public.push_subscriptions to service_role;

-- A browser endpoint belongs to whoever subscribed last on that device (shared phones, account switches).
create or replace function public.save_push_subscription(
  p_endpoint text,
  p_p256dh text,
  p_auth text,
  p_user_agent text
)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  insert into public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  values (v_uid, p_endpoint, p_p256dh, p_auth, left(p_user_agent, 300))
  on conflict (endpoint) do update
  set user_id = excluded.user_id,
      p256dh = excluded.p256dh,
      auth = excluded.auth,
      user_agent = excluded.user_agent,
      created_at = now();
end;
$$;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void
language sql
volatile
security definer
set search_path = public
as $$
  delete from public.push_subscriptions where endpoint = p_endpoint and user_id = auth.uid();
$$;

revoke all on function public.save_push_subscription(text, text, text, text) from public;
revoke all on function public.delete_push_subscription(text) from public;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;
grant execute on function public.delete_push_subscription(text) to authenticated;
