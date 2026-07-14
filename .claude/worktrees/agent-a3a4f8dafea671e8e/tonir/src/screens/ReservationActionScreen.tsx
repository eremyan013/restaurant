import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme';
import { confirmReservationByToken, cancelReservationByToken } from '../lib/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReservationAction'>;
  route: RouteProp<RootStackParamList, 'ReservationAction'>;
};

type ScreenState = 'loading' | 'success' | 'already_done' | 'error';

export function ReservationActionScreen({ navigation, route }: Props) {
  const { token, action } = route.params;
  const { theme: t } = useStore();
  const insets = useSafeAreaInsets();

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result =
        action === 'confirm'
          ? await confirmReservationByToken(token)
          : await cancelReservationByToken(token);

      if (cancelled) return;

      if (result.error) {
        const isAlreadyDone =
          result.error.toLowerCase().includes('already confirmed') ||
          result.error.toLowerCase().includes('already cancelled');

        if (isAlreadyDone) {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setScreenState('already_done');
        } else {
          if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          setErrorMessage(result.error);
          setScreenState('error');
        }
      } else {
        if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setScreenState('success');
      }
    }

    run();
    return () => { cancelled = true; };
  }, [token, action]);

  const isConfirm = action === 'confirm';

  const heroBg = {
    loading: t.primaryDeep ?? '#1A1208',
    success: isConfirm ? (t.primaryDeep ?? '#1A1208') : '#8B2020',
    already_done: isConfirm ? (t.primaryDeep ?? '#1A1208') : '#8B2020',
    error: '#5C2020',
  }[screenState];

  const heroTitle = {
    loading: isConfirm ? 'Confirming your reservation…' : 'Cancelling your reservation…',
    success: isConfirm ? 'Reservation Confirmed!' : 'Reservation Cancelled',
    already_done: isConfirm ? 'Already Confirmed' : 'Already Cancelled',
    error: 'Something Went Wrong',
  }[screenState];

  const heroSub = {
    loading: 'This will only take a moment.',
    success: isConfirm ? 'You are all set. See you soon!' : 'Your reservation has been cancelled. We hope to see you another time.',
    already_done: isConfirm ? 'This reservation is already confirmed.' : 'This reservation has already been cancelled.',
    error: errorMessage || 'Please try again or contact the restaurant directly.',
  }[screenState];

  // All three names are confirmed present in Icon.tsx
  const heroIconName = screenState === 'loading'
    ? 'clock'
    : (screenState === 'error' || (!isConfirm && screenState !== 'loading'))
      ? 'x'
      : 'check';

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle="light-content" />

      <View
        style={[
          styles.hero,
          {
            backgroundColor: heroBg,
            paddingTop: insets.top + 48,
          },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
          {screenState === 'loading' ? (
            <ActivityIndicator color="#FBF5E8" size="large" />
          ) : (
            <Icon name={heroIconName as any} size={30} color="#FBF5E8" strokeWidth={2.5} />
          )}
        </View>
        <Text style={styles.heroTitle}>{heroTitle}</Text>
        <Text style={styles.heroSub}>{heroSub}</Text>
      </View>

      <View style={[styles.content, { paddingBottom: insets.bottom + 24 }]}>
        {(screenState === 'success' || screenState === 'already_done') && (
          <View style={[styles.card, { backgroundColor: t.surface }]}>
            <View style={styles.cardRow}>
              <View style={[styles.cardIconTile, { backgroundColor: t.bgAlt }]}>
                <Icon name="calendar" size={18} color={t.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.cardRowLabel, { color: t.text }]}>
                  {isConfirm ? 'View your reservations' : 'Book again anytime'}
                </Text>
                <Text style={[styles.cardRowSub, { color: t.textMute }]}>
                  {isConfirm
                    ? 'Open the app to see all your upcoming bookings.'
                    : 'Find and reserve your next table from the home screen.'}
                </Text>
              </View>
            </View>
          </View>
        )}

        <View style={{ flex: 1 }} />

        {screenState !== 'loading' && (
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.navigate('Tabs');
            }}
            style={[styles.doneBtn, { backgroundColor: t.primary, marginHorizontal: 20 }]}
          >
            <Text style={styles.doneBtnText}>
              {screenState === 'error' ? 'Go to app' : 'View my reservations'}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  hero: {
    alignItems: 'center',
    paddingBottom: 44,
    paddingHorizontal: 28,
    borderBottomLeftRadius: 32,
    borderBottomRightRadius: 32,
    overflow: 'hidden',
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  heroTitle: {
    color: '#FBF5E8',
    fontSize: 24,
    fontFamily: FONTS.extraBold,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 10,
  },
  heroSub: {
    color: 'rgba(251,245,232,0.65)',
    fontSize: 13,
    fontFamily: FONTS.regular,
    textAlign: 'center',
    lineHeight: 20,
  },
  content: {
    flex: 1,
    paddingTop: 24,
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
    marginHorizontal: 20,
    marginBottom: 16,
  },
  cardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
  },
  cardIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardRowLabel: {
    fontSize: 14,
    fontFamily: FONTS.semiBold,
    fontWeight: '600',
  },
  cardRowSub: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  doneBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 16,
    marginBottom: 8,
  },
  doneBtnText: {
    color: '#FBF5E8',
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});
