// Tonir data layer — venues, guides, mock user

const P = (id: string, w = 800) =>
  `https://images.unsplash.com/photo-${id}?w=${w}&q=78&auto=format&fit=crop`;

export const PHOTOS = {
  steak:       P('1414235077428-338989a2e8c0'),
  pasta:       P('1551183053-bf91a1d81141'),
  bowl:        P('1546069901-ba9599a7e63c'),
  burger:      P('1568901346375-23c9450c58cd'),
  pizza:       P('1565299624946-b28f40a0ae38'),
  salad:       P('1540420773420-3366772f4999'),
  fish:        P('1535140728325-a4d3707eee94'),
  dessert:     P('1551024506-0bccd828d307'),
  brunch:      P('1533089860892-a7c6f0a88666'),
  mezze:       P('1544025162-d76694265947'),
  diningWarm:  P('1517248135467-4c7edcad34c4'),
  diningPatio: P('1559329007-40df8a9345d8'),
  diningCozy:  P('1592861956120-e524fc739696'),
  diningTable: P('1424847651672-bf20a4b0982b'),
  diningChic:  P('1559339352-11d035aa65de'),
  diningArmen: P('1565538810643-b5bdb714032a'),
  barNeon:     P('1514933651103-005eec06c04b'),
  cocktails:   P('1551024709-8f23befc6f87'),
  wineBar:     P('1510812431401-41d2bd2722f3'),
  jazzLounge:  P('1470337458703-46ad1756a187'),
  rooftop:     P('1572116469696-31de0f17cc34'),
  club:        P('1571266028243-d220c6a83ad9'),
  av1: P('1535713875002-d1d0cf377fde', 120),
  av2: P('1494790108377-be9c29b29330', 120),
  av3: P('1500648767791-00dcc994a43e', 120),
  av4: P('1438761681033-6461ffad8d80', 120),
  av5: P('1531123897727-8f129e1688ce', 120),
};

export type HeatLevel = 'high' | 'med' | 'low';
export type VenueKind = 'restaurant' | 'bar' | 'lounge' | 'club';

export interface Venue {
  id: string;
  name: string;
  cuisine: string;
  area: string;
  price: string;
  rating: number;
  reviews: number;
  photo: string;
  dish: string;
  distance: string;
  bookedToday: number;
  heat: HeatLevel;
  kind: VenueKind;
  coords: { x: number; y: number };
  description: string;
  times: string[];
  perk: string;
  tags: string[];
}

export const VENUES: Venue[] = [
  {
    id: 'dolmama', name: 'Դոլմամա', cuisine: 'Հայկական · ավանդական', area: 'Պուշկինի փող.', price: '֏֏֏֏',
    rating: 4.8, reviews: 2134, photo: PHOTOS.diningArmen, dish: PHOTOS.mezze,
    distance: '0.4 կմ', bookedToday: 49, heat: 'high', kind: 'restaurant',
    coords: { x: 48, y: 42 },
    description: '1950-ականների ընտանեկան տուն՝ վերածված մոմավառ ճաշասենյակի։ Գառան խորոված որթատի ճյուղերի վրա, ընկույզով տոլմա և 200 հայկական գինիների ցուցակ։',
    times: ['18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
    perk: '1,000 մ',
    tags: ['Ավանդական', 'Գինու քարտ', 'Բակ'],
  },
  {
    id: 'sherep', name: 'Շերեփ', cuisine: 'Ժամանակակից հայկական', area: 'Սարյանի փող.', price: '֏֏֏',
    rating: 4.7, reviews: 3220, photo: PHOTOS.diningChic, dish: PHOTOS.steak,
    distance: '0.7 կմ', bookedToday: 74, heat: 'high', kind: 'restaurant',
    coords: { x: 30, y: 35 },
    description: 'Բաց խոհանոցով՝ ավանդական հայկական ճաշատեսակների վերանայում։ Սերկևիլով ղափամա, իշխանի թարթար, ապակյա տոնիրի վրա թխվող լավաշ։',
    times: ['18:30', '19:00', '19:30', '20:00', '20:45'],
    perk: '800 մ',
    tags: ['Բաց խոհանոց', 'Հատուկ մենյու'],
  },
  {
    id: 'lavash', name: 'Լավաշ', cuisine: 'Պանդոկ · խորոված', area: 'Թումանյանի փող.', price: '֏֏',
    rating: 4.6, reviews: 5891, photo: PHOTOS.diningWarm, dish: PHOTOS.fish,
    distance: '0.5 կմ', bookedToday: 132, heat: 'high', kind: 'restaurant',
    coords: { x: 42, y: 50 },
    description: 'Պանդոկային ճաշեր՝ խոզի և գառան խորոված, քյաբաբ ածուխի վրա, սմբուկի խավիար։ Դուդուկի կենդանի կատարում հնգ–շբթ։',
    times: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'],
    perk: '500 մ',
    tags: ['Կենդանի երաժշտություն', 'Խմբերի համար'],
  },
  {
    id: 'wine-republic', name: 'Wine Republic', cuisine: 'Գինու բար · բիստրո', area: 'Սարյանի փող.', price: '֏֏֏',
    rating: 4.7, reviews: 1843, photo: PHOTOS.wineBar, dish: PHOTOS.salad,
    distance: '0.9 կմ', bookedToday: 41, heat: 'med', kind: 'restaurant',
    coords: { x: 33, y: 32 },
    description: 'Ապակյա ճակատով բիստրո՝ գինու փողոցում։ 80 հայկական մակնիշ՝ բաժակով, սոմելյեի ընտրանքներ, միջերկրածովյան կարճ մենյու։',
    times: ['18:30', '19:00', '19:30', '20:15', '21:00'],
    perk: '750 մ',
    tags: ['Գինու ընտրանք', 'Սոմելյե'],
  },
  {
    id: 'in-vino', name: 'In Vino', cuisine: 'Գինու բար', area: 'Սարյանի փող.', price: '֏֏',
    rating: 4.5, reviews: 2470, photo: PHOTOS.cocktails, dish: PHOTOS.dessert,
    distance: '0.9 կմ', bookedToday: 38, heat: 'med', kind: 'bar',
    coords: { x: 28, y: 30 },
    description: 'Նկուղային գինու բար — 500+ մակնիշ, մոմավառ անկյուններ, պանրի և չարկուտերիի տախտակներ։',
    times: ['19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
    perk: '500 մ',
    tags: ['Մինչ ուշ', 'Գինու նկուղ'],
  },
  {
    id: 'kond-house', name: 'Կոնդ Հաուս', cuisine: 'Ժամանակակից', area: 'Կոնդ', price: '֏֏֏',
    rating: 4.6, reviews: 612, photo: PHOTOS.diningCozy, dish: PHOTOS.bowl,
    distance: '1.4 կմ', bookedToday: 22, heat: 'med', kind: 'restaurant',
    coords: { x: 22, y: 56 },
    description: 'Վերականգնված քարե տուն Կոնդ թաղամասում — վեց սեղան, օրն ընթացքում փոփոխվող սեթ-մենյու, շեֆ Արամը հյուրընկալում է անձամբ։',
    times: ['19:00', '19:30', '20:30'],
    perk: '1,200 մ',
    tags: ['Հատուկ մենյու', 'Ինտիմ'],
  },
  {
    id: 'tumanyan-khinkali', name: 'Թումանյան Խինկալի', cuisine: 'Վրացական', area: 'Թումանյանի փող.', price: '֏֏',
    rating: 4.4, reviews: 4912, photo: PHOTOS.diningTable, dish: PHOTOS.pasta,
    distance: '0.6 կմ', bookedToday: 88, heat: 'high', kind: 'restaurant',
    coords: { x: 50, y: 48 },
    description: 'Շոգեխաշած խինկալի, ադջարուլի խաչապուրի, չուրչխելա՝ աղանդերին։ Աղմկոտ, մատչելի, կատարյալ կեսգիշերից հետո։',
    times: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30', '22:00'],
    perk: '300 մ',
    tags: ['Մինչ ուշ', 'Ընտանեկան'],
  },
  {
    id: 'anteb', name: 'Անթեպ', cuisine: 'Լևանտական', area: 'Մաշտոցի պող.', price: '֏֏',
    rating: 4.5, reviews: 1980, photo: PHOTOS.diningPatio, dish: PHOTOS.mezze,
    distance: '1.1 կմ', bookedToday: 35, heat: 'med', kind: 'restaurant',
    coords: { x: 38, y: 28 },
    description: 'Հալեպից Երևան բերված խոհանոց։ Քարե փռում թխած լավաշ, լահմաջուն, ապխտած սմբուկ, գունագեղ մեզե։',
    times: ['18:30', '19:00', '19:30', '20:00', '20:30'],
    perk: '600 մ',
    tags: ['Մեզե', 'Բուսակեր ընտրանք'],
  },
  {
    id: 'cascade-cafe', name: 'Կասկադ սրճարան', cuisine: 'Իտալական · սրճարան', area: 'Կասկադ', price: '֏֏',
    rating: 4.3, reviews: 1450, photo: PHOTOS.diningPatio, dish: PHOTOS.pizza,
    distance: '1.2 կմ', bookedToday: 27, heat: 'med', kind: 'restaurant',
    coords: { x: 56, y: 18 },
    description: 'Բաց պատշգամբ Կասկադի քանդակների տակ — փայտով թխած պիցցա, ապերոլ սպրից, մայրամուտի սեղանները շատ արագ լրանում են։',
    times: ['18:00', '18:30', '19:30', '20:00', '20:30', '21:00'],
    perk: '400 մ',
    tags: ['Պատշգամբ', 'Ապերիտիվ'],
  },
  {
    id: 'calumet', name: 'Կալումետ', cuisine: 'Լաունջ', area: 'Մաշտոցի պող.', price: '֏֏',
    rating: 4.6, reviews: 3100, photo: PHOTOS.jazzLounge, dish: PHOTOS.cocktails,
    distance: '1.3 կմ', bookedToday: 78, heat: 'high', kind: 'lounge',
    coords: { x: 36, y: 38 },
    description: 'Բարձր բարձերով հատակային նստարան, համաշխարհային երաժշտության DJ-եր, քյալյան և հայ–հնդկական–թայլանդական մենյու մինչև 2:00։',
    times: ['20:00', '20:30', '21:00', '21:30', '22:00', '22:30', '23:00'],
    perk: '600 մ',
    tags: ['Քյալյան', 'DJ', 'Մինչ ուշ'],
  },
  {
    id: 'theater-bar', name: 'Theater Bar', cuisine: 'Կոկտեյլ բար', area: 'Հյուսիսային պող.', price: '֏֏֏',
    rating: 4.8, reviews: 870, photo: PHOTOS.rooftop, dish: PHOTOS.cocktails,
    distance: '0.6 կմ', bookedToday: 64, heat: 'high', kind: 'bar',
    coords: { x: 52, y: 38 },
    description: 'Վարագույրապատ սպիկ-իզի պողոտայում։ Ֆիրմային «Գառնի Սաուր»՝ կոնյակ, սումաք, լավաշի ապխտած սիրոպ։',
    times: ['20:30', '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'],
    perk: '700 մ',
    tags: ['Սպիկ-իզի', 'Կոկտեյլներ'],
  },
  {
    id: 'pandok', name: 'Պանդոկ Երևան', cuisine: 'Խորոված · պանդոկ', area: 'Հանրապետության հր.', price: '֏֏֏',
    rating: 4.5, reviews: 6800, photo: PHOTOS.diningArmen, dish: PHOTOS.steak,
    distance: '0.3 կմ', bookedToday: 142, heat: 'high', kind: 'restaurant',
    coords: { x: 50, y: 64 },
    description: 'Եռհարկ պանդոկ Հանրապետության հրապարակի մոտ։ Ամբողջական գառան խորոված, պարուհիներ ուր/շբթ, ստորին հարկում գինու սենյակ։',
    times: ['18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00', '21:30'],
    perk: '900 մ',
    tags: ['Ավանդական', 'Պարուհիներ', 'Խմբեր'],
  },
  {
    id: 'mirzoyan', name: 'Միրզոյան գրադարան', cuisine: 'Սրճարան · այգի', area: 'Մ. Մկրտչյանի փող.', price: '֏֏',
    rating: 4.7, reviews: 1340, photo: PHOTOS.brunch, dish: PHOTOS.brunch,
    distance: '0.8 կմ', bookedToday: 19, heat: 'low', kind: 'restaurant',
    coords: { x: 44, y: 24 },
    description: '19-րդ դարի տանը տեղավորված լուսանկարների գրադարան, ետևի բակում՝ սրճարան։ Բրանչ, գրքեր և շատ ուժեղ սուրճ։',
    times: ['10:00', '11:00', '12:00', '13:00', '14:00', '15:00'],
    perk: '300 մ',
    tags: ['Բրանչ', 'Այգի', 'Սուրճ'],
  },
  {
    id: 'club-aurora', name: 'Aurora Club', cuisine: 'Ակումբ', area: 'Արդյունաբերական', price: '֏֏֏',
    rating: 4.3, reviews: 1100, photo: PHOTOS.club, dish: PHOTOS.cocktails,
    distance: '3.4 կմ', bookedToday: 47, heat: 'med', kind: 'club',
    coords: { x: 78, y: 78 },
    description: 'Պահեստային մթնոլորտով ակումբ Կենտրոնի սահմանին։ Հաուս/տեխնո ռեզիդենտներ, սեղանի սպասարկում, դռները բացվում են 23:00-ին։',
    times: ['23:00', '23:30', '00:00', '00:30', '01:00'],
    perk: '1,500 մ',
    tags: ['Սեղանի սպասարկ.', 'Հաուս/Տեխնո'],
  },
];

export interface Guide {
  id: string;
  title: string;
  subtitle: string;
  count: number;
  cover: string;
  tag: string;
}

export const GUIDES: Guide[] = [
  { id: 'top50',    title: 'Երևանի լավագույն 50-ը',  subtitle: 'Tonir ուղեցույց · 2026',       count: 50, cover: PHOTOS.diningChic,  tag: 'Խմբ. ընտրությունը' },
  { id: 'wine',     title: 'Սարյան փող. գինու երթ',   subtitle: '12 բար · մեկ երեկո',          count: 12, cover: PHOTOS.wineBar,     tag: 'Երթուղի' },
  { id: 'khorovats',title: 'Լավագույն խորոված',        subtitle: 'Որտեղ են գնում տեղացիները',   count: 18, cover: PHOTOS.steak,       tag: 'Տեղական' },
  { id: 'patio',    title: 'Կասկադի պատշգամբներ',     subtitle: 'Մայրամուտի սեզոնը բացված է',  count: 14, cover: PHOTOS.diningPatio, tag: 'Սեզոնային' },
  { id: 'late',     title: 'Կեսգիշերից հետո',          subtitle: 'Խոհանոցները դեռ բաց են',      count: 22, cover: PHOTOS.jazzLounge,  tag: 'Մինչ ուշ' },
  { id: 'date',     title: 'Ռոմանտիկ երեկո',           subtitle: 'Ինտիմ և մոմավառ',             count: 16, cover: PHOTOS.diningCozy,  tag: 'Ռոմանտիկ' },
];

export const MOCK_USER = {
  name: 'Անի Պետրոսյան',
  email: 'ani@example.am',
  tier: 'ԱՐԵՆԻ',
  tierLevel: 3,
  yelPoints: 2450,
  yelProgress: 0.82,
  totalVisits: 14,
  avatarUrl: PHOTOS.av2,
};

export const MOCK_RESERVATIONS = [
  {
    id: 'r1', venueId: 'dolmama', status: 'confirmed' as const,
    date: '25 Մայ, Կիրակի', time: '19:30', people: 2,
    perk: '+1,000 մ', friendAvatars: [] as string[],
  },
  {
    id: 'r2', venueId: 'sherep', status: 'pending' as const,
    date: '28 Մայ, Չորեքշաբ', time: '20:00', people: 4,
    perk: '+800 մ', friendAvatars: [PHOTOS.av1, PHOTOS.av3],
  },
  {
    id: 'r3', venueId: 'theater-bar', status: 'upcoming' as const,
    date: '2 Հուն, Կիրակի', time: '21:30', people: 3,
    perk: '+700 մ', friendAvatars: [PHOTOS.av4],
  },
];

export const MOCK_PAST_RESERVATIONS = [
  {
    id: 'p1', venueId: 'lavash', status: 'visited' as const,
    date: '10 Մայ, Ուրբ', time: '19:00', people: 2,
    perk: '+500 մ', friendAvatars: [] as string[],
  },
  {
    id: 'p2', venueId: 'pandok', status: 'visited' as const,
    date: '5 Մայ, Կիրակի', time: '20:00', people: 6,
    perk: '+900 մ', friendAvatars: [PHOTOS.av1, PHOTOS.av2, PHOTOS.av3],
  },
  {
    id: 'p3', venueId: 'wine-republic', status: 'visited' as const,
    date: '28 Ապ, Կիրակի', time: '19:30', people: 2,
    perk: '+750 մ', friendAvatars: [] as string[],
  },
];

export const CONCIERGE_INITIAL = [
  {
    id: 'm1', role: 'concierge' as const,
    text: 'Բարև, ես Tonir Կոնսիերժն եմ։ Ռեստորան ընտրե՞լ, ամրագրե՞լ կամ հաշիվ բաժանե՞լ — ասեք, կօգնեմ։',
    suggestions: ['dolmama', 'sherep', 'theater-bar'],
  },
];
