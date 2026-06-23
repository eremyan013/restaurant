import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { Theme, FONTS } from '../theme';
import { useTranslation } from '../hooks/useTranslation';
import { getVenueStatus } from '../lib/venueStatus';
import { Icon } from './Icon';

export type VenueHoursRow = {
  day_of_week: number;
  is_open: boolean;
  open_time?: string | null;
  close_time?: string | null;
};

type Props = {
  hoursMap: Record<number, VenueHoursRow>;
  blockedDates?: Set<string>;
  t: Theme;
};

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]; // Mon–Sat–Sun display order

export function VenueHoursSection({ hoursMap, blockedDates, t }: Props) {
  const [expanded, setExpanded] = useState(false);
  const { tr, tra, trf } = useTranslation();
  const now = new Date();
  const todayDow = now.getDay();
  const result = getVenueStatus(hoursMap, now, blockedDates);
  const isOpen = result.status === 'open';

  let badgeText: string;
  switch (result.detail) {
    case 'plain':
      badgeText = tr(isOpen ? 'det_hours_open' : 'det_hours_closed_now');
      break;
    case 'closes_soon':
      badgeText = trf('det_hours_closes_at', { time: result.closeTime });
      break;
    case 'opens_today':
      badgeText = trf('det_hours_opens_at', { time: result.openTime });
      break;
    case 'opens_tomorrow':
      badgeText = trf('det_hours_opens_tmr', { time: result.openTime });
      break;
    case 'unknown':
      badgeText = tr('det_hours_closed_now');
      break;
  }

  const dayNames = tra('book_days'); // string[] indexed by day_of_week (0=Sun)

  return (
    <View style={[styles.container, { backgroundColor: t.surface, borderColor: t.border }]}>
      <Pressable
        onPress={() => setExpanded((v) => !v)}
        style={styles.header}
        accessibilityRole="button"
        accessibilityLabel={tr('det_hours_title')}
        accessibilityState={{ expanded }}
      >
        <Text style={[styles.title, { color: t.text }]}>{tr('det_hours_title')}</Text>
        <View style={styles.headerRight}>
          {/* Status chip */}
          <View style={[styles.chip, isOpen ? styles.chipOpen : styles.chipClosed]}>
            <View style={[styles.chipDot, isOpen ? styles.chipDotOpen : styles.chipDotClosed]} />
            <Text style={[styles.chipText, isOpen ? styles.chipTextOpen : styles.chipTextClosed]}>
              {badgeText}
            </Text>
          </View>
          {/* Chevron rotates when expanded */}
          <View style={{ transform: [{ rotate: expanded ? '180deg' : '0deg' }] }}>
            <Icon name="chevD" size={14} color={t.textMute} />
          </View>
        </View>
      </Pressable>

      {expanded && (
        <View style={[styles.rows, { borderTopColor: t.border }]}>
          {DAY_ORDER.map((dow) => {
            const row = hoursMap[dow];
            const isToday = dow === todayDow;
            const dayLabel = dayNames[dow] ?? String(dow);
            const hoursLabel =
              !row || !row.is_open
                ? tr('det_hours_closed')
                : row.open_time && row.close_time
                ? `${row.open_time} – ${row.close_time}`
                : tr('det_hours_allday');
            return (
              <View
                key={dow}
                style={[
                  styles.dayRow,
                  isToday && { backgroundColor: t.primary + '14' },
                ]}
              >
                <Text
                  style={[
                    styles.dayName,
                    { color: isToday ? t.primary : t.text },
                    isToday && { fontFamily: FONTS.semiBold, fontWeight: '600' },
                  ]}
                >
                  {dayLabel}
                </Text>
                <Text
                  style={[
                    styles.hoursText,
                    { color: isToday ? t.text : t.textMute },
                    isToday && { fontFamily: FONTS.semiBold, fontWeight: '600' },
                  ]}
                >
                  {hoursLabel}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { borderRadius: 14, borderWidth: 1, overflow: 'hidden' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  title: { fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 999,
  },
  chipOpen: { backgroundColor: 'rgba(34,197,94,0.12)' },
  chipClosed: { backgroundColor: 'rgba(239,68,68,0.10)' },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipDotOpen: { backgroundColor: '#22C55E' },
  chipDotClosed: { backgroundColor: '#EF4444' },
  chipText: { fontSize: 11, fontFamily: FONTS.semiBold, fontWeight: '600' },
  chipTextOpen: { color: '#16A34A' },
  chipTextClosed: { color: '#DC2626' },
  rows: { borderTopWidth: StyleSheet.hairlineWidth },
  dayRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  dayName: { fontSize: 13, fontFamily: FONTS.regular, fontWeight: '400' },
  hoursText: { fontSize: 13, fontFamily: FONTS.regular, fontWeight: '400' },
});
