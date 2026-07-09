import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet, StatusBar, RefreshControl, Platform, ActivityIndicator,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { RootStackParamList, TabParamList } from '../navigation';
import { useStore } from '../store';
import { useVenues } from '../hooks/useVenues';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from '../hooks/useTranslation';
import { Icon } from '../components/Icon';
import { HeatDot } from '../components/HeatDot';
import { FONTS } from '../theme';
import { VenueRow } from '../lib/database.types';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Favorites'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Language-independent list identifiers
const LIST_KEYS = ['all', 'try', 'romantic', 'group'] as const;
type ListKey = typeof LIST_KEYS[number];

// Tag strings stored in the DB — centralised so a rename is a one-line change.
const ROMANTIC_TAGS = ['romantic', 'wine', 'fine-dining', 'intimate'] as const;
const GROUP_TAGS    = ['group', 'family', 'large-party'] as const;

const LIST_FILTER: Record<ListKey, (v: VenueRow) => boolean> = {
  all:      () => true,
  try:      (v) => v.kind === 'restaurant',
  romantic: (v) =>
    v.kind === 'lounge' ||
    v.tags.some((tag) => (ROMANTIC_TAGS as readonly string[]).includes(tag)),
  group:    (v) =>
    v.kind === 'club' ||
    v.tags.some((tag) => (GROUP_TAGS as readonly string[]).includes(tag)),
};

export function FavoritesScreen({ navigation }: { navigation: Nav }) {
  const { theme: t } = useStore();
  const insets = useSafeAreaInsets();
  const { tr, tra, trf } = useTranslation();
  const [activeList, setActiveList] = useState<ListKey>('all');

  const { venues, loading: venuesLoading, retry: retryVenues } = useVenues();
  const { favs, loading: favsLoading, toggleFav, retry: retryFavs } = useFavorites();
  const [refreshing, setRefreshing] = useState(false);
  const isLoading = (venuesLoading || favsLoading) && !refreshing;

  const LISTS = tra('fav_lists');

  useEffect(() => {
    if (!venuesLoading && !favsLoading) setRefreshing(false);
  }, [venuesLoading, favsLoading]);

  function onRefresh() {
    setRefreshing(true);
    retryVenues();
    retryFavs();
  }

  const favVenues = venues
    .filter((v) => favs.has(v.id))
    .filter(LIST_FILTER[activeList] ?? (() => true));

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
          <Text style={[styles.title, { color: t.text }]}>{tr('fav_title')}</Text>
          <Pressable
            onPress={() => navigation.navigate('Search')}
            style={[styles.addBtn, { backgroundColor: t.bgAlt, borderColor: t.border }]}
          >
            <Icon name="plus" size={18} color={t.text} strokeWidth={2} />
          </Pressable>
        </View>

        {/* Lists rail */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
          style={{ marginBottom: 20 }}
        >
          {LIST_KEYS.map((key, idx) => (
            <Pressable
              key={key}
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveList(key);
              }}
              style={[
                styles.chip,
                {
                  backgroundColor: activeList === key ? t.primary : t.surface,
                  borderColor: activeList === key ? t.primary : t.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: activeList === key ? '#FBF5E8' : t.text }]}>
                {LISTS[idx] ?? key}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        {/* List */}
        {isLoading ? (
          <ActivityIndicator color={t.primary} style={{ marginTop: 40 }} />
        ) : favVenues.length === 0 ? (
          <View style={styles.empty}>
            <Icon name="heart" size={40} color={t.textFaint} />
            <Text style={[styles.emptyText, { color: t.textMute }]}>
              {activeList === 'all'
                ? tr('fav_empty_all')
                : trf('fav_empty_list', { list: LISTS[LIST_KEYS.indexOf(activeList)] ?? activeList })}
            </Text>
          </View>
        ) : (
          <View style={styles.list}>
            {favVenues.map((venue) => (
              <Pressable
                key={venue.id}
                onPress={() => navigation.navigate('Detail', { venueId: venue.id })}
                style={[styles.item, { borderBottomColor: t.border }]}
              >
                <Image source={{ uri: venue.dish_url }} style={styles.thumb} />
                <View style={styles.itemInfo}>
                  <View style={styles.itemNameRow}>
                    <Text style={[styles.itemName, { color: t.text }]}>{venue.name}</Text>
                    <HeatDot level={venue.heat} t={t} size={7} />
                  </View>
                  <Text style={[styles.itemArea, { color: t.textMute }]}>{venue.area}</Text>
                  <View style={styles.itemMeta}>
                    <Text style={[styles.itemPrice, { color: t.textMute }]}>
                      {venue.price}
                    </Text>
                    <Text style={[styles.itemPerk, { color: t.accent }]}>+{venue.perk} Yel</Text>
                  </View>
                </View>
                <Pressable
                  hitSlop={10}
                  onPress={() => {
                    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    toggleFav(venue.id);
                  }}
                >
                  <Icon name="heartFill" size={20} color={t.accent} />
                </Pressable>
              </Pressable>
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: { fontSize: 30, fontFamily: FONTS.extraBold, fontWeight: '800', letterSpacing: -0.6 },
  addBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipsRow: { gap: 8 },
  chip: {
    paddingVertical: 7,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500' },
  empty: {
    alignItems: 'center',
    paddingTop: 60,
    gap: 16,
  },
  emptyText: { fontSize: 15 },
  list: { gap: 0 },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
  },
  thumb: {
    width: 60,
    height: 60,
    borderRadius: 12,
    flexShrink: 0,
  },
  itemInfo: { flex: 1, gap: 3 },
  itemNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemName: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
  itemArea: { fontSize: 12 },
  itemMeta: { flexDirection: 'row', gap: 10, marginTop: 2 },
  itemPrice: { fontSize: 12 },
  itemPerk: { fontSize: 12, fontFamily: FONTS.semiBold, fontWeight: '600' },
});
