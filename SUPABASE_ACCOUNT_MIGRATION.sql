alter table profiles
  add column if not exists addresses jsonb not null default '[]'::jsonb;

create unique index if not exists profiles_firebase_uid_unique_idx
  on profiles (firebase_uid)
  where firebase_uid is not null;