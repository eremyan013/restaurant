import { useEffect, useCallback } from 'react';
import { Platform, Alert } from 'react-native';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { useTranslation } from './useTranslation';

export function useWaitlist() {
  const { waitlistVenueIds, setWaitlistVenueIds, userId } = useStore();
  const { tr } = useTranslation();

  // Load waitlist from DB when user is known
  useEffect(() => {
    if (!userId) return;
    supabase
      .from('waitlist_entries')
      .select('venue_id')
      .eq('user_id', userId)
      .is('notified_at', null)
      .then(({ data }) => {
        if (data) {
          setWaitlistVenueIds(new Set(data.map((row) => row.venue_id)));
        }
      });
  }, [userId]);

  const toggleWaitlist = useCallback(
    async (venueId: string) => {
      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

      // Capture current state before optimistic update
      const wasOnWaitlist = waitlistVenueIds.has(venueId);

      // Optimistic update — immediately visible across all screens
      const next = new Set(waitlistVenueIds);
      if (wasOnWaitlist) next.delete(venueId);
      else next.add(venueId);
      setWaitlistVenueIds(next);

      // Sync to DB — roll back optimistic update on failure
      if (!userId) return;
      try {
        if (wasOnWaitlist) {
          const { error } = await supabase
            .from('waitlist_entries')
            .delete()
            .eq('user_id', userId)
            .eq('venue_id', venueId);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('waitlist_entries')
            .insert({ user_id: userId, venue_id: venueId });
          if (error) throw error;
        }
      } catch {
        setWaitlistVenueIds(new Set(waitlistVenueIds));
        Alert.alert('', tr(wasOnWaitlist ? 'waitlist_err_remove' : 'waitlist_err_add'));
      }
    },
    [userId, waitlistVenueIds, setWaitlistVenueIds]
  );

  return { waitlist: waitlistVenueIds, toggleWaitlist };
}
