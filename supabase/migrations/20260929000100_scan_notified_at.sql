-- push-owner stamps the scans that actually notified the owner. The 2-minute scan cooldown counts from the last
-- notified scan, so a chain of scans a minute apart (none of them notified) no longer silences every alert.

alter table public.scans add column if not exists notified_at timestamptz;

create index if not exists scans_pet_id_notified_at_idx on public.scans (pet_id, notified_at desc)
  where notified_at is not null;
