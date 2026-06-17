import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import type { HomeSectionRow, HomeSectionItemRow, VenueRow, GuideRow } from '../lib/database.types';
import { useStore } from '../store';

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

    // Cast to any to escape Supabase TS generic inference issues with nested selects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (supabase as any)
      .from('home_sections')
      .select(`
        *,
        home_section_items (
          *,
          venue:venues ( * ),
          guide:guides ( * )
        )
      `)
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .order('sort_order', { ascending: true, referencedTable: 'home_section_items' })
      .then(({ data, error: err }: { data: any[] | null; error: { message: string } | null }) => {
        if (cancelled) return;
        if (err) {
          setError(err.message);
          setLoading(false);
          return;
        }
        const raw = (data ?? []) as any[];
        const mapped: HomeSection[] = raw.map((s) => {
          // Resolve localised name — fall back through locale chain to base name
          const localName =
            (language === 'hy' ? s.name_hy : language === 'ru' ? s.name_ru : s.name_en) ??
            s.name_hy ??
            s.name;
          // Resolve localised eyebrow — same fallback chain
          const localEyebrow =
            (language === 'hy' ? s.eyebrow_hy : language === 'ru' ? s.eyebrow_ru : s.eyebrow_en) ??
            s.eyebrow_hy ??
            s.eyebrow ??
            '';
          return {
            ...s,
            name: localName,
            eyebrow: localEyebrow,
            home_section_items: (s.home_section_items ?? []) as HomeSectionItem[],
          };
        });
        setSections(mapped);
        setLoading(false);
      });

    return () => { cancelled = true; };
  }, [attempt, language]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { sections, loading, error, retry };
}
