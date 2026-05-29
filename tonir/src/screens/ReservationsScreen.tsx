import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet, StatusBar, ActivityIndicator, RefreshControl, Alert, Platform,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { RootStackParamList, TabParamList } from '../navigation';
import { useStore } from '../store';
import { useVenues } from '../hooks/useVenues';
import { useReservations } from '../hooks/useReservations';
import { useProfile } from '../hooks/useProfile';
import { useTranslation } from '../hooks/useTranslation';
import { Icon } from '../components/Icon';
import { ErrorState } from '../components/ErrorState';
import { FONTS } from '../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Reservations'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function ReservationsScreen({ navigation }: { navigation: Nav }) {
  const { theme: t } = useStore();
  const insets = useSafeAreaInsets();
  const { tr, trf, language } = useTranslation();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const { venues } = useVenues();
  const { upcoming, past, loading, error, retry, cancel } = useReservations();
  const { profile } = useProfile();
  const [refreshing, setRefreshing] = useState(false);

  const statusLabels = useMemo(() => ({
    confirmed:  { label: tr('res_status_confirmed'),  color: '#1F4D3E' },
    pending:    { label: tr('res_status_pending'),    color: '#C9A961' },
    upcoming:   { label: tr('res_status_upcoming'),   color: '#1F4D3E' },
    visited:    { label: tr('res_status_visited'),    color: '#6B6B6B' },
    cancelled:  { label: tr('res_status_cancelled'),  color: '#9B2335' },
  }), [language]);

  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading]);

  function onRefresh() {
    setRefreshing(true);
    retry();
  }

  const reservations = tab === 'upcoming' ? upcoming : past;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} colors={[t.primary]} />
        }
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={[styles.title, { color: t.text }]}>{tr('res_title')}</Text>
          <Text style={[styles.stat, { color: t.textMute }]}>
            {trf('res_stat', {
              yel: (profile?.yel_points ?? 0).toLocaleString(),
              visits: profile?.total_visits ?? 0,
            })}
          </Text>
        </View>

        {/* Segment switcher */}
        <View style={[styles.switcher, { backgroundColor: `${t.primary}18` }]}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTab('upcoming');
            }}
            style={[styles.switchBtn, tab === 'upcoming' && [styles.switchBtnActive, { backgroundColor: t.primary }]]}
          >
            <Text style={[styles.switchText, { color: tab === 'upcoming' ? '#FBF5E8' : t.text }]}>
              {tr('res_tab_upcoming')} · {upcoming.length}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              setTab('past');
            }}
            style={[styles.switchBtn, tab === 'past' && [styles.switchBtnActive, { backgroundColor: t.primary }]]}
          >
            <Text style={[styles.switchText, { color: tab === 'past' ? '#FBF5E8' : t.text }]}>
              {tr('res_tab_past')} · {past.length}
            </Text>
          </Pressable>
        </View>

        {loading ? (
          <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} />
        ) : error ? (
          <ErrorState t={t} onRetry={retry} />
        ) : reservations.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="calendar" size={40} color={t.textFaint} />
            <Text style={[styles.emptyText, { color: t.textMute }]}>
              {tab === 'upcoming' ? tr('res_empty_upcoming') : tr('res_empty_past')}
            </Text>
          </View>
        ) : (
          <View style={styles.cards}>
            {reservations.map((res) => {
              const venue = venues.find((v) => v.id === res.venue_id);
              if (!venue) return null;
              const statusInfo = statusLabels[res.status as keyof typeof statusLabels] ?? statusLabels.upcoming;
              return (
                <Pressable
                  key={res.id}
                  onPress={() => navigation.navigate('Detail', { venueId: venue.id })}
                  style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}
                >
                  {/* Status badge */}
                  <View style={styles.cardTop}>
                    <View style={[styles.statusBadge, { backgroundColor: `${statusInfo.color}18` }]}>
                      <Text style={[styles.statusText, { color: statusInfo.color }]}>{statusInfo.label}</Text>
                    </View>
                  </View>

                  {/* Venue row */}
                  <View style={styles.cardVenue}>
                    <Image source={{ uri: venue.photo_url }} style={styles.venueThumb} />
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.venueName, { color: t.text }]}>{venue.name}</Text>
                      <View style={styles.metaRow}>
                        <Icon name="calendar" size={12} color={t.textMute} strokeWidth={2} />
                        <Text style={[styles.metaText, { color: t.textMute }]}>{res.date}</Text>
                        <Icon name="clock" size={12} color={t.textMute} strokeWidth={2} />
                        <Text style={[styles.metaText, { color: t.textMute }]}>{res.time}</Text>
                        <Icon name="users" size={12} color={t.textMute} strokeWidth={2} />
                        <Text style={[styles.metaText, { color: t.textMute }]}>{res.people}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={[styles.cardDivider, { borderColor: t.border }]} />

                  {/* Bottom row */}
                  <View style={styles.cardBottom}>
                    <Text style={[styles.perkText, { color: t.accent }]}>{res.yel_earned} Yel</Text>
                    <View style={styles.actions}>
                      <Pressable
                        onPress={() => {
                          if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                          navigation.navigate('Detail', { venueId: venue.id });
                        }}
                        style={[styles.actionBtn, { borderColor: t.border }]}
                      >
                        <Text style={[styles.actionText, { color: t.text }]}>
                          {tab === 'past' ? tr('res_action_rate') : tr('res_action_modify')}
                        </Text>
                      </Pressable>
                      {tab === 'upcoming' && (
                        <Pressable
                          onPress={() =>
                            Alert.alert(
                              tr('res_cancel_title'),
                              `${venue.name} · ${res.date} · ${res.time}`,
                              [
                                { text: tr('res_cancel_back'), style: 'cancel' },
                                {
                                  text: tr('res_action_cancel'),
                                  style: 'destructive',
                                  onPress: () => {
                                    if (Platform.OS !== 'web') Haptics.notificationAsync(
                                      Haptics.NotificationFeedbackType.Warning
                                    );
                                    cancel(res.id);
                                  },
                                },
                              ]
                            )
                          }
                          style={[styles.actionBtn, { borderColor: '#9B233540' }]}
                        >
                          <Text style={[styles.actionText, { color: '#9B2335' }]}>{tr('res_action_cancel')}</Text>
                        </Pressable>
                      )}
                    </View>
                  </View>
                </Pressable>
              );
            })}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: { marginBottom: 20, gap: 6 },
  title: { fontSize: 30, fontFamily: FONTS.extraBold, fontWeight: '800', letterSpacing: -0.6 },
  stat: { fontSize: 13 },
  switcher: {
    flexDirection: 'row',
    borderRadius: 999,
    padding: 4,
    marginBottom: 20,
  },
  switchBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 999,
    alignItems: 'center',
  },
  switchBtnActive: {},
  switchText: { fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 16,
  },
  emptyText: { fontSize: 15 },
  cards: { gap: 16 },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  cardTop: {
    padding: 14,
    paddingBottom: 8,
  },
  statusBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  statusText: { fontSize: 11.5, fontFamily: FONTS.semiBold, fontWeight: '600' },
  cardVenue: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  venueThumb: { width: 52, height: 52, borderRadius: 12 },
  venueName: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', marginBottom: 4 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  metaText: { fontSize: 12 },
  cardDivider: { borderBottomWidth: StyleSheet.hairlineWidth },
  cardBottom: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
  },
  perkText: { fontSize: 13, fontFamily: FONTS.bold, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  actionText: { fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },
});
