import { useState, useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { fetchFavorites, addFavorite, removeFavorite } from '../lib/api';
import { useStore } from '../store';
import { useTranslation } from './useTranslation';

export function useFavorites() {
  const { favs, setFavs, userId } = useStore();
  const { tr } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Load favorites from DB when user is known
  useEffect(() => {
    if (!userId) return;
    setLoading(true);
    fetchFavorites(userId)
      .then((ids) => setFavs(new Set(ids)))
      .finally(() => setLoading(false));
  }, [userId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  const toggleFav = useCallback(
    async (venueId: string) => {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Capture current state before optimistic update
      const wasFav = favs.has(venueId);

      // Optimistic update — immediately visible across all screens
      const next = new Set(favs);
      if (wasFav) next.delete(venueId);
      else next.add(venueId);
      setFavs(next);

      // Sync to DB — roll back optimistic update on failure
      if (!userId) return;
      try {
        if (wasFav) {
          await removeFavorite(userId, venueId);
        } else {
          await addFavorite(userId, venueId);
        }
      } catch {
        setFavs(new Set(favs));
        Alert.alert(tr('err_title'), tr('err_sub'));
      }
    },
    [userId, favs, setFavs]
  );

  return { favs, loading, toggleFav, retry };
}
