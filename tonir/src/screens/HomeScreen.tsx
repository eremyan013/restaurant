import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar, ActivityIndicator, RefreshControl,
  Modal, Platform, Image,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { RootStackParamList, TabParamList } from '../navigation';
import { useStore } from '../store';
import { useHomeSections } from '../hooks/useHomeSections';
import { useFavorites } from '../hooks/useFavorites';
import { useProfile } from '../hooks/useProfile';
import { Icon } from '../components/Icon';
import { SearchBar } from '../components/SearchBar';
import { SectionHeader } from '../components/SectionHeader';
import { Chip } from '../components/Chip';
import { HeroCard } from '../components/HeroCard';
import { GuideCard } from '../components/GuideCard';
import { ErrorState } from '../components/ErrorState';
import { FONTS } from '../theme';
import { LANG_FLAGS, LANGS } from '../i18n';
import { useTranslation } from '../hooks/useTranslation';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Home'>,
  NativeStackNavigationProp<RootStackParamList>
>;

export function HomeScreen({ navigation }: { navigation: Nav }) {
  const { theme: t, language, setLanguage } = useStore();
  const { tr } = useTranslation();
  const insets = useSafeAreaInsets();
  const { sections, loading, error, retry } = useHomeSections();
  const { favs, toggleFav } = useFavorites();
  const { profile } = useProfile();
  const [refreshing, setRefreshing] = useState(false);
  const [langOpen, setLangOpen] = useState(false);

  // Stop the pull-to-refresh spinner once the fetch completes
  useEffect(() => {
    if (!loading) setRefreshing(false);
  }, [loading]);

  function onRefresh() {
    setRefreshing(true);
    retry();
  }

  // Only show full-screen loader on the very first load, not on pull-to-refresh
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
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primary} colors={[t.primary]} />
        }
        contentContainerStyle={[
          styles.scroll,
          { paddingTop: insets.top + 12, paddingBottom: 120 },
        ]}
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.eyebrow, { color: t.primary }]}>{tr('eyebrow')}</Text>
            <Pressable style={styles.locationRow} onPress={() => navigation.navigate('Map', {})}>
              <Text style={[styles.location, { color: t.text }]}>{tr('location')}</Text>
              <Icon name="chevD" size={16} color={t.text} />
            </Pressable>
          </View>
          <View style={styles.headerRight}>
            <Pressable
              onPress={() => {
                if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setLangOpen((v) => !v);
              }}
              style={[styles.langBtn, { backgroundColor: t.surface, borderColor: t.border }]}
            >
              <Image source={{ uri: LANG_FLAGS[language] }} style={styles.langBtnFlag} />
            </Pressable>
            <Pressable
              onPress={() => navigation.navigate('Concierge')}
              style={styles.conciergeBtn}
            >
              <LinearGradient
                colors={[t.accent, t.primary]}
                style={styles.conciergeBtnGradient}
              >
                <Icon name="sparkle" size={18} color="#FBF5E8" strokeWidth={2} />
              </LinearGradient>
            </Pressable>
          </View>
        </View>

        {/* Search */}
        <View style={styles.section}>
          <SearchBar
            t={t}
            onFilters={() => navigation.navigate('Search')}
            onPress={() => navigation.navigate('Search')}
          />
        </View>

        {/* Quick filters */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.chipsRow}
        >
          <Chip label={tr('chip_tonight')} active t={t} onPress={() => navigation.navigate('Search')} />
          <Chip label={tr('chip_nearby')} t={t} onPress={() => navigation.navigate('Search')} />
          <Chip label={tr('chip_now')} t={t} onPress={() => navigation.navigate('Search')} />
        </ScrollView>

        {/* Heat map banner */}
        <View style={[styles.heatBanner, { backgroundColor: t.primaryDeep }]}>
          <View style={styles.heatLeft}>
            <View style={styles.barChart}>
              {[0.4, 0.6, 0.8, 1.0, 0.9, 0.7, 0.5].map((h, i) => (
                <View
                  key={i}
                  style={[
                    styles.bar,
                    {
                      height: h * 28,
                      backgroundColor: i === 3 ? t.accent : 'rgba(201,169,97,0.35)',
                    },
                  ]}
                />
              ))}
            </View>
            <Text style={styles.heatTitle}>{tr('heat_title')}</Text>
            <Text style={styles.heatSub}>{tr('heat_sub')}</Text>
          </View>
          <Pressable
            onPress={() => navigation.navigate('Map', {})}
            style={[styles.mapPill, { backgroundColor: t.accent }]}
          >
            <Icon name="map" size={13} color={t.primaryDeep} strokeWidth={2} />
            <Text style={[styles.mapPillText, { color: t.primaryDeep }]}>{tr('map')}</Text>
          </Pressable>
        </View>

        {/* Dynamic sections managed from the admin panel */}
        {sections.map((section) => (
          <View key={section.id} style={{ marginTop: 28 }}>
            <SectionHeader
              title={section.name}
              eyebrow={section.eyebrow}
              t={t}
              onAction={() => navigation.navigate('Search')}
            />
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12 }}
            >
              {section.home_section_items.map((item) =>
                item.item_type === 'guide' && item.guide ? (
                  <GuideCard
                    key={item.id}
                    guide={item.guide}
                    t={t}
                    onOpen={() => navigation.navigate('Search')}
                  />
                ) : item.venue ? (
                  <HeroCard
                    key={item.id}
                    venue={item.venue}
                    t={t}
                    onOpen={() => navigation.navigate('Detail', { venueId: item.venue!.id })}
                    onFav={() => toggleFav(item.venue!.id)}
                    isFav={favs.has(item.venue!.id)}
                  />
                ) : null
              )}
            </ScrollView>
          </View>
        ))}

        {/* Loyalty teaser */}
        <LinearGradient
          colors={[t.primary, t.primaryDeep]}
          style={[styles.loyaltyCard, { marginTop: 32 }]}
        >
          <View style={styles.loyaltyLeft}>
            <View style={[styles.giftTile, { backgroundColor: t.accent }]}>
              <Icon name="gift" size={20} color={t.primaryDeep} strokeWidth={2} />
            </View>
            <View>
              <Text style={styles.loyaltyLabel}>{tr('yel_label')}</Text>
              <Text style={styles.loyaltyPoints}>{(profile?.yel_points ?? 0).toLocaleString()} Yel</Text>
              <View style={styles.progressBar}>
                <View style={[styles.progressFill, { width: `${((profile?.yel_points ?? 0) % 1000) / 10}%`, backgroundColor: t.accent }]} />
              </View>
            </View>
          </View>
          <Pressable style={[styles.redeemBtn, { borderColor: 'rgba(251,245,232,0.3)' }]} onPress={() => navigation.navigate('Profile')}>
            <Text style={styles.redeemText}>{tr('redeem')}</Text>
          </Pressable>
        </LinearGradient>
      </ScrollView>

      {/* Language picker dropdown */}
      <Modal
        transparent
        visible={langOpen}
        animationType="fade"
        onRequestClose={() => setLangOpen(false)}
      >
        <Pressable style={styles.langBackdrop} onPress={() => setLangOpen(false)}>
          <View
            style={[
              styles.langDropdown,
              { top: insets.top + 62, right: 20, backgroundColor: t.surface, borderColor: t.border },
            ]}
          >
            {LANGS.map((l, i) => (
              <Pressable
                key={l}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setLanguage(l);
                  setLangOpen(false);
                }}
                style={[
                  styles.langOption,
                  language === l && { backgroundColor: `${t.primary}18` },
                  i < LANGS.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border },
                ]}
              >
                <Image source={{ uri: LANG_FLAGS[l] }} style={styles.langOptionFlag} />
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { gap: 0 },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  eyebrow: {
    fontSize: 10.5,
    fontFamily: FONTS.semiBold, fontWeight: '600',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  location: {
    fontSize: 22,
    fontFamily: FONTS.bold, fontWeight: '700',
    letterSpacing: -0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  langBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langBtnFlag: {
    width: 24,
    height: 16,
    borderRadius: 2,
  },
  langBackdrop: {
    flex: 1,
  },
  langDropdown: {
    position: 'absolute',
    borderRadius: 14,
    borderWidth: 1,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  langOption: {
    width: 52,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  langOptionFlag: {
    width: 32,
    height: 22,
    borderRadius: 3,
  },
  conciergeBtn: {
    position: 'relative',
  },
  conciergeBtnGradient: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  chipsRow: {
    paddingHorizontal: 20,
    gap: 8,
    paddingBottom: 4,
    marginBottom: 20,
  },
  heatBanner: {
    marginHorizontal: 20,
    borderRadius: 18,
    padding: 16,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heatLeft: {
    flex: 1,
    gap: 4,
  },
  barChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 3,
    height: 32,
    marginBottom: 6,
  },
  bar: {
    width: 6,
    borderRadius: 3,
  },
  heatTitle: {
    color: '#FBF5E8',
    fontSize: 13,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  heatSub: {
    color: 'rgba(251,245,232,0.65)',
    fontSize: 11.5,
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    marginLeft: 12,
  },
  mapPillText: {
    fontSize: 12,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  loyaltyCard: {
    marginHorizontal: 20,
    borderRadius: 22,
    padding: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  loyaltyLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  giftTile: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loyaltyLabel: {
    color: 'rgba(251,245,232,0.7)',
    fontSize: 11,
    fontFamily: FONTS.medium, fontWeight: '500',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  loyaltyPoints: {
    color: '#FBF5E8',
    fontSize: 18,
    fontFamily: FONTS.extraBold, fontWeight: '800',
    letterSpacing: -0.4,
    marginTop: 1,
  },
  progressBar: {
    width: 100,
    height: 4,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 2,
    marginTop: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  redeemBtn: {
    borderWidth: 1,
    borderRadius: 999,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  redeemText: {
    color: '#FBF5E8',
    fontSize: 13,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
});
