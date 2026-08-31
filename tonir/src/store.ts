import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Palette, makeTheme, Theme } from './theme';
import { Lang } from './i18n';

interface AppState {
  // Theme
  palette: Palette;
  dark: boolean;
  theme: Theme;
  setPalette: (p: Palette) => void;
  setDark: (d: boolean) => void;

  // Auth
  userId: string | null;
  setUserId: (id: string | null) => void;

  // Booking draft
  booking: BookingDraft | null;
  setBooking: (b: BookingDraft) => void;

  // Upcoming reservation badge count (not persisted)
  upcomingCount: number;
  setUpcomingCount: (n: number) => void;

  // Friend request badge count (not persisted)
  friendRequestCount: number;
  setFriendRequestCount: (n: number) => void;

  // Language
  language: Lang;
  setLanguage: (l: Lang) => void;

  // Favorites (shared across all screens, not persisted)
  favs: Set<string>;
  setFavs: (favs: Set<string>) => void;

  // Waitlist venue IDs (not persisted)
  waitlistVenueIds: Set<string>;
  setWaitlistVenueIds: (ids: Set<string>) => void;

  // Selected location (persisted)
  selectedLocationId: string | null;
  setSelectedLocationId: (id: string | null) => void;

  // Tier-up detection (persisted — compare against live profile.tier_level)
  lastKnownTierLevel: number;
  setLastKnownTierLevel: (level: number) => void;

  // Phone verification gate — true while new user hasn't verified their phone yet
  pendingPhoneVerification: boolean;
  setPendingPhoneVerification: (v: boolean) => void;

  // Session gate — null = still checking on launch, true = logged in, false = logged out
  sessionChecked: boolean;
  setSessionChecked: (v: boolean) => void;

  // Incremented on sign-out to force AppNavigator to fully remount
  appResetKey: number;
  bumpAppResetKey: () => void;
}

export interface BookingDraft {
  venueId: string;
  people: number;
  date: string;
  dateIso: string;
  time: string;
  occasion: string | null;
  splitWith: string[];
  note: string;
  yelEarned: string;
}

export const useStore = create<AppState>()(
  persist(
    (set) => ({
      palette: 'green' as Palette,
      dark: false,
      theme: makeTheme('green', false),
      setPalette: (palette) =>
        set((s) => ({ palette, theme: makeTheme(palette, s.dark) })),
      setDark: (dark) =>
        set((s) => ({ dark, theme: makeTheme(s.palette, dark) })),

      userId: null,
      setUserId: (userId) => set({ userId }),

      booking: null,
      setBooking: (booking) => set({ booking }),

      upcomingCount: 0,
      setUpcomingCount: (upcomingCount) => set({ upcomingCount }),

      friendRequestCount: 0,
      setFriendRequestCount: (friendRequestCount) => set({ friendRequestCount }),

      language: 'hy' as Lang,
      setLanguage: (language) => set({ language }),

      favs: new Set<string>(),
      setFavs: (favs) => set({ favs }),

      waitlistVenueIds: new Set<string>(),
      setWaitlistVenueIds: (waitlistVenueIds) => set({ waitlistVenueIds }),

      selectedLocationId: null,
      setSelectedLocationId: (selectedLocationId) => set({ selectedLocationId }),

      lastKnownTierLevel: 1,
      setLastKnownTierLevel: (lastKnownTierLevel) => set({ lastKnownTierLevel }),

      pendingPhoneVerification: false,
      setPendingPhoneVerification: (pendingPhoneVerification) => set({ pendingPhoneVerification }),

      sessionChecked: false,
      setSessionChecked: (sessionChecked) => set({ sessionChecked }),

      appResetKey: 0,
      bumpAppResetKey: () => set((s) => ({ appResetKey: s.appResetKey + 1, sessionChecked: false, userId: null })),
    }),
    {
      name: 'tonir-prefs',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({ palette: state.palette, dark: state.dark, language: state.language, lastKnownTierLevel: state.lastKnownTierLevel, selectedLocationId: state.selectedLocationId }),
      onRehydrateStorage: () => (state) => {
        if (state) {
          // palette and dark are now restored from storage — sync the derived theme
          useStore.setState({ theme: makeTheme(state.palette, state.dark) });
        }
      },
    }
  )
);
