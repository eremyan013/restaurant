import React, { useState } from 'react';
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  StatusBar,
  ActivityIndicator,
  RefreshControl,
  Platform,
} from 'react-native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';

import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from '../hooks/useTranslation';
import { useCategoryVenues } from '../hooks/useCategoryVenues';
import { Icon } from '../components/Icon';
import { ListCard } from '../components/ListCard';
import { ErrorState } from '../components/ErrorState';
import { FONTS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Category'>;
  route: RouteProp<RootStackParamList, 'Category'>;
};

export function CategoryScreen({ navigation, route }: Props) {
  const { sectionId, sectionName } = route.params;
  const { theme: t } = useStore();
  const insets = useSafeAreaInsets();
  const { trf } = useTranslation();
  const { favs, toggleFav } = useFavorites();
  const { venues, loading, error, retry } = useCategoryVenues(sectionId);
  const [refreshing, setRefreshing] = useState(false);

  // Stop pull-to-refresh spinner once the fetch completes
  React.useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading]);

  function onRefresh() {
    setRefreshing(true);
    retry();
  }

  if (loading && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }}>
        <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  if (error && !refreshing) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
        {/* Header even on error so user can go back */}
        <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: t.bg }]}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              navigation.goBack();
            }}
            style={styles.backBtn}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Icon name="chevL" size={22} color={t.text} strokeWidth={2} />
          </Pressable>
          <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>{sectionName}</Text>
          <View style={styles.backBtn} />
        </View>
        <ErrorState t={t} onRetry={retry} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />

      {/* Fixed header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: t.bg }]}>
        <Pressable
          onPress={() => {
            if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            navigation.goBack();
          }}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Go back"
        >
          <Icon name="chevL" size={22} color={t.text} strokeWidth={2} />
        </Pressable>
        <Text style={[styles.title, { color: t.text }]} numberOfLines={1}>{sectionName}</Text>
        {/* Spacer to keep title centered */}
        <View style={styles.backBtn} />
      </View>

      {/* Result count bar */}
      <View style={[styles.resultBar, { paddingHorizontal: 20 }]}>
        <Text style={[styles.resultCount, { color: t.textMute }]}>
          {trf('cat_venues_count', { n: venues.length })}
        </Text>
      </View>

      {/* Venue list */}
      <FlatList
        data={venues}
        keyExtractor={(v) => v.id}
        contentContainerStyle={[styles.list, { paddingBottom: 120 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={t.primary}
            colors={[t.primary]}
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon name="search" size={40} color={t.textFaint} />
            <Text style={[styles.emptyTitle, { color: t.text }]}>{sectionName}</Text>
          </View>
        }
        renderItem={({ item: v }) => (
          <ListCard
            venue={v}
            t={t}
            onOpen={() => navigation.navigate('Detail', { venueId: v.id })}
            onFav={() => toggleFav(v.id)}
            isFav={favs.has(v.id)}
          />
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 12,
    paddingBottom: 12,
    zIndex: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    flex: 1,
    fontSize: 17,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  resultBar: {
    marginBottom: 4,
  },
  resultCount: {
    fontSize: 13,
    fontFamily: FONTS.medium,
    fontWeight: '500',
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
  emptyTitle: {
    fontSize: 17,
    fontFamily: FONTS.bold,
    fontWeight: '700',
    marginTop: 4,
  },
});
