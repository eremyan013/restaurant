import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { VenueRow } from '../lib/database.types';
import { useStore } from '../store';
import { localizeVenue } from '../lib/localize';
import { fetchTodayBookingCounts } from '../lib/api';

export function useCategoryVenues(sectionId: string) {
  const [raw, setRaw] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { language, selectedLocationId } = useStore();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);

    async function load() {
      const { data, error: err } = await (supabase as any)
        .from('home_section_items')
        .select('venue:venues(*)')
        .eq('section_id', sectionId)
        .eq('item_type', 'venue')
        .not('venue_id', 'is', null);

      if (err) throw new Error(err.message);

      const counts = await fetchTodayBookingCounts().catch(() => null);

      let venues: VenueRow[] = (data ?? [])
        .map((item: any) => item.venue)
        .filter(Boolean)
        .filter((v: VenueRow) => !selectedLocationId || v.location_id === selectedLocationId)
        .map((v: VenueRow) => ({
          ...v,
          booked_today: counts !== null ? (counts[v.id] ?? 0) : v.booked_today,
        }))
        .sort((a: VenueRow, b: VenueRow) => b.rating - a.rating);

      if (!cancelled) {
        setRaw(venues);
        setLoading(false);
      }
    }

    load().catch((e) => { if (!cancelled) { setError(e.message); setLoading(false); } });
    return () => { cancelled = true; };
  }, [sectionId, selectedLocationId, attempt]);

  const venues = raw.map(v => localizeVenue(v, language));
  const retry = useCallback(() => setAttempt(n => n + 1), []);

  return { venues, loading, error, retry };
}
