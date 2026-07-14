# Database Schema — Tonir (Supabase/PostgreSQL)

## Tables

### restaurants
```sql
create table restaurants (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  address text not null,
  phone text not null,
  email text not null,
  image_url text,
  timezone text not null default 'UTC',
  slot_duration_minutes int not null default 90,
  max_party_size int not null default 20,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### tables
```sql
create table tables (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  name text not null,        -- e.g. "Table 1", "Booth A"
  capacity int not null,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### schedules
```sql
create table schedules (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=Sunday
  open_time time not null,   -- e.g. '18:00:00'
  close_time time not null,  -- e.g. '23:00:00'
  is_open boolean not null default true,
  unique(restaurant_id, day_of_week)
);
```

### blocked_dates
```sql
create table blocked_dates (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id) on delete cascade,
  date date not null,
  reason text,
  unique(restaurant_id, date)
);
```

### reservations
```sql
create type reservation_status as enum (
  'pending', 'confirmed', 'cancelled', 'completed', 'no_show'
);

create table reservations (
  id uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references restaurants(id),
  table_id uuid references tables(id),
  guest_name text not null,
  guest_email text not null,
  guest_phone text not null,
  party_size int not null,
  date date not null,
  time_slot time not null,       -- e.g. '18:00:00'
  status reservation_status not null default 'pending',
  notes text,
  confirm_token uuid unique default gen_random_uuid(),
  cancel_token uuid unique default gen_random_uuid(),
  reminder_sent boolean not null default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

### profiles (extends Supabase auth.users)
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null,
  role text not null default 'staff' check (role in ('admin', 'staff')),
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
```

## Indexes
```sql
-- Availability checks
create index idx_reservations_date_slot on reservations(restaurant_id, date, time_slot);
create index idx_reservations_table on reservations(table_id, date, time_slot);

-- Guest lookup
create index idx_reservations_email on reservations(guest_email);
create index idx_reservations_status on reservations(status);

-- Token lookups
create index idx_reservations_confirm_token on reservations(confirm_token);
create index idx_reservations_cancel_token on reservations(cancel_token);
```

## Row Level Security (RLS)

### reservations
```sql
-- Enable RLS
alter table reservations enable row level security;

-- Guests can read their own reservation via token (no auth needed)
create policy "guests can view own reservation by token"
  on reservations for select
  using (true); -- filtered in app logic by token

-- Guests can create reservations (unauthenticated)
create policy "anyone can create reservation"
  on reservations for insert
  with check (true);

-- Only staff/admin can update reservations
create policy "staff can update reservations"
  on reservations for update
  using (
    exists (
      select 1 from profiles
      where id = auth.uid()
      and role in ('admin', 'staff')
      and is_active = true
    )
  );
```

### tables, schedules, blocked_dates
```sql
-- Public read (needed to show availability)
create policy "public can read tables"
  on tables for select using (true);

-- Only admin can modify
create policy "admin can manage tables"
  on tables for all
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

### profiles
```sql
alter table profiles enable row level security;

-- Users can read their own profile
create policy "users can read own profile"
  on profiles for select
  using (auth.uid() = id);

-- Admin can read all profiles
create policy "admin can read all profiles"
  on profiles for select
  using (
    exists (
      select 1 from profiles
      where id = auth.uid() and role = 'admin'
    )
  );
```

## Triggers
```sql
-- Auto-update updated_at on any table change
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger set_updated_at
  before update on reservations
  for each row execute function update_updated_at();
-- Repeat for tables, restaurants, profiles
```

## Key Relationships
- `restaurants` → many `tables`, `schedules`, `blocked_dates`, `reservations`
- `tables` → many `reservations`
- `auth.users` → one `profiles` (extended user info + role)
- Guests do NOT need a Supabase auth account to make a reservation
