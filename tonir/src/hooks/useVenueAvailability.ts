import { useState, useEffect, useCallback } from 'react';
import { fetchVenueAvailability } from '../lib/api';
import type { VenueHoursRow, VenueBlockedDateRow } from '../lib/database.types';

export type VenueAvailability = {
  hoursMap: Record<number, VenueHoursRow>;
  blockedDates: Set<string>;
  loading: boolean;
};

export function useVenueAvailability(venueId: string): VenueAvailability {
  const [hoursMap, setHoursMap] = useState<Record<number, VenueHoursRow>>({});
  const [blockedDates, setBlockedDates] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!venueId) return;
    setLoading(true);
    fetchVenueAvailability(venueId)
      .then(({ hours, blockedDates: bd }) => {
        const map: Record<number, VenueHoursRow> = {};
        for (const h of hours) map[h.day_of_week] = h;
        setHoursMap(map);
        setBlockedDates(new Set(bd.map(d => d.date)));
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  return { hoursMap, blockedDates, loading };
}

/** Returns true if the given ISO date string is available for booking. */
export function isDateAvailable(
  isoDate: string,
  dayOfWeek: number,
  hoursMap: Record<number, VenueHoursRow>,
  blockedDates: Set<string>,
): boolean {
  if (blockedDates.has(isoDate)) return false;
  const h = hoursMap[dayOfWeek];
  if (!h) return true; // no hours set → all days available (backwards-compatible)
  return h.is_open;
}

/** Filters a venue's time slots to those within the opening window for the given day. */
export function filterAvailableTimes(
  times: string[],
  dayOfWeek: number,
  hoursMap: Record<number, VenueHoursRow>,
): string[] {
  const h = hoursMap[dayOfWeek];
  if (!h || !h.is_open || !h.open_time || !h.close_time) return times;
  return times.filter(t => t >= h.open_time! && t <= h.close_time!);
}
