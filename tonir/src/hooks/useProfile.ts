import { useState, useEffect, useCallback } from 'react';
import { fetchProfile } from '../lib/api';
import { ProfileRow } from '../lib/database.types';
import { useStore } from '../store';

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

  return { profile, loading, refetch: load };
}
