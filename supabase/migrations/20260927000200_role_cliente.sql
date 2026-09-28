-- The default role is stored as 'cliente' (was 'owner'). Admins are still promoted only via SQL.

alter table public.profiles drop constraint profiles_role_check;

update public.profiles set role = 'cliente' where role = 'owner';

alter table public.profiles
  alter column role set default 'cliente',
  add constraint profiles_role_check check (role in ('cliente', 'admin'));
