import { useState, useEffect, useCallback } from 'react';
import { fetchReservations, createReservation, cancelReservation } from '../lib/api';
import { ReservationRow } from '../lib/database.types';
import { useStore } from '../store';

export function useReservations() {
  const { userId, setUpcomingCount } = useStore();
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    fetchReservations(userId)
      .then(setReservations)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const upcoming = reservations.filter(
    (r) => r.status === 'confirmed' || r.status === 'pending'
  );
  const past = reservations.filter((r) => r.status === 'visited' || r.status === 'cancelled');

  // Keep the global badge count in sync
  useEffect(() => {
    setUpcomingCount(upcoming.length);
  }, [upcoming.length, setUpcomingCount]);

  const book = useCallback(
    async (data: Omit<ReservationRow, 'id' | 'created_at' | 'user_id'>) => {
      if (!userId) throw new Error('Not logged in');
      const res = await createReservation({ ...data, user_id: userId });
      setReservations((prev) => [res, ...prev]);
      return res;
    },
    [userId]
  );

  const cancel = useCallback(async (id: string) => {
    await cancelReservation(id);
    setReservations((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: 'cancelled' } : r))
    );
  }, []);

  return { reservations, upcoming, past, loading, error, retry, book, cancel };
}
