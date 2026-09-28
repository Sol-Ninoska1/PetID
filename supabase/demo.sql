-- Demo data without the service role key: paste into the SQL Editor and run. Safe to run again (replaces the demo).
-- Creates demo@petid.app / PetID-demo-2026 with Max (/p/demo-max).
-- Requires migrations up to 20260926000000_pet_ids.sql.

do $$
declare
  v_uid uuid;
  v_max uuid;
  v_tag_max uuid;
  v_mobile text := 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148';
begin
  select id into v_uid from auth.users where email = 'demo@petid.app';

  if v_uid is null then
    v_uid := gen_random_uuid();
    insert into auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
      confirmation_token, recovery_token, email_change_token_new, email_change
    )
    values (
      '00000000-0000-0000-0000-000000000000', v_uid, 'authenticated', 'authenticated', 'demo@petid.app',
      extensions.crypt('PetID-demo-2026', extensions.gen_salt('bf')), now(),
      '{"provider": "email", "providers": ["email"]}', '{"name": "Sol Demo", "phone": "+56912345678"}', now(), now(),
      '', '', '', ''
    );
    insert into auth.identities (id, provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
    values (
      gen_random_uuid(), v_uid::text, v_uid,
      jsonb_build_object('sub', v_uid::text, 'email', 'demo@petid.app', 'email_verified', true),
      'email', now(), now(), now()
    );
  end if;

  -- Replace any previous demo (cascades to contacts, scans and reports).
  delete from public.pets where owner_id = v_uid;
  delete from public.pet_ids where qr_token like 'demo-%';

  insert into public.pets (owner_id, name, species, breed, sex, birth_date, color, weight, photo_url, description, allergies, special_needs)
  values (
    v_uid, 'Max', 'dog', 'Labrador', 'male', '2021-03-14', 'Dorado', 29.5,
    'https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=900&q=80',
    'Muy amistoso y juguetón. Responde a su nombre y le encantan las pelotas.',
    'Pollo', 'Le asustan los fuegos artificiales.'
  )
  returning id into v_max;

  insert into public.pet_ids (code, qr_token, status, owner_id, pet_id, sold_at, activated_at, notes)
  values ('DEMO-0001', 'demo-max', 'activated', v_uid, v_max, now() - interval '32 days', now() - interval '30 days', 'Demo')
  returning id into v_tag_max;

  insert into public.emergency_contacts (pet_id, name, phone, relationship)
  values (v_max, 'Camila Demo', '+56987654321', 'Hermana');

  insert into public.scans (pet_id_reference, pet_id, scanned_at, user_agent, device) values
    (v_tag_max, v_max, now() - interval '15 minutes', v_mobile, 'mobile'),
    (v_tag_max, v_max, now() - interval '26 hours', v_mobile, 'mobile');
end;
$$;
