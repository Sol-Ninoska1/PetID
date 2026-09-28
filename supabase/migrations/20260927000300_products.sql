-- Product catalog (collars, plates, tags) with color/size variants and stock per variant.
-- Admins manage it; the public landing reads it through get_catalog() (no stock numbers exposed).
-- Independent from pet_ids on purpose.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 120),
  description text check (char_length(description) <= 2000),
  type text not null check (type in ('collar', 'placa', 'tag')),
  photo_url text check (photo_url ~ '^https://'),
  price_clp integer not null check (price_clp between 0 and 100000000),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger products_set_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

create table public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products (id) on delete cascade,
  color text check (char_length(color) <= 40),
  size text check (char_length(size) <= 20),
  stock integer not null default 0 check (stock between 0 and 1000000),
  position smallint not null default 0
);

create unique index product_variants_unique_idx
  on public.product_variants (product_id, lower(coalesce(color, '')), lower(coalesce(size, '')));

alter table public.products enable row level security;
alter table public.product_variants enable row level security;

create policy "products: admin reads" on public.products
  for select to authenticated using ((select public.is_admin()));
create policy "products: admin updates" on public.products
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));
create policy "products: admin deletes" on public.products
  for delete to authenticated using ((select public.is_admin()));

create policy "product_variants: admin reads" on public.product_variants
  for select to authenticated using ((select public.is_admin()));

-- Creation and edits (product + variants together) go through admin_save_product.
revoke all on public.products, public.product_variants from anon, authenticated;
grant select, delete on public.products to authenticated;
grant update (is_active) on public.products to authenticated;
grant select on public.product_variants to authenticated;
grant all on public.products, public.product_variants to service_role;

-- Saves a product and replaces its variants in one transaction. p_id null creates a new product.
create or replace function public.admin_save_product(p_id uuid, p_product jsonb, p_variants jsonb)
returns uuid
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  v_id uuid;
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  if jsonb_typeof(p_variants) is distinct from 'array' or jsonb_array_length(p_variants) = 0 then
    raise exception 'variants_required';
  end if;

  if p_id is null then
    insert into public.products (name, description, type, photo_url, price_clp, is_active)
    values (
      trim(p_product ->> 'name'),
      nullif(trim(p_product ->> 'description'), ''),
      p_product ->> 'type',
      nullif(p_product ->> 'photo_url', ''),
      (p_product ->> 'price_clp')::integer,
      coalesce((p_product ->> 'is_active')::boolean, true)
    )
    returning id into v_id;
  else
    update public.products
    set name = trim(p_product ->> 'name'),
        description = nullif(trim(p_product ->> 'description'), ''),
        type = p_product ->> 'type',
        photo_url = nullif(p_product ->> 'photo_url', ''),
        price_clp = (p_product ->> 'price_clp')::integer,
        is_active = coalesce((p_product ->> 'is_active')::boolean, true)
    where id = p_id
    returning id into v_id;
    if v_id is null then
      raise exception 'product_not_found';
    end if;
    delete from public.product_variants where product_id = v_id;
  end if;

  insert into public.product_variants (product_id, color, size, stock, position)
  select v_id,
         nullif(trim(e ->> 'color'), ''),
         nullif(trim(e ->> 'size'), ''),
         coalesce((e ->> 'stock')::integer, 0),
         (t.ord - 1)::smallint
  from jsonb_array_elements(p_variants) with ordinality as t(e, ord);

  return v_id;
end;
$$;

-- Public catalog: active products only, and just whether each variant is in stock.
create or replace function public.get_catalog()
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id,
    'name', p.name,
    'description', p.description,
    'type', p.type,
    'photo_url', p.photo_url,
    'price_clp', p.price_clp,
    'variants', coalesce((
      select jsonb_agg(jsonb_build_object('color', v.color, 'size', v.size, 'in_stock', v.stock > 0) order by v.position)
      from public.product_variants v
      where v.product_id = p.id
    ), '[]'::jsonb)
  ) order by p.created_at), '[]'::jsonb)
  from public.products p
  where p.is_active;
$$;

revoke all on function public.admin_save_product(uuid, jsonb, jsonb) from public;
revoke all on function public.get_catalog() from public;
grant execute on function public.admin_save_product(uuid, jsonb, jsonb) to authenticated;
grant execute on function public.get_catalog() to anon, authenticated;

-- Product photos: public read, admin write.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('product-photos', 'product-photos', true, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

create policy "product-photos: admin uploads" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-photos' and (select public.is_admin()));

create policy "product-photos: admin updates" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-photos' and (select public.is_admin()));

create policy "product-photos: admin deletes" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-photos' and (select public.is_admin()));
