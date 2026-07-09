const UNSPLASH_BASE    = 'https://images.unsplash.com/photo-';
const UNSPLASH_QUALITY = 78;
const UNSPLASH_FORMAT  = 'format';
const UNSPLASH_FIT     = 'crop';

const P = (id: string, w = 800) =>
  `${UNSPLASH_BASE}${id}?w=${w}&q=${UNSPLASH_QUALITY}&auto=${UNSPLASH_FORMAT}&fit=${UNSPLASH_FIT}`;

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
