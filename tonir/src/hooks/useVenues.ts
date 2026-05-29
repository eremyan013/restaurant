import { useState, useEffect, useCallback } from 'react';
import { fetchVenues, fetchVenueById } from '../lib/api';
import { VenueRow } from '../lib/database.types';

export function useVenues() {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetchVenues()
      .then(setVenues)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { venues, loading, error, retry };
}

export function useVenue(id: string) {
  const [venue, setVenue] = useState<VenueRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    setError(null);
    fetchVenueById(id)
      .then(setVenue)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return { venue, loading, error, retry };
}
