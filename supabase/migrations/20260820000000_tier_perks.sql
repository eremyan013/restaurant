-- P2 #16: Loyalty Tier Concrete Perks

CREATE TABLE IF NOT EXISTS tier_perks (
  id          UUID      PRIMARY KEY DEFAULT gen_random_uuid(),
  tier_level  SMALLINT  NOT NULL CHECK (tier_level BETWEEN 1 AND 4),
  label_hy    TEXT      NOT NULL DEFAULT '',
  label_ru    TEXT      NOT NULL DEFAULT '',
  label_en    TEXT      NOT NULL DEFAULT '',
  icon_name   TEXT      NULL,
  sort_order  SMALLINT  NOT NULL DEFAULT 0,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS tier_perks_tier_level_sort_idx
  ON tier_perks (tier_level, sort_order);

ALTER TABLE tier_perks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "tier_perks_select_public"
  ON tier_perks FOR SELECT USING (true);

-- Seed defaults
INSERT INTO tier_perks (tier_level, label_hy, label_ru, label_en, icon_name, sort_order) VALUES
  (1, 'Yel կետերի կուտակում',   'Накопление Yel баллов',     'Earn Yel points',         'sparkle',  0),
  (2, 'Yel կետերի կուտակում',   'Накопление Yel баллов',     'Earn Yel points',         'sparkle',  0),
  (2, 'Առաջնահերթ ամրագրում',    'Приоритетное бронирование', 'Priority reservation',    'calendar', 1),
  (3, 'Yel կետերի կուտակում',   'Накопление Yel баллов',     'Earn Yel points',         'sparkle',  0),
  (3, 'Առաջնահերթ ամրագրում',    'Приоритетное бронирование', 'Priority reservation',    'calendar', 1),
  (3, 'Հատուկ առաջարկներ',       'Специальные предложения',   'Exclusive offers',        'gift',     2),
  (4, 'Yel կետերի կուտակում',   'Накопление Yel баллов',     'Earn Yel points',         'sparkle',  0),
  (4, 'Առաջնահերթ ամրագրում',    'Приоритетное бронирование', 'Priority reservation',    'calendar', 1),
  (4, 'Հատուկ առաջարկներ',       'Специальные предложения',   'Exclusive offers',        'gift',     2),
  (4, 'Master անդամի քարտ',      'Карточка участника Master', 'Master member card',      'user',     3);
