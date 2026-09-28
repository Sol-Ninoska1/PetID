-- Cover photo (Facebook-style banner) shown above the pet's photo on the public profile.

alter table public.pets
  add column if not exists cover_url text check (cover_url ~ '^https://');

grant update (cover_url) on public.pets to authenticated;

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
      sold_at = coalesce(sold_at, now())
  where id = v_tag.id;

  return v_pet_id;
end;
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
