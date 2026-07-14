-- ============================================================
-- Migration 007: Seed venues
-- Inserts all 14 venues from data.ts into the venues table.
-- ON CONFLICT (id) DO NOTHING — safe to re-run if venues already
-- exist in Supabase; will not overwrite any admin edits.
-- ============================================================

INSERT INTO venues (
  id, name, cuisine, area, price,
  rating, reviews_count, photo_url, dish_url,
  distance_km, booked_today, heat, kind,
  coord_x, coord_y, description, times, perk, tags, is_active
) VALUES

  -- 1. Dolmama
  (
    'dolmama', 'Դոլմամա', 'Հայկական · ավանդական', 'Պուշկինի փող.', '֏֏֏֏',
    4.8, 2134,
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=78&auto=format&fit=crop',
    '0.4 կմ', 49, 'high', 'restaurant',
    48, 42,
    '1950-ականների ընտանեկան տուն՝ վերածված մոմավառ ճաշասենյակի։ Գառան խորոված որթատի ճյուղերի վրա, ընկույզով տոլմա և 200 հայկական գինիների ցուցակ։',
    ARRAY['18:30','19:00','19:30','20:00','20:30','21:00'],
    '1,000 մ',
    ARRAY['Ավանդական','Գինու քարտ','Բակ'],
    true
  ),

  -- 2. Sherep
  (
    'sherep', 'Շերեփ', 'Ժամանակակից հայկական', 'Սարյանի փող.', '֏֏֏',
    4.7, 3220,
    'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=78&auto=format&fit=crop',
    '0.7 կմ', 74, 'high', 'restaurant',
    30, 35,
    'Բաց խոհանոցով՝ ավանդական հայկական ճաշատեսակների վերանայում։ Սերկևիլով ղափամա, իշխանի թարթար, ապակյա տոնիրի վրա թխվող լավաշ։',
    ARRAY['18:30','19:00','19:30','20:00','20:45'],
    '800 մ',
    ARRAY['Բաց խոհանոց','Հատուկ մենյու'],
    true
  ),

  -- 3. Lavash
  (
    'lavash', 'Լավաշ', 'Պանդոկ · խորոված', 'Թումանյանի փող.', '֏֏',
    4.6, 5891,
    'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1535140728325-a4d3707eee94?w=800&q=78&auto=format&fit=crop',
    '0.5 կմ', 132, 'high', 'restaurant',
    42, 50,
    'Պանդոկային ճաշեր՝ խոզի և գառան խորոված, քյաբաբ ածուխի վրա, սմբուկի խավիար։ Դուդուկի կենդանի կատարում հնգ–շբթ։',
    ARRAY['18:00','18:30','19:00','19:30','20:00','20:30','21:00'],
    '500 մ',
    ARRAY['Կենդանի երաժշտություն','Խմբերի համար'],
    true
  ),

  -- 4. Wine Republic
  (
    'wine-republic', 'Wine Republic', 'Գինու բար · բիստրո', 'Սարյանի փող.', '֏֏֏',
    4.7, 1843,
    'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1540420773420-3366772f4999?w=800&q=78&auto=format&fit=crop',
    '0.9 կմ', 41, 'med', 'restaurant',
    33, 32,
    'Ապակյա ճակատով բիստրո՝ գինու փողոցում։ 80 հայկական մակնիշ՝ բաժակով, սոմելյեի ընտրանքներ, միջերկրածովյան կարճ մենյու։',
    ARRAY['18:30','19:00','19:30','20:15','21:00'],
    '750 մ',
    ARRAY['Գինու ընտրանք','Սոմելյե'],
    true
  ),

  -- 5. In Vino
  (
    'in-vino', 'In Vino', 'Գինու բար', 'Սարյանի փող.', '֏֏',
    4.5, 2470,
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551024506-0bccd828d307?w=800&q=78&auto=format&fit=crop',
    '0.9 կմ', 38, 'med', 'bar',
    28, 30,
    'Նկուղային գինու բար — 500+ մակնիշ, մոմավառ անկյուններ, պանրի և չարկուտերիի տախտակներ։',
    ARRAY['19:00','19:30','20:00','20:30','21:00','21:30','22:00'],
    '500 մ',
    ARRAY['Մինչ ուշ','Գինու նկուղ'],
    true
  ),

  -- 6. Kond House
  (
    'kond-house', 'Կոնդ Հաուս', 'Ժամանակակից', 'Կոնդ', '֏֏֏',
    4.6, 612,
    'https://images.unsplash.com/photo-1592861956120-e524fc739696?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800&q=78&auto=format&fit=crop',
    '1.4 կմ', 22, 'med', 'restaurant',
    22, 56,
    'Վերականգնված քարե տուն Կոնդ թաղամասում — վեց սեղան, օրն ընթացքում փոփոխվող սեթ-մենյու, շեֆ Արամը հյուրընկալում է անձամբ։',
    ARRAY['19:00','19:30','20:30'],
    '1,200 մ',
    ARRAY['Հատուկ մենյու','Ինտիմ'],
    true
  ),

  -- 7. Tumanyan Khinkali
  (
    'tumanyan-khinkali', 'Թումանյան Խինկալի', 'Վրացական', 'Թումանյանի փող.', '֏֏',
    4.4, 4912,
    'https://images.unsplash.com/photo-1424847651672-bf20a4b0982b?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551183053-bf91a1d81141?w=800&q=78&auto=format&fit=crop',
    '0.6 կմ', 88, 'high', 'restaurant',
    50, 48,
    'Շոգեխաշած խինկալի, ադջարուլի խաչապուրի, չուրչխելա՝ աղանդերին։ Աղմկոտ, մատչելի, կատարյալ կեսգիշերից հետո։',
    ARRAY['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30','22:00'],
    '300 մ',
    ARRAY['Մինչ ուշ','Ընտանեկան'],
    true
  ),

  -- 8. Anteb
  (
    'anteb', 'Անթեպ', 'Լևանտական', 'Մաշտոցի պող.', '֏֏',
    4.5, 1980,
    'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1544025162-d76694265947?w=800&q=78&auto=format&fit=crop',
    '1.1 կմ', 35, 'med', 'restaurant',
    38, 28,
    'Հալեպից Երևան բերված խոհանոց։ Քարե փռում թխած լավաշ, լահմաջուն, ապխտած սմբուկ, գունագեղ մեզե։',
    ARRAY['18:30','19:00','19:30','20:00','20:30'],
    '600 մ',
    ARRAY['Մեզե','Բուսակեր ընտրանք'],
    true
  ),

  -- 9. Cascade Cafe
  (
    'cascade-cafe', 'Կասկադ սրճարան', 'Իտալական · սրճարան', 'Կասկադ', '֏֏',
    4.3, 1450,
    'https://images.unsplash.com/photo-1559329007-40df8a9345d8?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=800&q=78&auto=format&fit=crop',
    '1.2 կմ', 27, 'med', 'restaurant',
    56, 18,
    'Բաց պատշգամբ Կասկադի քանդակների տակ — փայտով թխած պիցցա, ապերոլ սպրից, մայրամուտի սեղանները շատ արագ լրանում են։',
    ARRAY['18:00','18:30','19:30','20:00','20:30','21:00'],
    '400 մ',
    ARRAY['Պատշգամբ','Ապերիտիվ'],
    true
  ),

  -- 10. Calumet
  (
    'calumet', 'Կալումետ', 'Լաունջ', 'Մաշտոցի պող.', '֏֏',
    4.6, 3100,
    'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=78&auto=format&fit=crop',
    '1.3 կմ', 78, 'high', 'lounge',
    36, 38,
    'Բարձր բարձերով հատակային նստարան, համաշխարհային երաժշտության DJ-եր, քյալյան և հայ–հնդկական–թայլանդական մենյու մինչև 2:00։',
    ARRAY['20:00','20:30','21:00','21:30','22:00','22:30','23:00'],
    '600 մ',
    ARRAY['Քյալյան','DJ','Մինչ ուշ'],
    true
  ),

  -- 11. Theater Bar
  (
    'theater-bar', 'Theater Bar', 'Կոկտեյլ բար', 'Հյուսիսային պող.', '֏֏֏',
    4.8, 870,
    'https://images.unsplash.com/photo-1572116469696-31de0f17cc34?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=78&auto=format&fit=crop',
    '0.6 կմ', 64, 'high', 'bar',
    52, 38,
    'Վարագույրապատ սպիկ-իզի պողոտայում։ Ֆիրմային «Գառնի Սաուր»՝ կոնյակ, սումաք, լավաշի ապխտած սիրոպ։',
    ARRAY['20:30','21:00','21:30','22:00','22:30','23:00','23:30'],
    '700 մ',
    ARRAY['Սպիկ-իզի','Կոկտեյլներ'],
    true
  ),

  -- 12. Pandok Yerevan
  (
    'pandok', 'Պանդոկ Երևան', 'Խորոված · պանդոկ', 'Հանրապետության հր.', '֏֏֏',
    4.5, 6800,
    'https://images.unsplash.com/photo-1565538810643-b5bdb714032a?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=800&q=78&auto=format&fit=crop',
    '0.3 կմ', 142, 'high', 'restaurant',
    50, 64,
    'Եռհարկ պանդոկ Հանրապետության հրապարակի մոտ։ Ամբողջական գառան խորոված, պարուհիներ ուր/շբթ, ստորին հարկում գինու սենյակ։',
    ARRAY['18:00','18:30','19:00','19:30','20:00','20:30','21:00','21:30'],
    '900 մ',
    ARRAY['Ավանդական','Պարուհիներ','Խմբեր'],
    true
  ),

  -- 13. Mirzoyan Library
  (
    'mirzoyan', 'Միրզոյան գրադարան', 'Սրճարան · այգի', 'Մ. Մկրտչյանի փող.', '֏֏',
    4.7, 1340,
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1533089860892-a7c6f0a88666?w=800&q=78&auto=format&fit=crop',
    '0.8 կմ', 19, 'low', 'restaurant',
    44, 24,
    '19-րդ դարի տանը տեղավորված լուսանկարների գրադարան, ետևի բակում՝ սրճարան։ Բրանչ, գրքեր և շատ ուժեղ սուրճ։',
    ARRAY['10:00','11:00','12:00','13:00','14:00','15:00'],
    '300 մ',
    ARRAY['Բրանչ','Այգի','Սուրճ'],
    true
  ),

  -- 14. Aurora Club
  (
    'club-aurora', 'Aurora Club', 'Ակումբ', 'Արդյունաբերական', '֏֏֏',
    4.3, 1100,
    'https://images.unsplash.com/photo-1571266028243-d220c6a83ad9?w=800&q=78&auto=format&fit=crop',
    'https://images.unsplash.com/photo-1551024709-8f23befc6f87?w=800&q=78&auto=format&fit=crop',
    '3.4 կմ', 47, 'med', 'club',
    78, 78,
    'Պահեստային մթնոլորտով ակումբ Կենտրոնի սահմանին։ Հաուս/տեխնո ռեզիդենտներ, սեղանի սպասարկում, դռները բացվում են 23:00-ին։',
    ARRAY['23:00','23:30','00:00','00:30','01:00'],
    '1,500 մ',
    ARRAY['Սեղանի սպասարկ.','Հաուս/Տեխնո'],
    true
  )

ON CONFLICT (id) DO NOTHING;
