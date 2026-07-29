import React, { useEffect } from 'react';
import {
  View, Text, Pressable, StyleSheet, StatusBar, ScrollView, Linking, Platform, Share, Image, Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

import * as Haptics from 'expo-haptics';
import * as Calendar from 'expo-calendar';
import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { useVenue } from '../hooks/useVenues';
import { useTranslation } from '../hooks/useTranslation';
import { Icon } from '../components/Icon';
import { FONTS, COLORS } from '../theme';
import { CALENDAR_EVENT_DURATION_MS } from '../lib/constants';

const GOOGLE_CALENDAR_URL = 'https://calendar.google.com/calendar/r/eventedit';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Confirmation'>;
};

// Simple confetti dots
const CONFETTI = Array.from({ length: 18 }, (_, i) => ({
  key: i,
  top: Math.random() * 140,
  left: Math.random() * 300,
  size: 6 + Math.random() * 8,
  color: ['#C9A961', '#E8743B', '#FBF5E8', '#6FCF97', '#F2994A'][i % 5],
  rotate: Math.random() * 360,
}));

export function ConfirmationScreen({ navigation }: Props) {
  const { theme: t, booking, userId } = useStore();
  const insets = useSafeAreaInsets();
  const { venue } = useVenue(booking?.venueId ?? '');
  const { tr } = useTranslation();

  function openDirections() {
    if (!venue) return;
    const lat = venue.coord_y;
    const lng = venue.coord_x;
    const label = encodeURIComponent(venue.name);
    const mapsUrl = Platform.OS === 'ios'
      ? `maps://?daddr=${lat},${lng}&q=${label}`
      : `geo:${lat},${lng}?q=${label}`;
    Linking.openURL(mapsUrl).catch(() =>
      Linking.openURL(`https://maps.google.com/?q=${lat},${lng}`)
    );
  }

  async function shareBooking() {
    if (!venue || !booking) return;
    try {
      await Share.share({
        title: venue.name,
        message: `${venue.name} · ${booking.date} · ${booking.time} · ${booking.people}`,
      });
    } catch { /* user dismissed */ }
  }

  async function openCalendar() {
    if (!booking || !venue) return;

    // Parse date + time from booking store
    // booking.date is a display string (e.g. "Mon, 12 Jun") — use date_iso if available
    // We rebuild the event start from the ISO date stored in booking flow
    const [hourStr, minuteStr] = (booking.time ?? '').split(':');
    const hour   = parseInt(hourStr   ?? '0', 10);
    const minute = parseInt(minuteStr ?? '0', 10);

    // Fallback: build date from today + offset is unreliable; use current date as base
    // The booking store has `date` (display) but not a raw ISO date.
    // Reconstruct from display string is fragile — default to tomorrow if parse fails.
    const [isoYear, isoMonth, isoDay] = (booking.dateIso ?? '').split('-').map(Number);
    const startDate = new Date(isoYear!, isoMonth! - 1, isoDay!, hour, minute, 0);
    const endDate   = new Date(startDate.getTime() + CALENDAR_EVENT_DURATION_MS);

    if (Platform.OS === 'web') {
      Linking.openURL(GOOGLE_CALENDAR_URL).catch(() => {});
      return;
    }

    try {
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(tr('conf_calendar_denied_title'), tr('conf_calendar_denied_sub'));
        return;
      }

      const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
      const defaultCal = calendars.find((c) => c.allowsModifications && c.isPrimary)
        ?? calendars.find((c) => c.allowsModifications);

      if (!defaultCal) {
        // No writable calendar — fall back to opening the calendar app
        Linking.openURL(Platform.OS === 'ios' ? 'calshow://' : 'content://com.android.calendar/time/').catch(() => {});
        return;
      }

      await Calendar.createEventAsync(defaultCal.id, {
        title:    `${venue.name} · ${tr('conf_calendar_event_title')}`,
        location: `${venue.name}, ${venue.area}`,
        startDate,
        endDate,
        notes:    `${booking.people} ${tr('conf_people_unit')} · ${booking.time}${booking.occasion ? ' · ' + booking.occasion : ''}`,
        alarms:   [{ relativeOffset: -60 }], // 1-hour reminder
      });

      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert(tr('conf_calendar_added_title'), tr('conf_calendar_added_sub'));
    } catch {
      // Permission denied or error — silent fallback
      Linking.openURL(Platform.OS === 'ios' ? 'calshow://' : 'content://com.android.calendar/time/').catch(() => {});
    }
  }

  const beforeVisitRows = [
    {
      icon: 'gift' as const,
      label: tr('conf_wine_label'),
      sub: tr('conf_wine_sub'),
      onPress: () => Alert.alert(tr('conf_soon_title'), tr('conf_soon_wine')),
    },
    {
      icon: 'spark' as const,
      label: tr('conf_occasion_label'),
      sub: tr('conf_occasion_sub'),
      onPress: () => Alert.alert(tr('conf_soon_title'), tr('conf_soon_occasion')),
    },
    {
      icon: 'users' as const,
      label: tr('conf_invite_label'),
      sub: tr('conf_invite_sub'),
      onPress: shareBooking,
    },
  ];

  const yelPoints = Number(booking?.yelEarned ?? 0);

  const detailCells = [
    { icon: 'calendar' as const, label: tr('conf_date'), value: booking?.date ?? '—' },
    { icon: 'clock' as const, label: tr('conf_time'), value: booking?.time ?? '—' },
    { icon: 'users' as const, label: tr('conf_people'), value: `${booking?.people ?? 2} ${tr('conf_people_unit')}` },
    ...(yelPoints > 0
      ? [{ icon: 'gift' as const, label: tr('conf_earn'), value: `+${yelPoints} Yel` }]
      : []),
  ];

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 32 }]}>
        {/* Hero */}
        <View style={[styles.hero, { backgroundColor: t.primaryDeep, borderBottomLeftRadius: 32, borderBottomRightRadius: 32 }]}>
          {CONFETTI.map((c) => (
            <View
              key={c.key}
              style={{
                position: 'absolute',
                top: c.top,
                left: c.left,
                width: c.size,
                height: c.size,
                borderRadius: c.size / 4,
                backgroundColor: c.color,
                opacity: 0.7,
                transform: [{ rotate: `${c.rotate}deg` }],
              }}
            />
          ))}
          <View style={[styles.checkCircle, { backgroundColor: t.accent }]}>
            <Icon name="check" size={30} color={t.primaryDeep} strokeWidth={2.5} />
          </View>
          <Text style={styles.heroTitle}>{tr('conf_title')}</Text>
          <Text style={styles.heroSub}>{tr('conf_sub')}</Text>
          <View style={[styles.heroPadding, { paddingTop: insets.top + 24 }]} />
        </View>

        {/* Booking card */}
        <View style={[styles.card, { backgroundColor: t.surface, marginHorizontal: 20, marginTop: 24 }]}>
          <View style={styles.cardHeader}>
            {venue?.dish_url
              ? <Image source={{ uri: venue.dish_url }} style={styles.venueDot} />
              : <View style={[styles.venueDot, { backgroundColor: t.primary }]} />
            }
            <View>
              <Text style={[styles.cardVenueName, { color: t.text }]}>{venue?.name ?? booking?.venueId ?? '—'}</Text>
              <Text style={[styles.cardVenueSub, { color: t.textMute }]}>{venue?.cuisine} · {venue?.area}</Text>
            </View>
          </View>
          <View style={[styles.divider, { borderColor: t.border }]} />
          <View style={styles.detailsGrid}>
            {detailCells.map((item, i) => (
              <View
                key={item.label}
                style={[
                  styles.detailCell,
                  {
                    borderRightWidth: i % 2 === 0 ? StyleSheet.hairlineWidth : 0,
                    borderBottomWidth: i < 2 ? StyleSheet.hairlineWidth : 0,
                    borderColor: t.border,
                  },
                ]}
              >
                <Icon name={item.icon} size={16} color={t.primary} strokeWidth={2} />
                <Text style={[styles.detailLabel, { color: t.textMute }]}>{item.label}</Text>
                <Text style={[styles.detailValue, { color: t.text }]}>{item.value}</Text>
              </View>
            ))}
          </View>
          <View style={[styles.divider, { borderColor: t.border }]} />
          <View style={styles.cardActions}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openCalendar();
              }}
              style={[styles.cardActionBtn, { borderColor: t.border }]}
            >
              <Icon name="calendar" size={16} color={t.primary} strokeWidth={2} />
              <Text style={[styles.cardActionText, { color: t.text }]}>{tr('conf_calendar')}</Text>
            </Pressable>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                openDirections();
              }}
              style={[styles.cardActionBtn, { borderColor: t.border }]}
            >
              <Icon name="pin" size={16} color={t.primary} strokeWidth={2} />
              <Text style={[styles.cardActionText, { color: t.text }]}>{tr('conf_directions')}</Text>
            </Pressable>
          </View>
        </View>

        {/* Before visit section */}
        <View style={[styles.beforeSection, { marginHorizontal: 20, marginTop: 24 }]}>
          <Text style={[styles.beforeTitle, { color: t.text }]}>{tr('conf_before_title')}</Text>
          {beforeVisitRows.map((item) => (
            <Pressable
              key={item.label}
              onPress={item.onPress}
              style={[styles.beforeRow, { borderBottomColor: t.border }]}
            >
              <View style={[styles.beforeIconTile, { backgroundColor: t.bgAlt }]}>
                <Icon name={item.icon} size={18} color={t.primary} strokeWidth={2} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.beforeLabel, { color: t.text }]}>{item.label}</Text>
                <Text style={[styles.beforeSub, { color: t.textMute }]}>{item.sub}</Text>
              </View>
              <Icon name="chevR" size={16} color={t.textFaint} />
            </Pressable>
          ))}
        </View>

        {/* Done button */}
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            navigation.navigate('Tabs');
          }}
          style={[styles.doneBtn, { borderColor: t.primary, marginHorizontal: 20, marginTop: 28 }]}
        >
          <Text style={[styles.doneBtnText, { color: t.primary }]}>{tr('conf_done')}</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: {},
  hero: {
    alignItems: 'center',
    paddingTop: 80,
    paddingBottom: 40,
    paddingHorizontal: 28,
    overflow: 'hidden',
  },
  heroPadding: { position: 'absolute', top: 0, left: 0, right: 0 },
  checkCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  heroTitle: {
    color: COLORS.cream,
    fontSize: 24,
    fontFamily: FONTS.extraBold, fontWeight: '800',
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
  },
  card: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
  },
  venueDot: { width: 48, height: 48, borderRadius: 14 },
  cardVenueName: { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700' },
  cardVenueSub: { fontSize: 12, marginTop: 2 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth },
  detailsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  detailCell: {
    width: '50%',
    padding: 16,
    gap: 4,
    alignItems: 'flex-start',
  },
  detailLabel: { fontSize: 11, fontFamily: FONTS.medium, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  detailValue: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
  cardActions: { flexDirection: 'row', padding: 14, gap: 10 },
  cardActionBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  cardActionText: { fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },
  beforeSection: { gap: 0 },
  beforeTitle: { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: -0.3, marginBottom: 14 },
  beforeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  beforeIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  beforeLabel: { fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600' },
  beforeSub: { fontSize: 12, marginTop: 2 },
  doneBtn: {
    borderWidth: 1.5,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginBottom: 8,
  },
  doneBtnText: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
});
