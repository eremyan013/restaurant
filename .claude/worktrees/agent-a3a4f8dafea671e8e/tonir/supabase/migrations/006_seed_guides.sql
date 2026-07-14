-- ============================================================
-- Migration 006: Seed guides
-- Migrates the hardcoded GUIDES array from data.ts into the DB.
-- ON CONFLICT DO NOTHING — safe to re-run; won't overwrite edits.
-- ============================================================

INSERT INTO guides (id, title, subtitle, count, cover_url, tag, sort_order, is_active)
VALUES
  (
    'top50',
    'Երևանի լավագույն 50-ը',
    'Tonir ուղեցույց · 2026',
    50,
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=78&auto=format&fit=crop',
    'Խմբ. ընտրությունը',
    0,
    true
  ),
  (
    'wine',
    'Սարյան փող. գինու երթ',
    '12 բար · մեկ երեկո',
    12,
    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=78&auto=format&fit=crop',
    'Երթուղի',
    1,
    true
  ),
  (
    'khorovats',
    'Լավագույն խորոված',
    'Որտեղ են գնում տեղացիները',
    18,
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=78&auto=format&fit=crop',
    'Տեղական',
    2,
    true
  ),
  (
    'patio',
    'Կասկադի պատշգամբներ',
    'Մայրամուտի սեզոնը բացված է',
    14,
    'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800&q=78&auto=format&fit=crop',
    'Սեզոնային',
    3,
    true
  ),
  (
    'late',
    'Կեսգիշերից հետո',
    'Խոհանոցները դեռ բաց են',
    22,
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=78&auto=format&fit=crop',
    'Մինչ ուշ',
    4,
    true
  ),
  (
    'date',
    'Ռոմանտիկ երեկո',
    'Ինտիմ և մոմավառ',
    16,
    'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=800&q=78&auto=format&fit=crop',
    'Ռոմանտիկ',
    5,
    true
  )
ON CONFLICT (id) DO NOTHING;
