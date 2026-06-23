import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { HomeSectionRow, HomeSectionItemRow, VenueRow, GuideRow } from '../lib/database.types';
import { useStore } from '../store';
import { fetchTodayBookingCounts } from '../lib/api';

export type HomeSectionItem = HomeSectionItemRow & {
  venue: VenueRow | null;
  guide: GuideRow | null;
};

export type HomeSection = HomeSectionRow & {
  name: string;
  eyebrow: string;
  home_section_items: HomeSectionItem[];
};

export function useHomeSections() {
  const [sections, setSections] = useState<HomeSection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { language } = useStore();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      // Step 1: fetch sections + items with venue embed only (no guide FK exists)
      const { data: sectionsData, error: sectionsErr } = await (supabase as any)
        .from('home_sections')
        .select(`
          *,
          home_section_items (
            *,
            venue:venues ( * )
          )
        `)
        .eq('is_active', true)
        .order('sort_order', { ascending: true });

      if (sectionsErr) throw new Error(sectionsErr.message);

      const raw = (sectionsData ?? []) as any[];

      // Step 2: collect all guide_ids across all sections
      const guideIds: string[] = [];
      for (const s of raw) {
        for (const item of s.home_section_items ?? []) {
          if (item.item_type === 'guide' && item.guide_id) {
            guideIds.push(item.guide_id);
          }
        }
      }

      // Step 3: fetch guides + today's booking counts in parallel
      const guideMap = new Map<string, GuideRow>();
      const [, bookingCounts] = await Promise.all([
        guideIds.length > 0
          ? (supabase as any)
              .from('guides')
              .select('*')
              .in('id', [...new Set(guideIds)])
              .then(({ data: guidesData }: any) => {
                for (const g of guidesData ?? []) guideMap.set(g.id, g as GuideRow);
              })
          : Promise.resolve(),
        fetchTodayBookingCounts().catch(() => ({} as Record<string, number>)),
      ]);

      // Step 4: merge + localise
      const mapped: HomeSection[] = raw.map((s) => {
        const localName =
          (language === 'hy' ? s.name_hy : language === 'ru' ? s.name_ru : s.name_en) ??
          s.name_hy ??
          s.name;
        const localEyebrow =
          (language === 'hy' ? s.eyebrow_hy : language === 'ru' ? s.eyebrow_ru : s.eyebrow_en) ??
          s.eyebrow_hy ??
          s.eyebrow ??
          '';

        const items: HomeSectionItem[] = [...(s.home_section_items ?? [])]
          .sort((a: any, b: any) => a.sort_order - b.sort_order)
          .map((item: any) => {
            const venue = item.venue ?? null;
            return {
              ...item,
              venue: venue
                ? { ...venue, booked_today: bookingCounts[venue.id] ?? venue.booked_today }
                : null,
              guide: item.guide_id ? (guideMap.get(item.guide_id) ?? null) : null,
            };
          });

        return { ...s, name: localName, eyebrow: localEyebrow, home_section_items: items };
      });

      return mapped;
    }

    load()
      .then((mapped) => { if (!cancelled) { setSections(mapped); setLoading(false); } })
      .catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });

    return () => { cancelled = true; };
  }, [attempt, language]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { sections, loading, error, retry };
}
