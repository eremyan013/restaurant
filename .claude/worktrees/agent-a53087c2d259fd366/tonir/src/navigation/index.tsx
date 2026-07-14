import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { View, Text, Pressable, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Notifications from 'expo-notifications';

import { useStore } from '../store';
import { Icon, IconName } from '../components/Icon';
import { SHADOWS, FONTS} from '../theme';
import { supabase } from '../lib/supabase';

// Show notifications while app is in foreground
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export const ONBOARDING_KEY = 'tonir_onboarding_done';

// Screens
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { AuthScreen } from '../screens/AuthScreen';
import { HomeScreen } from '../screens/HomeScreen';
import { SearchScreen } from '../screens/SearchScreen';
import { DetailScreen } from '../screens/DetailScreen';
import { MapScreen } from '../screens/MapScreen';
import { BookingScreen } from '../screens/BookingScreen';
import { ConfirmationScreen } from '../screens/ConfirmationScreen';
import { ReservationsScreen } from '../screens/ReservationsScreen';
import { FavoritesScreen } from '../screens/FavoritesScreen';
import { ProfileScreen } from '../screens/ProfileScreen';
import { ConciergeScreen } from '../screens/ConciergeScreen';
import { MarketScreen } from '../screens/MarketScreen';
import { MyPrizesScreen } from '../screens/MyPrizesScreen';
import { PhoneVerifyScreen } from '../screens/PhoneVerifyScreen';
import { ReservationActionScreen } from '../screens/ReservationActionScreen';

export type RootStackParamList = {
  Onboarding: undefined;
  Auth: undefined;
  PhoneVerify: { phone: string; userId: string };
  Tabs: undefined;
  Detail: { venueId: string };
  Booking: {
    venueId: string;
    time?: string;
    people?: number;
    modifyReservationId?: string;
    modifyDateIso?: string;
  };
  Confirmation: undefined;
  Map: { focusVenueId?: string; fromDetail?: boolean };
  Concierge: undefined;
  Market: undefined;
  MyPrizes: undefined;
  ReservationAction: { token: string; action: 'confirm' | 'cancel' };
};

export type TabParamList = {
  Home: undefined;
  Search: undefined;
  Reservations: undefined;
  Favorites: undefined;
  Profile: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();
const Tab = createBottomTabNavigator<TabParamList>();

const TAB_ITEMS: Array<{ name: keyof TabParamList; icon: IconName; label: string }> = [
  { name: 'Home',         icon: 'home',     label: 'Բացահայտել' },
  { name: 'Search',       icon: 'search',   label: 'Որոնում' },
  { name: 'Reservations', icon: 'calendar', label: 'Ամրագրումներ' },
  { name: 'Favorites',    icon: 'heart',    label: 'Պահպանված' },
  { name: 'Profile',      icon: 'user',     label: 'Պրոֆիլ' },
];

function CustomTabBar({ state, navigation }: any) {
  const { theme: t, upcomingCount } = useStore();
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.tabBarOuter,
        { paddingBottom: insets.bottom > 0 ? insets.bottom - 6 : 16 },
      ]}
    >
      <View style={[styles.tabBarInner, { backgroundColor: t.primaryDeep }, SHADOWS.tabBar]}>
        {state.routes.map((route: any, index: number) => {
          const item = TAB_ITEMS[index];
          const active = state.index === index;
          return (
            <Pressable
              key={route.key}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                navigation.navigate(route.name);
              }}
              style={[
                styles.tabItem,
                active && [styles.tabItemActive, { backgroundColor: '#FBF5E8' }],
              ]}
            >
              <View style={{ position: 'relative' }}>
                <Icon
                  name={item.icon}
                  size={20}
                  color={active ? t.primaryDeep : 'rgba(251,245,232,0.85)'}
                  strokeWidth={active ? 2 : 1.7}
                />
                {item.name === 'Reservations' && upcomingCount > 0 && (
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>
                      {upcomingCount > 9 ? '9+' : String(upcomingCount)}
                    </Text>
                  </View>
                )}
              </View>
              {active && (
                <Text style={[styles.tabLabel, { color: t.primaryDeep }]}>
                  {item.label}
                </Text>
              )}
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function TabNavigator() {
  return (
    <Tab.Navigator
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{ headerShown: false }}
    >
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Search" component={SearchScreen} />
      <Tab.Screen name="Reservations" component={ReservationsScreen} />
      <Tab.Screen name="Favorites" component={FavoritesScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
}

const linking = {
  prefixes: ['tonir://'],
  config: {
    screens: {
      ReservationAction: {
        path: 'reservation/:action',
        parse: {
          action: (action: string) => action as 'confirm' | 'cancel',
          token: (token: string) => token,
        },
      },
    },
  },
};

export function AppNavigator() {
  const { theme: t, pendingPhoneVerification } = useStore();
  const [session, setSession] = useState<boolean | null>(null);          // null = still checking
  const [seenOnboarding, setSeenOnboarding] = useState<boolean | null>(null); // null = still checking

  useEffect(() => {
    // Check existing session on mount
    (supabase as any).auth.getSession().then(({ data }: any) => {
      const uid = data.session?.user?.id ?? null;
      setSession(!!data.session);
      useStore.getState().setUserId(uid);
    });

    // Check whether onboarding has already been completed
    AsyncStorage.getItem(ONBOARDING_KEY).then((val) => {
      setSeenOnboarding(val === 'true');
    });

    // Listen for sign-in / sign-out
    const { data: { subscription } } = (supabase as any).auth.onAuthStateChange(
      (_event: string, sess: any) => {
        const uid = sess?.user?.id ?? null;
        setSession(!!sess);
        useStore.getState().setUserId(uid);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  // Splash/loading while checking auth or onboarding flag
  if (session === null || seenOnboarding === null) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer linking={linking}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {session && !pendingPhoneVerification ? (
          // ── Authenticated ──────────────────────────────
          <>
            <Stack.Screen name="Tabs" component={TabNavigator} />
            <Stack.Screen
              name="Detail"
              component={DetailScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Booking"
              component={BookingScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Confirmation"
              component={ConfirmationScreen}
              options={{ animation: 'slide_from_bottom', gestureEnabled: false }}
            />
            <Stack.Screen
              name="Map"
              component={MapScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="Concierge"
              component={ConciergeScreen}
              options={{ animation: 'slide_from_bottom' }}
            />
            <Stack.Screen
              name="Market"
              component={MarketScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="MyPrizes"
              component={MyPrizesScreen}
              options={{ animation: 'slide_from_right' }}
            />
            <Stack.Screen
              name="ReservationAction"
              component={ReservationActionScreen}
              options={{ headerShown: false, animation: 'slide_from_bottom', gestureEnabled: false }}
            />
          </>
        ) : (
          // ── Not authenticated / pending phone verification ──
          <>
            {!seenOnboarding && !pendingPhoneVerification && (
              <Stack.Screen name="Onboarding" component={OnboardingScreen} />
            )}
            {!pendingPhoneVerification && (
              <Stack.Screen
                name="Auth"
                component={AuthScreen}
                options={{ animation: 'slide_from_bottom' }}
              />
            )}
            <Stack.Screen
              name="PhoneVerify"
              component={PhoneVerifyScreen}
              options={{ animation: 'slide_from_right', gestureEnabled: false }}
            />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabBarOuter: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 0,
  },
  tabBarInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tabItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    padding: 10,
    borderRadius: 999,
  },
  tabItemActive: {
    flex: 1,
    paddingHorizontal: 16,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold, fontWeight: '600',
    letterSpacing: -0.1,
  },
  badge: {
    position: 'absolute',
    top: -5,
    right: -7,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#E8743B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
  },
  badgeText: {
    color: '#FBF5E8',
    fontSize: 9,
    fontFamily: FONTS.extraBold, fontWeight: '800',
  },
});
