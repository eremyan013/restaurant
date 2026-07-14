-- ─────────────────────────────────────────────
-- Tonir — Supabase Database Schema
-- Run this entire file in the Supabase SQL Editor
-- ─────────────────────────────────────────────

-- 1. VENUES
create table if not exists public.venues (
  id            text primary key,
  name          text not null,
  cuisine       text not null,
  area          text not null,
  price         text not null,
  rating        numeric(3,1) not null default 4.5,
  reviews_count integer not null default 0,
  photo_url     text not null,
  dish_url      text not null,
  distance_km   text not null,
  booked_today  integer not null default 0,
  heat          text not null check (heat in ('high','med','low')),
  kind          text not null check (kind in ('restaurant','bar','lounge','club')),
  coord_x       numeric not null,
  coord_y       numeric not null,
  description   text not null,
  times         text[] not null default '{}',
  perk          text not null default '500 մ',
  tags          text[] not null default '{}',
  created_at    timestamptz not null default now()
);

-- 2. PROFILES (one per auth user)
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  name          text not null default '',
  email         text not null default '',
  avatar_url    text,
  tier          text not null default 'Տոնիր',
  tier_level    integer not null default 1,
  yel_points    integer not null default 0,
  total_visits  integer not null default 0,
  created_at    timestamptz not null default now()
);

-- 3. RESERVATIONS
create table if not exists public.reservations (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  venue_id    text not null references public.venues(id) on delete cascade,
  people      integer not null,
  date        text not null,
  time        text not null,
  occasion    text,
  note        text,
  status      text not null default 'pending' check (status in ('pending','confirmed','cancelled','visited')),
  yel_earned  text not null default '0 մ',
  created_at  timestamptz not null default now()
);

-- 4. FAVORITES
create table if not exists public.favorites (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  venue_id    text not null references public.venues(id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, venue_id)
);

-- ─────────────────────────────────────────────
-- ROW LEVEL SECURITY
-- ─────────────────────────────────────────────

alter table public.venues       enable row level security;
alter table public.profiles     enable row level security;
alter table public.reservations enable row level security;
alter table public.favorites    enable row level security;

-- Venues: anyone can read
create policy "venues_public_read" on public.venues
  for select using (true);

-- Profiles: user can read and update their own
create policy "profiles_own_read" on public.profiles
  for select using (auth.uid() = id);

create policy "profiles_own_update" on public.profiles
  for update using (auth.uid() = id);

create policy "profiles_own_insert" on public.profiles
  for insert with check (auth.uid() = id);

-- Reservations: user can read and create their own
create policy "reservations_own_read" on public.reservations
  for select using (auth.uid() = user_id);

create policy "reservations_own_insert" on public.reservations
  for insert with check (auth.uid() = user_id);

create policy "reservations_own_update" on public.reservations
  for update using (auth.uid() = user_id);

-- Favorites: user can manage their own
create policy "favorites_own_read" on public.favorites
  for select using (auth.uid() = user_id);

create policy "favorites_own_insert" on public.favorites
  for insert with check (auth.uid() = user_id);

create policy "favorites_own_delete" on public.favorites
  for delete using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- AUTO-CREATE PROFILE ON SIGN UP
-- ─────────────────────────────────────────────

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', ''),
    coalesce(new.email, '')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─────────────────────────────────────────────
-- SEED DATA — all 14 Tonir venues
-- ─────────────────────────────────────────────

insert into public.venues (id, name, cuisine, area, price, rating, reviews_count, photo_url, dish_url, distance_km, booked_today, heat, kind, coord_x, coord_y, description, times, perk, tags) values
('dolmama', 'Դոլմամա', 'Հայկական · ավանդական', 'Պուշկինի փող.', '֏֏֏֏', 4.8, 2134,
 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=78&auto=format&fit=crop',
 '0.4 կմ', 49, 'high', 'restaurant', 44.515749, 40.180587,
 '1950-ականների ընտանեկան տուն՝ վերածված մոմավառ ճաշասենյակի։',
 array['18:30','19:00','19:30','20:00','20:30','21:00'], '1,000 մ', array['Ավանդական','Գինու քարտ','Բակ']),

('sherep', 'Շերեփ', 'Ժամանակակից հայկական', 'Սարյանի փող.', '֏֏֏', 4.7, 3220,
 'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=78&auto=format&fit=crop',
 '0.7 կմ', 74, 'high', 'restaurant', 44.511110, 40.178390,
 'Բաց խոհանոցով՝ ավանդական հայկական ճաշատեսակների վերանայում։',
 array['18:30','19:00','19:30','20:00','20:45'], '800 մ', array['Բաց խոհանոց','Հատուկ մենյու']),

('lavash', 'Լավաշ', 'Պանդոկ · խորոված', 'Թումանյանի փող.', '֏֏', 4.6, 5891,
 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1535140728325-a4d3707eee94?w=800&q=78&auto=format&fit=crop',
 '0.5 կմ', 132, 'high', 'restaurant', 44.516282, 40.183039,
 'Պանդոկային ճաշեր՝ խոզի և գառան խորոված, քյաբաբ ածուխի վրա։',
 array['18:00','18:30','19:00','19:30','20:00','20:30','21:00'], '500 մ', array['Կենդանի երաժշտություն','Խմբերի համար']),

('wine-republic', 'Wine Republic', 'Գինու բար · բիստրո', 'Սարյանի փող.', '֏֏֏', 4.7, 1843,
 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=78&auto=format&fit=crop',
 '0.9 կմ', 41, 'med', 'restaurant', 44.516078, 40.189260,
 'Ապակյա ճակատով բիստրո՝ գինու փողոցում։ 80 հայկական մակնիշ բաժակով։',
 array['18:30','19:00','19:30','20:15','21:00'], '750 մ', array['Գինու ընտրանք','Սոմելյե']),

('in-vino', 'In Vino', 'Գինու բար', 'Սարյանի փող.', '֏֏', 4.5, 2470,
 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=78&auto=format&fit=crop',
 '0.9 կմ', 38, 'med', 'bar', 44.516388, 40.185240,
 'Նկուղային գինու բար — 500+ մակնիշ, մոմավառ անկյուններ։',
 array['19:00','19:30','20:00','20:30','21:00','21:30','22:00'], '500 մ', array['Մինչ ուշ','Գինու նկուղ']),

('kond-house', 'Կոնդ Հաուս', 'Ժամանակակից', 'Կոնդ', '֏֏֏', 4.6, 612,
 'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=78&auto=format&fit=crop',
 '1.4 կմ', 22, 'med', 'restaurant', 44.502955, 40.180485,
 'Վերականգնված քարե տուն Կոնդ թաղամասում — վեց սեղան, սեթ-մենյու։',
 array['19:00','19:30','20:30'], '1,200 մ', array['Հատուկ մենյու','Ինտիմ']),

('tumanyan-khinkali', 'Թումանյան Խինկալի', 'Վրացական', 'Թումանյանի փող.', '֏֏', 4.4, 4912,
 'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=78&auto=format&fit=crop',
 '0.6 կմ', 88, 'high', 'restaurant', 44.516140, 40.183120,
 'Շոգեխաշած խինկալի, ադջարուլի խաչապուրի, չուրչխելա աղանդերին։',
 array['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'], '300 մ', array['Մինչ ուշ','Ընտանեկան']),

('anteb', 'Անթեպ', 'Լևանտական', 'Մաշտոցի պող.', '֏֏', 4.5, 1980,
 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=78&auto=format&fit=crop',
 '1.1 կմ', 35, 'med', 'restaurant', 44.511589, 40.181987,
 'Հալեպից Երևան բերված խոհանոց։ Լահմաջուն, ապխտած սմբուկ, մեզե։',
 array['18:30','19:00','19:30','20:00','20:30'], '600 մ', array['Մեզե','Բուսակեր ընտրանք']),

('cascade-cafe', 'Կասկադ սրճարան', 'Իտալական · սրճարան', 'Կասկադ', '֏֏', 4.3, 1450,
 'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=78&auto=format&fit=crop',
 '1.2 կմ', 27, 'med', 'restaurant', 44.514200, 40.189300,
 'Բաց պատշգամբ Կասկադի քանդակների տակ — փայտով թխած պիցցա։',
 array['18:00','18:30','19:30','20:00','20:30','21:00'], '400 մ', array['Պատշգամբ','Ապերիտիվ']),

('calumet', 'Կալումետ', 'Լաունջ', 'Մաշտոցի պող.', '֏֏', 4.6, 3100,
 'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=78&auto=format&fit=crop',
 '1.3 կմ', 78, 'high', 'lounge', 44.509573, 40.185132,
 'Բարձր բարձերով հատակային նստարան, DJ-եր, քյալյան մինչև 2:00։',
 array['20:00','20:30','21:00','21:30','22:00','22:30','23:00'], '600 մ', array['Քյալյան','DJ','Մինչ ուշ']),

('theater-bar', 'Theater Bar', 'Կոկտեյլ բար', 'Հյուսիսային պող.', '֏֏֏', 4.8, 870,
 'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=78&auto=format&fit=crop',
 '0.6 կմ', 64, 'high', 'bar', 44.515100, 40.185800,
 'Վարագույրապատ սպիկ-իզի պողոտայում։ Ֆիրմային «Գառնի Սաուր» կոկտեյլ։',
 array['20:30','21:00','21:30','22:00','22:30','23:00','23:30'], '700 մ', array['Սպիկ-իզի','Կոկտեյլներ']),

('pandok', 'Պանդոկ Երևան', 'Խորոված · պանդոկ', 'Հանրապետության հր.', '֏֏֏', 4.5, 6800,
 'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=78&auto=format&fit=crop',
 '0.3 կմ', 142, 'high', 'restaurant', 44.521242, 40.188962,
 'Եռհարկ պանդոկ Հանրապետության հրապարակի մոտ։ Գառան խորոված, պարուհիներ։',
 array['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30'], '900 մ', array['Ավանդական','Պարուհիներ','Խմբեր']),

('mirzoyan', 'Միրզոյան գրադարան', 'Սրճարան · այգի', 'Մ. Մկրտչյանի փող.', '֏֏', 4.7, 1340,
 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=78&auto=format&fit=crop',
 '0.8 կմ', 19, 'low', 'restaurant', 44.512196, 40.174892,
 '19-րդ դարի տանը գրադարան, ետևի բակում սրճարան։ Բրանչ և ուժեղ սուրճ։',
 array['10:00','11:00','12:00','13:00','14:00','15:00'], '300 մ', array['Բրանչ','Այգի','Սուրճ']),

('club-aurora', 'Aurora Club', 'Ակումբ', 'Արդյունաբերական', '֏֏֏', 4.3, 1100,
 'https://images.unsplash.com/photo-1571266028243-d220c6a83ad9?w=800&q=78&auto=format&fit=crop',
 'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=78&auto=format&fit=crop',
 '3.4 կմ', 47, 'med', 'club', 44.548000, 40.192000,
 'Պահեստային մթնոլորտով ակումբ։ Հաուս/տեխնո, սեղանի սպասարկում, 23:00-ից։',
 array['23:00','23:30','00:00','00:30','01:00'], '1,500 մ', array['Սեղանի սպասարկ.','Հաուս/Տեխնո'])

on conflict (id) do nothing;
