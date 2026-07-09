import { useState, useEffect, useCallback, useRef } from 'react';
import { fetchProfile } from '../lib/api';
import { ProfileRow } from '../lib/database.types';
import { useStore } from '../store';
import { supabase } from '../lib/supabase';

export function useProfile() {
  const { userId } = useStore();
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    fetchProfile(userId).then((p) => {
      setProfile(p);
      setLoading(false);
    });
  }, [userId]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep a stable ref so the subscription callback always calls the latest load
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  // Auto-refresh when admin credits YEL or updates tier
  useEffect(() => {
    if (!userId) return;
    const channel = (supabase as any)
      .channel(`profile_updates:${userId}`)
      .on('postgres_changes', {
        event: 'UPDATE',
        schema: 'public',
        table: 'profiles',
        filter: `id=eq.${userId}`,
      }, () => { loadRef.current(); })
      .subscribe();
    return () => { (supabase as any).removeChannel(channel); };
  }, [userId]); // only re-subscribe when user changes, not on every load re-creation

  return { profile, loading, refetch: load };
}
