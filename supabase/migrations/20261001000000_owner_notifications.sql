-- Owner notification centre: a single history of found reports, shared locations and notified scans (the same
-- events that send a push). "Seen" and "cleared" are per-owner timestamps, so scans need no read flag and clearing
-- only hides the history from the bell: the pet's activity page and the admin still see every row.

alter table public.profiles
  add column if not exists notifications_seen_at timestamptz not null default now(),
  add column if not exists notifications_cleared_at timestamptz;

-- Alerts that were still unread before this migration keep counting as new.
update public.profiles pr
set notifications_seen_at = coalesce((
  select min(x.created_at) - interval '1 second'
  from (
    select f.created_at from public.found_reports f join public.pets p on p.id = f.pet_id
    where p.owner_id = pr.id and f.read_at is null
    union all
    select l.created_at from public.location_shares l join public.pets p on p.id = l.pet_id
    where p.owner_id = pr.id and l.read_at is null
  ) x
), notifications_seen_at);

create or replace function public.list_notifications(p_limit int default 100)
returns table (kind text, created_at timestamptz, pet_name text, unseen boolean, payload jsonb)
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id, notifications_seen_at as seen, coalesce(notifications_cleared_at, '-infinity') as cleared
    from public.profiles where id = (select auth.uid())
  ),
  mine as (
    select p.id, p.name from public.pets p join me on p.owner_id = me.id
  ),
  events as (
    select 'found_report'::text as kind, f.created_at as at, m.name, to_jsonb(f) as payload
    from public.found_reports f join mine m on m.id = f.pet_id
    union all
    select 'location_share', l.created_at, m.name, to_jsonb(l)
    from public.location_shares l join mine m on m.id = l.pet_id
    union all
    select 'scan', s.notified_at, m.name, to_jsonb(s)
    from public.scans s join mine m on m.id = s.pet_id
    where s.notified_at is not null
  )
  select e.kind, e.at, e.name, e.at > me.seen, e.payload
  from events e cross join me
  where e.at > me.cleared
  order by e.at desc
  limit least(greatest(p_limit, 1), 200);
$$;

create or replace function public.unseen_notification_count()
returns int
language sql
stable
security definer
set search_path = public
as $$
  with me as (
    select id, greatest(notifications_seen_at, coalesce(notifications_cleared_at, '-infinity')) as since
    from public.profiles where id = (select auth.uid())
  ),
  mine as (
    select p.id from public.pets p join me on p.owner_id = me.id
  )
  select (
    (select count(*) from public.found_reports f join mine m on m.id = f.pet_id, me where f.created_at > me.since)
    + (select count(*) from public.location_shares l join mine m on m.id = l.pet_id, me where l.created_at > me.since)
    + (select count(*) from public.scans s join mine m on m.id = s.pet_id, me where s.notified_at > me.since)
  )::int;
$$;

-- Opening the history marks everything as seen; found reports and locations also get read_at like before.
create or replace function public.mark_notifications_seen()
returns void
language sql
security definer
set search_path = public
as $$
  update public.profiles set notifications_seen_at = now() where id = (select auth.uid());

  update public.found_reports f
  set read_at = now(), status = case when f.status = 'new' then 'read' else f.status end
  from public.pets p
  where p.id = f.pet_id and p.owner_id = (select auth.uid()) and f.read_at is null;

  update public.location_shares l
  set read_at = now()
  from public.pets p
  where p.id = l.pet_id and p.owner_id = (select auth.uid()) and l.read_at is null;
$$;

create or replace function public.clear_notifications()
returns void
language sql
security definer
set search_path = public
as $$
  select public.mark_notifications_seen();
  update public.profiles set notifications_cleared_at = now() where id = (select auth.uid());
$$;

revoke all on function public.list_notifications(int) from public;
revoke all on function public.unseen_notification_count() from public;
revoke all on function public.mark_notifications_seen() from public;
revoke all on function public.clear_notifications() from public;
grant execute on function public.list_notifications(int) to authenticated;
grant execute on function public.unseen_notification_count() to authenticated;
grant execute on function public.mark_notifications_seen() to authenticated;
grant execute on function public.clear_notifications() to authenticated;
