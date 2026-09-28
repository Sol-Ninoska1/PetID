-- Support contact form (anyone can write; only admins read) and customer reviews (1–5 stars).
-- New support messages are emailed to the admin by the notify-support Edge Function. Like push-owner,
-- its URL lives in Vault and the shared secret is reused; until the URL exists the trigger does nothing:
--   select vault.create_secret('https://<project>.supabase.co/functions/v1/notify-support', 'notify_support_url');

-- ─── Support messages ──────────────────────────────────────────────────────

create table public.support_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid default auth.uid() references public.profiles (id) on delete set null,
  name text not null check (char_length(trim(name)) between 1 and 100),
  email text not null check (char_length(email) <= 200 and email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  phone text check (char_length(phone) <= 30),
  topic text not null check (topic in ('activacion', 'pedido', 'tecnico', 'sugerencia', 'otro')),
  message text not null check (char_length(trim(message)) between 1 and 2000),
  status text not null default 'nuevo' check (status in ('nuevo', 'resuelto')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index support_messages_created_idx on public.support_messages (created_at desc);
create index support_messages_email_idx on public.support_messages (lower(email), created_at desc);

alter table public.support_messages enable row level security;

create policy "support_messages: anyone sends" on public.support_messages
  for insert to anon, authenticated
  with check (user_id is not distinct from (select auth.uid()) and status = 'nuevo');
create policy "support_messages: admin reads" on public.support_messages
  for select to authenticated using ((select public.is_admin()));
create policy "support_messages: admin updates" on public.support_messages
  for update to authenticated using ((select public.is_admin())) with check ((select public.is_admin()));

revoke all on public.support_messages from anon, authenticated;
grant insert (name, email, phone, topic, message) on public.support_messages to anon, authenticated;
grant select on public.support_messages to authenticated;
grant update (status) on public.support_messages to authenticated;
grant all on public.support_messages to service_role;

create or replace function private.support_messages_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if (
      select count(*) from public.support_messages
      where lower(email) = lower(new.email) and created_at > now() - interval '1 hour'
    ) >= 5 then
      raise exception 'too_many_messages' using errcode = 'P0001';
    end if;
  else
    new.resolved_at := case when new.status = 'resuelto' then coalesce(old.resolved_at, now()) end;
  end if;
  return new;
end;
$$;

create trigger support_messages_guard
  before insert or update on public.support_messages
  for each row execute function private.support_messages_guard();

create or replace function private.notify_support()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_url text;
  v_secret text;
begin
  select decrypted_secret into v_url from vault.decrypted_secrets where name = 'notify_support_url';
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

create trigger support_messages_notify
  after insert on public.support_messages
  for each row execute function private.notify_support();

-- ─── Reviews ───────────────────────────────────────────────────────────────

create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique default auth.uid() references public.profiles (id) on delete cascade,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  comment text check (char_length(comment) <= 1000),
  is_hidden boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index reviews_visible_idx on public.reviews (created_at desc) where not is_hidden;

create trigger reviews_set_updated_at
  before update on public.reviews
  for each row execute function public.set_updated_at();

-- The public name is the author's first name, taken from their profile so it can't be spoofed.
create or replace function private.reviews_set_author()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(nullif(split_part(trim(p.name), ' ', 1), ''), 'Cliente')
  into new.author_name
  from public.profiles p
  where p.id = new.user_id;
  new.author_name := coalesce(new.author_name, 'Cliente');
  new.comment := nullif(trim(new.comment), '');
  return new;
end;
$$;

create trigger reviews_set_author
  before insert or update of rating, comment on public.reviews
  for each row execute function private.reviews_set_author();

alter table public.reviews enable row level security;

-- Only customers with at least one registered pet can review; one review per account.
create policy "reviews: customers create their own" on public.reviews
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and exists (select 1 from public.pets where owner_id = (select auth.uid()))
  );
create policy "reviews: author reads own" on public.reviews
  for select to authenticated using (user_id = (select auth.uid()));
create policy "reviews: author updates own" on public.reviews
  for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy "reviews: author deletes own" on public.reviews
  for delete to authenticated using (user_id = (select auth.uid()));
create policy "reviews: admin reads" on public.reviews
  for select to authenticated using ((select public.is_admin()));

-- The public reads reviews through get_public_reviews() (no user ids, hidden ones excluded).
revoke all on public.reviews from anon, authenticated;
grant select, delete on public.reviews to authenticated;
grant insert (rating, comment), update (rating, comment) on public.reviews to authenticated;
grant all on public.reviews to service_role;

create or replace function public.get_public_reviews(p_limit integer default 30)
returns jsonb
language sql
stable
security definer
set search_path = public
as $$
  select jsonb_build_object(
    'average', coalesce((select round(avg(rating)::numeric, 1) from public.reviews where not is_hidden), 0),
    'total', (select count(*) from public.reviews where not is_hidden),
    'counts', (
      select jsonb_object_agg(s, (select count(*) from public.reviews where not is_hidden and rating = s))
      from generate_series(1, 5) s
    ),
    'reviews', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'author_name', r.author_name, 'rating', r.rating, 'comment', r.comment, 'created_at', r.created_at
      ) order by r.created_at desc)
      from (
        select * from public.reviews
        where not is_hidden
        order by created_at desc
        limit least(greatest(p_limit, 1), 100)
      ) r
    ), '[]'::jsonb)
  );
$$;

create or replace function public.admin_set_review_hidden(p_id uuid, p_hidden boolean)
returns void
language plpgsql
volatile
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'forbidden' using errcode = '42501';
  end if;
  update public.reviews set is_hidden = p_hidden where id = p_id;
  if not found then
    raise exception 'review_not_found';
  end if;
end;
$$;

revoke all on function public.get_public_reviews(integer) from public;
revoke all on function public.admin_set_review_hidden(uuid, boolean) from public;
grant execute on function public.get_public_reviews(integer) to anon, authenticated;
grant execute on function public.admin_set_review_hidden(uuid, boolean) to authenticated;

notify pgrst, 'reload schema';
