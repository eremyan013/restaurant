import { useState, useEffect, useCallback, useMemo } from 'react';
import { fetchVenues, fetchVenueById, fetchTodayBookingCounts } from '../lib/api';
import { VenueRow } from '../lib/database.types';
import { useStore } from '../store';
import { localizeVenue } from '../lib/localize';

export function useVenues() {
  const [raw, setRaw] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { language } = useStore();

  useEffect(() => {
    setLoading(true);
    setError(null);
    Promise.all([fetchVenues(), fetchTodayBookingCounts().catch(() => null)])
      .then(([venues, counts]) => {
        setRaw(venues.map(v => ({
          ...v,
          booked_today: counts !== null ? (counts[v.id] ?? 0) : v.booked_today,
        })));
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [attempt]);

  const venues = useMemo(() => raw.map(v => localizeVenue(v, language)), [raw, language]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { venues, loading, error, retry };
}

export function useVenue(id: string) {
  const [raw, setRaw] = useState<VenueRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const { language } = useStore();

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchVenueById(id)
      .then(setRaw)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, attempt]);

  const venue = useMemo(() => raw ? localizeVenue(raw, language) : null, [raw, language]);
  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { venue, loading, error, retry };
}
