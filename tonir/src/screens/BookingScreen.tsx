import React, { useState, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, TextInput, StyleSheet, StatusBar,
  KeyboardAvoidingView, Platform, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import * as Haptics from 'expo-haptics';
import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { useVenue } from '../hooks/useVenues';
import { useReservations } from '../hooks/useReservations';
import { useTranslation } from '../hooks/useTranslation';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme';
import { notifyAdminsNewReservation } from '../lib/api';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Booking'>;
  route: RouteProp<RootStackParamList, 'Booking'>;
};

const PEOPLE_OPTIONS = [2, 3, 4, 5, 6, 7, 8, '9+'];

function generateDates(
  dayNames: string[],
  monthNames: string[],
  labelToday: string,
  labelTomorrow: string,
) {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return {
      day: dayNames[d.getDay()] ?? '',
      date: String(d.getDate()),
      month: monthNames[d.getMonth()] ?? '',
      label: i === 0 ? labelToday : i === 1 ? labelTomorrow : '',
    };
  });
}

export function BookingScreen({ navigation, route }: Props) {
  const { venueId, time: initialTime, people: initialPeople } = route.params;
  const { theme: t, setBooking } = useStore();
  const insets = useSafeAreaInsets();
  const { venue } = useVenue(venueId);
  const { book } = useReservations();
  const { tr, tra, language } = useTranslation();

  const OCCASIONS = tra('book_occasions');
  const DATES = useMemo(
    () => generateDates(tra('book_days'), tra('book_months'), tr('book_today'), tr('book_tomorrow')),
    [language]
  );

  const [people, setPeople] = useState(initialPeople ?? 2);
  const [dateIndex, setDateIndex] = useState(0);
  const [time, setTime] = useState(initialTime ?? '');
  const [occasion, setOccasion] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!venue) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  async function confirm() {
    if (submitting) return;
    setSubmitting(true);
    try {
      const d = DATES[dateIndex];
      const dateStr = `${d.day}, ${d.date} ${d.month}`;
      await book({
        venue_id: venueId,
        people,
        date: dateStr,
        time,
        occasion,
        note,
        status: 'pending',
        yel_earned: venue!.perk,
      });
      notifyAdminsNewReservation(venue!.name, dateStr, time, people).catch(() => {});
      setBooking({
        venueId,
        people,
        date: dateStr,
        time,
        occasion,
        splitWith: [],
        note,
        yelEarned: venue!.perk,
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Confirmation');
    } catch {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert(
        tr('book_error_title'),
        tr('book_error_sub'),
        [{ text: tr('book_error_back'), style: 'cancel' }]
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 8, backgroundColor: t.bg }]}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="chevL" size={22} color={t.text} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.eyebrow, { color: t.primary }]}>{tr('book_eyebrow')}</Text>
          <Text style={[styles.venueName, { color: t.text }]}>{venue.name}</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={insets.top + 60}
      >
      <ScrollView
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Venue summary */}
        <View style={[styles.venueSummary, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={styles.summaryLeft}>
            <Image source={{ uri: venue.dish_url }} style={styles.venueDot} />
            <View>
              <Text style={[styles.summaryName, { color: t.text }]}>{venue.name}</Text>
              <Text style={[styles.summarySub, { color: t.textMute }]}>{venue.cuisine}</Text>
            </View>
          </View>
          <View style={[styles.yelBadge, { backgroundColor: t.bgAlt }]}>
            <Text style={[styles.yelText, { color: t.accent }]}>+{venue.perk} Yel</Text>
          </View>
        </View>

        {/* People */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.text }]}>{tr('book_people')}</Text>
          <View style={styles.peopleGrid}>
            {PEOPLE_OPTIONS.map((p) => (
              <Pressable
                key={String(p)}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (p === '9+') {
                    Alert.alert(
                      tr('book_large_title'),
                      tr('book_large_sub'),
                      [{ text: tr('book_large_ok') }]
                    );
                  } else {
                    setPeople(p as number);
                  }
                }}
                style={[
                  styles.peopleBtn,
                  {
                    backgroundColor: people === p ? t.primary : t.surface,
                    borderColor: people === p ? t.primary : t.border,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.peopleBtnText,
                    { color: people === p ? '#FBF5E8' : t.text },
                  ]}
                >
                  {p}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Date */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.text }]}>{tr('book_date')}</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginHorizontal: -20 }}>
            <View style={styles.datesRow}>
              {DATES.map((d, i) => (
                <Pressable
                  key={d.date + i}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDateIndex(i);
                  }}
                  style={[
                    styles.dateCard,
                    {
                      backgroundColor: dateIndex === i ? t.primary : t.surface,
                      borderColor: dateIndex === i ? t.primary : t.border,
                    },
                  ]}
                >
                  <Text style={[styles.dateDayText, { color: dateIndex === i ? 'rgba(251,245,232,0.7)' : t.textMute }]}>
                    {d.day}
                  </Text>
                  <Text style={[styles.dateDateText, { color: dateIndex === i ? '#FBF5E8' : t.text }]}>
                    {d.date}
                  </Text>
                  {d.label ? (
                    <Text style={[styles.dateLabelText, { color: dateIndex === i ? t.accent : t.primary }]}>
                      {d.label}
                    </Text>
                  ) : (
                    <View style={{ height: 14 }} />
                  )}
                </Pressable>
              ))}
            </View>
          </ScrollView>
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.text }]}>{tr('book_time')}</Text>
          <View style={styles.timeGrid}>
            {venue.times.map((t2) => (
              <Pressable
                key={t2}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setTime(t2);
                }}
                style={[
                  styles.timeBtn,
                  {
                    backgroundColor: time === t2 ? t.primary : t.surface,
                    borderColor: time === t2 ? t.primary : t.border,
                  },
                ]}
              >
                <Text style={[styles.timeBtnText, { color: time === t2 ? '#FBF5E8' : t.text }]}>
                  {t2}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Occasion */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.text }]}>
            {tr('book_occasion')}{' '}
            <Text style={{ fontFamily: FONTS.regular, fontWeight: '400', opacity: 0.5 }}>{tr('book_occasion_opt')}</Text>
          </Text>
          <View style={styles.chipsWrap}>
            {OCCASIONS.map((occ) => (
              <Pressable
                key={occ}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOccasion(occasion === occ ? null : occ);
                }}
                style={[
                  styles.occasionChip,
                  {
                    backgroundColor: occasion === occ ? t.primary : t.surface,
                    borderColor: occasion === occ ? t.primary : t.border,
                  },
                ]}
              >
                <Text style={[styles.occasionText, { color: occasion === occ ? '#FBF5E8' : t.text }]}>
                  {occ}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Note */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.text }]}>{tr('book_note')}</Text>
          <TextInput
            value={note}
            onChangeText={setNote}
            placeholder={tr('book_note_placeholder')}
            placeholderTextColor={t.textFaint}
            multiline
            numberOfLines={3}
            style={[
              styles.noteInput,
              {
                backgroundColor: t.surface,
                borderColor: t.border,
                color: t.text,
              },
            ]}
          />
        </View>
      </ScrollView>

      {/* Sticky CTA */}
      <View style={[styles.ctaWrap, { paddingBottom: insets.bottom + 12, backgroundColor: t.bg }]}>
        {!time && (
          <Text style={[styles.ctaHint, { color: t.textMute }]}>{tr('book_time_hint')}</Text>
        )}
        <Pressable
          onPress={time && !submitting ? confirm : undefined}
          style={[styles.ctaBtn, { backgroundColor: t.primary, opacity: time && !submitting ? 1 : 0.45 }]}
        >
          {submitting ? (
            <ActivityIndicator color="#FBF5E8" size="small" />
          ) : (
            <>
              <Text style={styles.ctaText}>
                {tr('book_cta')} · {people} {tr('book_people_unit')}{time ? ` · ${time}` : ''}
              </Text>
              <Icon name="arrow" size={18} color="#FBF5E8" strokeWidth={2} />
            </>
          )}
        </Pressable>
      </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: { flex: 1, alignItems: 'center' },
  eyebrow: { fontSize: 10.5, fontFamily: FONTS.semiBold, fontWeight: '600', letterSpacing: 1.5, textTransform: 'uppercase' },
  venueName: { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: -0.3, marginTop: 1 },
  content: { paddingHorizontal: 20, gap: 24 },
  venueSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  summaryLeft: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  venueDot: { width: 48, height: 48, borderRadius: 14 },
  summaryName: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
  summarySub: { fontSize: 12, marginTop: 2 },
  yelBadge: { paddingVertical: 6, paddingHorizontal: 12, borderRadius: 999 },
  yelText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700' },
  section: { gap: 12 },
  sectionLabel: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: -0.2 },
  peopleGrid: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  peopleBtn: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  peopleBtnText: { fontSize: 15, fontFamily: FONTS.semiBold, fontWeight: '600' },
  datesRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 20 },
  dateCard: {
    width: 60,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    gap: 2,
  },
  dateDayText: { fontSize: 11, fontFamily: FONTS.medium, fontWeight: '500' },
  dateDateText: { fontSize: 20, fontFamily: FONTS.bold, fontWeight: '700' },
  dateLabelText: { fontSize: 10.5, fontFamily: FONTS.semiBold, fontWeight: '600' },
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  timeBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  timeBtnText: { fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600' },
  chipsWrap: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  occasionChip: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  occasionText: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500' },
  noteInput: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 14,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  ctaWrap: { paddingHorizontal: 20, paddingTop: 12, gap: 8 },
  ctaHint: { textAlign: 'center', fontSize: 12 },
  ctaBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  ctaText: { color: '#FBF5E8', fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
});
