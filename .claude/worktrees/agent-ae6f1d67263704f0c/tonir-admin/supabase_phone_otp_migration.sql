-- Phone OTP verification codes
create table if not exists phone_otp_codes (
  id         uuid        default gen_random_uuid() primary key,
  user_id    uuid        references auth.users(id) on delete cascade not null,
  phone      text        not null,
  code       text        not null,
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  used       boolean     not null default false,
  created_at timestamptz not null default now()
);

-- Only service role accesses this table; no user-level RLS needed
alter table phone_otp_codes enable row level security;

-- Index for fast lookup by user_id
create index if not exists phone_otp_codes_user_id_idx on phone_otp_codes (user_id);

-- phone_verified column on profiles (safe on existing DBs)
alter table profiles add column if not exists phone_verified boolean not null default false;
