import type { Lang } from '../i18n';
import type { VenueRow, MenuCategoryRow, MenuItemRow, GuideRow } from './database.types';

type Rec = Record<string, unknown>;

function l(obj: Rec, field: string, lang: Lang): string {
  return (
    (obj[`${field}_${lang}`] as string | null | undefined) ||
    (obj[`${field}_hy`]     as string | null | undefined) ||
    (obj[field]             as string | null | undefined) ||
    ''
  );
}

function la(obj: Rec, field: string, lang: Lang): string[] {
  return (
    (obj[`${field}_${lang}`] as string[] | null | undefined) ||
    (obj[`${field}_hy`]     as string[] | null | undefined) ||
    (obj[field]             as string[] | null | undefined) ||
    []
  );
}

export function localizeVenue(v: VenueRow, lang: Lang): VenueRow {
  const r = v as unknown as Rec;
  return {
    ...v,
    name:        l(r, 'name',        lang),
    cuisine:     l(r, 'cuisine',     lang),
    area:        l(r, 'area',        lang),
    description: l(r, 'description', lang),
    perk:        l(r, 'perk',        lang),
    tags:        la(r, 'tags',       lang),
  };
}

export function localizeCategory(c: MenuCategoryRow, lang: Lang): MenuCategoryRow {
  return { ...c, name: l(c as unknown as Rec, 'name', lang) };
}

export function localizeItem(i: MenuItemRow, lang: Lang): MenuItemRow {
  const r = i as unknown as Rec;
  return {
    ...i,
    name:        l(r, 'name',        lang),
    description: l(r, 'description', lang) || null,
    allergens:   la(r, 'allergens',  lang),
  };
}

export function localizeGuide(g: GuideRow, lang: Lang): GuideRow {
  const r = g as unknown as Rec;
  return {
    ...g,
    title:    l(r, 'title',    lang),
    subtitle: l(r, 'subtitle', lang),
    tag:      l(r, 'tag',      lang),
  };
}
