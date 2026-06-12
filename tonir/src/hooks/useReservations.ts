import { useState, useEffect, useCallback } from 'react';
import { fetchReservations, createReservation, cancelReservation, CreateReservationPayload, CreateReservationResult } from '../lib/api';
import { ReservationRow } from '../lib/database.types';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';

export function useReservations() {
  const { userId, setUpcomingCount } = useStore();
  const [reservations, setReservations] = useState<ReservationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  // Initial fetch
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

  // Realtime: keep reservations in sync when admin changes status
  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`reservations:${userId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'reservations',
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          if (payload.eventType === 'UPDATE') {
            setReservations((prev) =>
              prev.map((r) => (r.id === (payload.new as ReservationRow).id ? (payload.new as ReservationRow) : r))
            );
          } else if (payload.eventType === 'INSERT') {
            setReservations((prev) => [payload.new as ReservationRow, ...prev]);
          } else if (payload.eventType === 'DELETE') {
            setReservations((prev) => prev.filter((r) => r.id !== (payload.old as ReservationRow).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

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
    async (data: Omit<ReservationRow, 'id' | 'created_at' | 'updated_at' | 'user_id'>): Promise<void> => {
      if (!userId) throw new Error('Not logged in');
      const payload: CreateReservationPayload = { ...data, user_id: userId };
      const result = await createReservation(payload);
      if (result.error) {
        throw new Error(result.error);
      }
      // The realtime subscription (lines 29-58) will push the inserted row into state.
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
