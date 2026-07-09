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
import { useTranslation } from '../hooks/useTranslation';
import { Icon } from '../components/Icon';
import { FONTS, COLORS } from '../theme';
import { confirmReservationByToken, cancelReservationByToken } from '../lib/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'ReservationAction'>;
  route: RouteProp<RootStackParamList, 'ReservationAction'>;
};

type ScreenState = 'loading' | 'success' | 'already_done' | 'error';

export function ReservationActionScreen({ navigation, route }: Props) {
  const { token, action } = route.params;
  const { theme: t } = useStore();
  const { tr } = useTranslation();
  const insets = useSafeAreaInsets();

  const [screenState, setScreenState] = useState<ScreenState>('loading');
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const result =
        action === 'confirm'
          ? await confirmReservationByToken(token, tr)
          : await cancelReservationByToken(token, tr);

      if (cancelled) return;

      if (result.error) {
        const isAlreadyDone =
          result.error === tr('err_already_confirmed') ||
          result.error === tr('err_already_cancelled');

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
    success: isConfirm ? (t.primaryDeep ?? '#1A1208') : COLORS.cancelHero,
    already_done: isConfirm ? (t.primaryDeep ?? '#1A1208') : COLORS.cancelHero,
    error: COLORS.cancelHeroDeep,
  }[screenState];

  const heroTitle = {
    loading: isConfirm ? tr('resact_loading_confirm') : tr('resact_loading_cancel'),
    success: isConfirm ? tr('resact_success_confirm_title') : tr('resact_success_cancel_title'),
    already_done: isConfirm ? tr('resact_already_confirm_title') : tr('resact_already_cancel_title'),
    error: tr('resact_error_title'),
  }[screenState];

  const heroSub = {
    loading: tr('resact_loading_sub'),
    success: isConfirm ? tr('resact_success_confirm_sub') : tr('resact_success_cancel_sub'),
    already_done: isConfirm ? tr('resact_already_confirm_sub') : tr('resact_already_cancel_sub'),
    error: errorMessage || tr('resact_error_sub'),
  }[screenState];

  // All three names are confirmed present in Icon.tsx
  const heroIconName = screenState === 'loading'
    ? 'clock'
    : screenState === 'error'
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
            <ActivityIndicator color={COLORS.cream} size="large" />
          ) : (
            <Icon name={heroIconName as any} size={30} color={COLORS.cream} strokeWidth={2.5} />
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
                  {isConfirm ? tr('resact_view_confirm') : tr('resact_book_again')}
                </Text>
                <Text style={[styles.cardRowSub, { color: t.textMute }]}>
                  {isConfirm ? tr('resact_view_confirm_sub') : tr('resact_book_again_sub')}
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
              {screenState === 'error' ? tr('resact_done_error') : tr('resact_done_view')}
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
    color: COLORS.cream,
    fontSize: 24,
    fontFamily: FONTS.extraBold,
    fontWeight: '800',
    textAlign: 'center',
    letterSpacing: -0.5,
    lineHeight: 30,
    marginBottom: 10,
  },
  heroSub: {
    color: COLORS.creamAlpha65,
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
    color: COLORS.cream,
    fontSize: 15,
    fontFamily: FONTS.bold,
    fontWeight: '700',
  },
});
