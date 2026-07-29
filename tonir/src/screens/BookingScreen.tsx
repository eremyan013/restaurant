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
import { TimePill } from '../components/TimePill';
import { FONTS } from '../theme';
import { notifyAdminsNewReservation } from '../lib/api';
import { useVenueAvailability, isDateAvailable, filterAvailableTimes } from '../hooks/useVenueAvailability';
import { useOccasions } from '../hooks/useOccasions';
import { BOOKING_PEOPLE_OPTIONS, BOOKING_LARGE_GROUP_SENTINEL, BOOKING_HORIZON_DAYS, CANCEL_DEADLINE_MS } from '../lib/constants';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Booking'>;
  route: RouteProp<RootStackParamList, 'Booking'>;
};

function generateDates(
  dayNames: string[],
  monthNames: string[],
  labelToday: string,
  labelTomorrow: string,
) {
  const today = new Date();
  return Array.from({ length: BOOKING_HORIZON_DAYS }, (_, i) => {
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
  const { venueId, time: initialTime, people: initialPeople, modifyReservationId, modifyDateIso } = route.params;
  const { theme: t, setBooking } = useStore();
  const insets = useSafeAreaInsets();
  const { venue } = useVenue(venueId);
  const { book, cancel } = useReservations();
  const { tr, tra, language } = useTranslation();
  const { hoursMap, blockedDates } = useVenueAvailability(venueId);

  const [people, setPeople] = useState(initialPeople ?? 2);
  const [dateIndex, setDateIndex] = useState(0);
  const [time, setTime] = useState(initialTime ?? '');
  const [occasion, setOccasion] = useState<string | null>(null);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { options: OCCASIONS } = useOccasions();
  const DATES = useMemo(
    () => generateDates(tra('book_days'), tra('book_months'), tr('book_today'), tr('book_tomorrow')),
    [language]
  );

  const isoDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: BOOKING_HORIZON_DAYS }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return d.toISOString().split('T')[0]!;
    });
  }, []);

  const availableTimes = useMemo(() => {
    if (!venue) return [];
    const today = new Date();
    const d = new Date(today);
    d.setDate(today.getDate() + dateIndex);
    const isoDate = isoDates[dateIndex]!;
    if (!isDateAvailable(isoDate, d.getDay(), hoursMap, blockedDates)) return [];
    return filterAvailableTimes(venue.times, d.getDay(), hoursMap, dateIndex === 0);
  }, [venue, dateIndex, hoursMap, blockedDates, isoDates]);

  const nextAvailableDateIndex = useMemo(() => {
    if (!venue || availableTimes.length > 0) return null;
    for (let i = dateIndex + 1; i < DATES.length; i++) {
      const d = new Date();
      d.setDate(d.getDate() + i);
      if (!isDateAvailable(isoDates[i]!, d.getDay(), hoursMap, blockedDates)) continue;
      const times = filterAvailableTimes(venue.times, d.getDay(), hoursMap, false);
      if (times.length > 0) return i;
    }
    return null;
  }, [venue, dateIndex, hoursMap, availableTimes.length, DATES.length, blockedDates, isoDates]);

  if (!venue) {
    return <View style={{ flex: 1, backgroundColor: t.bg }} />;
  }

  async function confirm() {
    if (submitting) return;

    if (modifyReservationId && modifyDateIso) {
      const [hourStr, minuteStr] = (initialTime ?? '').split(':');
      if (hourStr && minuteStr) {
        const resDate = new Date(modifyDateIso);
        resDate.setHours(parseInt(hourStr, 10), parseInt(minuteStr, 10), 0, 0);
        if (Date.now() >= resDate.getTime() - CANCEL_DEADLINE_MS) {
          Alert.alert(
            tr('book_error_title'),
            tr('res_cancel_deadline_passed'),
            [{ text: tr('book_error_back'), style: 'cancel' }]
          );
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      const d = DATES[dateIndex];
      const dateStr = `${d.day}, ${d.date} ${d.month}`;
      const isoDateObj = new Date();
      isoDateObj.setDate(isoDateObj.getDate() + dateIndex);
      const dateIso = isoDateObj.toISOString().split('T')[0];

      if (modifyReservationId) {
        await book({
          venue_id: venueId,
          people,
          date: dateStr,
          date_iso: dateIso,
          time,
          occasion,
          note,
          status: 'pending',
          yel_earned: String((venue!.time_yel_map as Record<string, number> | null)?.[time] ?? 0),
        });
        await cancel(modifyReservationId).catch(() => {});
      } else {
        await book({
          venue_id: venueId,
          people,
          date: dateStr,
          date_iso: dateIso,
          time,
          occasion,
          note,
          status: 'pending',
          yel_earned: String((venue!.time_yel_map as Record<string, number> | null)?.[time] ?? 0),
        });
      }

      notifyAdminsNewReservation(venue!.name, dateStr, time, people).catch(() => {});
      setBooking({
        venueId,
        people,
        date: dateStr,
        dateIso: dateIso!,
        time,
        occasion,
        splitWith: [],
        note,
        yelEarned: String((venue!.time_yel_map as Record<string, number> | null)?.[time] ?? 0),
      });
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigation.navigate('Confirmation');
    } catch (err: unknown) {
      if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      const message = err instanceof Error ? err.message : tr('book_error_sub');
      Alert.alert(
        tr('book_error_title'),
        message,
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
          <Text style={[styles.eyebrow, { color: t.primary }]}>
            {modifyReservationId ? tr('book_eyebrow_modify') : tr('book_eyebrow')}
          </Text>
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
            <Text style={[styles.yelText, { color: t.accent }]}>+{String(venue.perk).replace(/^\+/, '')} Yel</Text>
          </View>
        </View>

        {/* People */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.text }]}>{tr('book_people')}</Text>
          <View style={styles.peopleGrid}>
            {BOOKING_PEOPLE_OPTIONS.map((p) => (
              <Pressable
                key={String(p)}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  if (p === BOOKING_LARGE_GROUP_SENTINEL) {
                    Alert.alert(
                      tr('book_large_title'),
                      tr('book_large_sub'),
                      [{ text: tr('book_large_ok') }]
                    );
                  } else {
                    setPeople(p as number);
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={`${p} ${tr('book_people_unit')}`}
                accessibilityState={{ selected: people === p }}
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
              {DATES.map((d, i) => {
                const today = new Date();
                const dayDate = new Date(today);
                dayDate.setDate(today.getDate() + i);
                const isoDate = isoDates[i]!;
                const unavailable = !isDateAvailable(isoDate, dayDate.getDay(), hoursMap, blockedDates);
                const selected = dateIndex === i;
                return (
                  <Pressable
                    key={d.date + i}
                    onPress={() => {
                      if (unavailable) return;
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setDateIndex(i);
                      setTime('');
                    }}
                    accessibilityRole="button"
                    accessibilityLabel={`${d.day} ${d.date} ${d.month}${unavailable ? ', ' + tr('book_closed') : ''}`}
                    accessibilityState={{ selected, disabled: unavailable }}
                    style={[
                      styles.dateCard,
                      {
                        backgroundColor: selected ? t.primary : t.surface,
                        borderColor: selected ? t.primary : t.border,
                        opacity: unavailable ? 0.35 : 1,
                      },
                    ]}
                  >
                    <Text style={[styles.dateDayText, { color: selected ? 'rgba(251,245,232,0.7)' : t.textMute }]}>
                      {d.day}
                    </Text>
                    <Text style={[styles.dateDateText, { color: selected ? '#FBF5E8' : t.text }]}>
                      {d.date}
                    </Text>
                    {unavailable ? (
                      <Text style={[styles.dateLabelText, { color: selected ? 'rgba(251,245,232,0.5)' : t.textFaint }]}>
                        {tr('book_closed')}
                      </Text>
                    ) : d.label ? (
                      <Text style={[styles.dateLabelText, { color: selected ? t.accent : t.primary }]}>
                        {d.label}
                      </Text>
                    ) : (
                      <View style={{ height: 14 }} />
                    )}
                  </Pressable>
                );
              })}
            </View>
          </ScrollView>
        </View>

        {/* Time */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.text }]}>{tr('book_time')}</Text>
          {availableTimes.length === 0 ? (
            <View style={styles.noTimesWrap}>
              <Text style={[styles.timeBtnText, { color: t.textMute }]}>
                {tr('book_no_times')}
              </Text>
              {nextAvailableDateIndex !== null && (
                <Pressable
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    setDateIndex(nextAvailableDateIndex);
                  }}
                  style={[styles.noTimesBtn, { backgroundColor: t.surface, borderColor: t.border }]}
                >
                  <Text style={[styles.noTimesBtnText, { color: t.primary }]}>
                    {tr('book_try_next_date')} {DATES[nextAvailableDateIndex]?.day}, {DATES[nextAvailableDateIndex]?.date}
                  </Text>
                  <Icon name="chevR" size={14} color={t.primary} />
                </Pressable>
              )}
            </View>
          ) : (
            <View style={styles.timeGrid}>
              {(() => {
                const yelMap = (venue.time_yel_map as Record<string, number> | null) ?? {};
                return availableTimes.map((t2) => (
                  <TimePill
                    key={t2}
                    time={t2}
                    active={time === t2}
                    t={t}
                    size="lg"
                    light
                    perk={yelMap[t2] ? `+${yelMap[t2]}` : undefined}
                    onPress={() => {
                      if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                      setTime(t2);
                    }}
                  />
                ));
              })()}
            </View>
          )}
        </View>

        {/* Occasion */}
        <View style={styles.section}>
          <Text style={[styles.sectionLabel, { color: t.text }]}>
            {tr('book_occasion')}{' '}
            <Text style={{ fontFamily: FONTS.regular, fontWeight: '400', opacity: 0.5 }}>{tr('book_occasion_opt')}</Text>
          </Text>
          <View style={styles.chipsWrap}>
            {OCCASIONS.map(({ id, name }) => (
              <Pressable
                key={id}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setOccasion(occasion === name ? null : name);
                }}
                style={[
                  styles.occasionChip,
                  {
                    backgroundColor: occasion === name ? t.primary : t.surface,
                    borderColor: occasion === name ? t.primary : t.border,
                  },
                ]}
              >
                <Text style={[styles.occasionText, { color: occasion === name ? '#FBF5E8' : t.text }]}>
                  {name}
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
          accessibilityRole="button"
          accessibilityLabel={tr('book_cta')}
          accessibilityState={{ disabled: !time || submitting, busy: submitting }}
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
  timeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 8 },
  noTimesWrap: { gap: 12 },
  noTimesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1,
    alignSelf: 'flex-start',
  },
  noTimesBtnText: { fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },
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
