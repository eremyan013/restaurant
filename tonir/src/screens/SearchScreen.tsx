import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';

import { RootStackParamList, TabParamList } from '../navigation';
import { useStore } from '../store';
import { useVenues } from '../hooks/useVenues';
import { useFavorites } from '../hooks/useFavorites';
import { useLocation } from '../hooks/useLocation';
import { useTranslation } from '../hooks/useTranslation';
import { haversineKm, formatDistance, parseDistanceToKm } from '../lib/distance';
import { transliterate } from '../lib/transliterate';
import { SearchBar } from '../components/SearchBar';
import { Chip } from '../components/Chip';
import { ListCard } from '../components/ListCard';
import { Icon } from '../components/Icon';
import { ErrorState } from '../components/ErrorState';
import { FONTS } from '../theme';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Search'>,
  NativeStackNavigationProp<RootStackParamList>
>;

// Internal filter identifiers — language-independent
const FILTER_IDS = ['all', 'best', 'tonight', 'nearby', 'wine', 'armenian'] as const;
type FilterId = typeof FILTER_IDS[number];

export function SearchScreen({ navigation }: { navigation: Nav }) {
  const { theme: t } = useStore();
  const insets = useSafeAreaInsets();
  const { venues, loading, error, retry } = useVenues();
  const { favs, toggleFav } = useFavorites();
  const userLocation = useLocation();
  const { tr, tra, trf } = useTranslation();
  const [query, setQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterId>('all');
  const [refreshing, setRefreshing] = useState(false);
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const FILTERS = tra('srch_filters');

  // Enrich each venue with a live-calculated distance string when GPS is available
  const venuesWithDist = useMemo(() => {
    if (!userLocation) return venues;
    return venues.map((v) => ({
      ...v,
      distance_km: formatDistance(
        haversineKm(userLocation.lat, userLocation.lng, v.coord_y, v.coord_x)
      ),
    }));
  }, [venues, userLocation]);

  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading]);

  useEffect(() => {
    if (debounceTimer.current) clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => setDebouncedQuery(query), 300);
    return () => {
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
    };
  }, [query]);

  function onRefresh() {
    setRefreshing(true);
    retry();
  }

  const filtered = useMemo(() => {
    let list = [...venuesWithDist];
    if (debouncedQuery) {
      const q = debouncedQuery.toLowerCase();
      list = list.filter((v) => {
        if (
          v.name.toLowerCase().includes(q) ||
          v.cuisine.toLowerCase().includes(q) ||
          v.area.toLowerCase().includes(q)
        ) return true;
        const nameVariants = [v.name_hy, v.name_ru, v.name_en].filter(Boolean) as string[];
        return nameVariants.some((n) => transliterate(n).includes(q));
      });
    }
    if (activeFilter === 'tonight') list = list.filter((v) => v.heat !== 'low');
    if (activeFilter === 'best') list = list.sort((a, b) => b.rating - a.rating);
    if (activeFilter === 'nearby' && userLocation) {
      list = list.sort((a, b) =>
        haversineKm(userLocation.lat, userLocation.lng, a.coord_y, a.coord_x) -
        haversineKm(userLocation.lat, userLocation.lng, b.coord_y, b.coord_x)
      );
    }
    if (activeFilter === 'wine') list = list.filter((v) => v.kind === 'bar');
    if (activeFilter === 'armenian') list = list.filter((v) => v.cuisine.includes('Հայկ'));
    return list;
  }, [debouncedQuery, activeFilter, venuesWithDist, userLocation]);

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ErrorState t={t} onRetry={retry} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />

      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: t.bg }]}>
        <SearchBar
          t={t}
          value={query}
          onChange={setQuery}
          placeholder={tr('srch_placeholder')}
        />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chips}
          style={{ marginTop: 12 }}
        >
          {FILTER_IDS.map((id, idx) => (
            <Chip
              key={id}
              label={FILTERS[idx] ?? id}
              active={activeFilter === id}
              t={t}
              onPress={() => setActiveFilter(id)}
              accessibilityRole="button"
              accessibilityLabel={FILTERS[idx] ?? id}
              accessibilityState={{ selected: activeFilter === id }}
            />
          ))}
        </ScrollView>
        <View style={styles.resultBar}>
          <Text style={[styles.resultCount, { color: t.textMute }]}>
            {trf('srch_venues_count', { n: filtered.length })}
          </Text>
          <Pressable
            onPress={() => navigation.navigate('Map', {})}
            style={styles.mapLink}
            accessibilityRole="button"
            accessibilityLabel={tr('srch_map')}
          >
            <Icon name="map" size={14} color={t.primary} strokeWidth={2} />
            <Text style={[styles.mapLinkText, { color: t.primary }]}>{tr('srch_map')}</Text>
          </Pressable>
        </View>
      </View>

      {/* List */}
      <ScrollView
        contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} colors={[t.primary]} />
        }
      >
        {activeFilter === 'nearby' && !userLocation && (
          <View style={[styles.locationBanner, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Icon name="pin" size={16} color={t.textMute} />
            <Text style={[styles.locationBannerText, { color: t.textMute }]}>
              {tr('srch_nearby_no_location')}
            </Text>
          </View>
        )}
        {filtered.length === 0 ? (
          <View style={styles.emptyState}>
            <Icon name="search" size={40} color={t.textFaint} />
            <Text style={[styles.emptyTitle, { color: t.text }]}>{tr('srch_empty_title')}</Text>
            <Text style={[styles.emptySub, { color: t.textMute }]}>
              {query
                ? trf('srch_empty_sub_query', { q: query })
                : tr('srch_empty_sub_default')}
            </Text>
            {activeFilter !== 'all' && (
              <Pressable
                onPress={() => setActiveFilter('all')}
                style={[styles.emptyBtn, { backgroundColor: t.primary }]}
              >
                <Text style={styles.emptyBtnText}>{tr('srch_clear')}</Text>
              </Pressable>
            )}
          </View>
        ) : (
          filtered.map((v) => (
            <ListCard
              key={v.id}
              venue={v}
              t={t}
              onOpen={() => navigation.navigate('Detail', { venueId: v.id })}
              onFav={() => toggleFav(v.id)}
              isFav={favs.has(v.id)}
            />
          ))
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    paddingBottom: 8,
    zIndex: 10,
  },
  chips: {
    gap: 8,
  },
  resultBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 12,
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 13,
    fontFamily: FONTS.medium, fontWeight: '500',
  },
  mapLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  mapLinkText: {
    fontSize: 13,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  list: {
    paddingHorizontal: 20,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 60,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyTitle: { fontSize: 17, fontFamily: FONTS.bold, fontWeight: '700', marginTop: 4 },
  emptySub: { fontSize: 14, textAlign: 'center', lineHeight: 20 },
  emptyBtn: {
    marginTop: 8,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 999,
  },
  emptyBtnText: { color: '#FBF5E8', fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600' },
  locationBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  locationBannerText: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    fontWeight: '500',
    flex: 1,
  },
});
