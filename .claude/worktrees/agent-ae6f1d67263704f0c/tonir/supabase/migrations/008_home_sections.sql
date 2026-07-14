-- 008_home_sections.sql
-- Home Sections: admin-managed rows on the mobile HomeScreen

create table home_sections (
  id           uuid        primary key default gen_random_uuid(),
  name         text        not null,
  name_hy      text        null,
  name_ru      text        null,
  name_en      text        null,
  eyebrow      text        not null default '',
  eyebrow_hy   text        null,
  eyebrow_ru   text        null,
  eyebrow_en   text        null,
  sort_order   int         not null default 0,
  is_active    boolean     not null default true,
  section_type text        not null default 'venue'
                           check (section_type in ('venue', 'guide')),
  is_builtin   boolean     not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table home_section_items (
  id           uuid        primary key default gen_random_uuid(),
  section_id   uuid        not null references home_sections(id) on delete cascade,
  sort_order   int         not null default 0,
  item_type    text        not null check (item_type in ('venue', 'guide')),
  venue_id     text        null references venues(id) on delete cascade,
  guide_id     text        null,
  created_at   timestamptz not null default now(),
  unique (section_id, venue_id),
  unique (section_id, guide_id),
  constraint item_has_exactly_one_target check (
    (item_type = 'venue' and venue_id is not null and guide_id is null) or
    (item_type = 'guide' and guide_id is not null and venue_id is null)
  )
);

-- guide_id is text null intentionally — no FK constraint until guides.id type is confirmed

create index idx_home_sections_sort         on home_sections(sort_order) where is_active = true;
create index idx_home_section_items_section  on home_section_items(section_id, sort_order);
create index idx_home_section_items_venue    on home_section_items(venue_id) where venue_id is not null;
create index idx_home_section_items_guide    on home_section_items(guide_id) where guide_id is not null;

alter table home_sections      enable row level security;
alter table home_section_items enable row level security;

create policy "public_read_active_home_sections"
  on home_sections for select using (is_active = true);

create policy "public_read_home_section_items"
  on home_section_items for select
  using (
    exists (
      select 1 from home_sections s
      where s.id = home_section_items.section_id and s.is_active = true
    )
  );

insert into home_sections
  (id, name, name_hy, name_ru, name_en, eyebrow, eyebrow_hy, eyebrow_ru, eyebrow_en,
   sort_order, is_active, section_type, is_builtin)
values
  ('a0000000-0000-0000-0000-000000000001',
   'Tonight', 'Այս գիշեր', 'Сегодня вечером', 'Tonight',
   'Hot right now', 'Տաք հիմա', 'Горячее сейчас', 'Hot right now',
   0, true, 'venue', true),
  ('a0000000-0000-0000-0000-000000000002',
   'Popular Guides', 'Հայտնի ուղեցույցներ', 'Популярные гиды', 'Popular Guides',
   'Curated for you', 'Ձևավոր ձեզ համար', 'Подобрано для вас', 'Curated for you',
   1, true, 'guide', true),
  ('a0000000-0000-0000-0000-000000000003',
   'Community Trend', 'Համայնքի թրենդ', 'Тренд сообщества', 'Community Trend',
   'Everyone is talking', 'Բոլորն են խոսում', 'Все говорят', 'Everyone is talking',
   2, true, 'venue', true),
  ('a0000000-0000-0000-0000-000000000004',
   'Nightlife', 'Գիշերային կյանք', 'Ночная жизнь', 'Nightlife',
   'Bars & clubs', 'Բարեր և ակումբներ', 'Бары и клубы', 'Bars & clubs',
   3, true, 'venue', true)
on conflict (id) do nothing;
