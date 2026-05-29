import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet, StatusBar, Dimensions, ActivityIndicator, Share, Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RouteProp } from '@react-navigation/native';

import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { useVenues, useVenue } from '../hooks/useVenues';
import { useMenu } from '../hooks/useMenu';
import { useFavorites } from '../hooks/useFavorites';
import { useTranslation } from '../hooks/useTranslation';
import { Icon } from '../components/Icon';
import { Stars } from '../components/Stars';
import { TimePill } from '../components/TimePill';
import { HeatDot } from '../components/HeatDot';
import { HeroCard } from '../components/HeroCard';
import { ErrorState } from '../components/ErrorState';
import { FONTS } from '../theme';

type Props = {
  navigation: NativeStackNavigationProp<RootStackParamList, 'Detail'>;
  route: RouteProp<RootStackParamList, 'Detail'>;
};

const { width: W } = Dimensions.get('window');
const PHOTO_H = 320;

export function DetailScreen({ navigation, route }: Props) {
  const { venueId } = route.params;
  const { theme: t } = useStore();
  const { tr, tra } = useTranslation();
  const { favs, toggleFav } = useFavorites();
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(0);
  const [selectedTime, setSelectedTime] = useState<string | null>(null);
  const [people, setPeople] = useState(2);
  const [showAllTimes, setShowAllTimes] = useState(false);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);

  const TABS = tra('det_tabs');

  const { venue, loading, error, retry } = useVenue(venueId);
  const { venues: allVenues } = useVenues();
  const { categories: menuCats, items: menuItems, loading: menuLoading } = useMenu(venueId);
  const similar = allVenues.filter((v) => v.id !== venueId && venue && v.kind === venue.kind).slice(0, 4);

  async function shareVenue() {
    if (!venue) return;
    try {
      await Share.share({
        title: venue.name,
        message: venue.name + ' · ' + venue.cuisine + ' · ' + venue.area,
      });
    } catch { /* user dismissed */ }
  }

  if (loading) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: t.bg }}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  if (error || !venue) {
    return (
      <View style={{ flex: 1, backgroundColor: t.bg }}>
        <ErrorState t={t} onRetry={retry} />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle="light-content" />
      <ScrollView showsVerticalScrollIndicator={false} stickyHeaderIndices={[2]}>
        {/* Photo header */}
        <View style={{ height: PHOTO_H, position: 'relative' }}>
          <Image source={{ uri: venue.photo_url }} style={StyleSheet.absoluteFillObject} />
          <LinearGradient
            colors={['rgba(0,0,0,0.35)', 'transparent', 'rgba(0,0,0,0.5)']}
            locations={[0, 0.4, 1]}
            style={StyleSheet.absoluteFillObject}
          />
          {/* Back / Share / Heart */}
          <View style={[styles.photoControls, { top: insets.top + 10 }]}>
            <Pressable onPress={() => navigation.goBack()} style={styles.glassBtn}>
              <Icon name="chevL" size={20} color="#fff" />
            </Pressable>
            <View style={styles.rightBtns}>
              <Pressable onPress={shareVenue} style={styles.glassBtn}>
                <Icon name="share" size={18} color="#fff" />
              </Pressable>
              <Pressable
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  toggleFav(venue.id);
                }}
                style={styles.glassBtn}
              >
                <Icon
                  name={favs.has(venue.id) ? 'heartFill' : 'heart'}
                  size={18}
                  color={favs.has(venue.id) ? t.pop : '#fff'}
                />
              </Pressable>
            </View>
          </View>
        </View>

        {/* Title sheet */}
        <View style={[styles.titleSheet, { backgroundColor: t.bg, marginTop: -32 }]}>
          <Text style={[styles.priceCuisine, { color: t.textMute }]}>
            {venue.price} · {venue.cuisine} · {venue.area}
          </Text>
          <View style={styles.nameRow}>
            <Text style={[styles.name, { color: t.text }]}>{venue.name}</Text>
            <Pressable
              onPress={() => navigation.navigate('Map', { focusVenueId: venue.id, fromDetail: true })}
              style={[styles.mapPill, { backgroundColor: t.bgAlt }]}
            >
              <Icon name="map" size={12} color={t.primary} strokeWidth={2} />
              <Text style={[styles.mapPillText, { color: t.primary }]}>{tr('det_map')}</Text>
            </Pressable>
          </View>
          <View style={styles.metaRow}>
            <Stars rating={venue.rating} reviews={venue.reviews_count} t={t} size={13} />
            <Text style={[styles.dot, { color: t.textFaint }]}>·</Text>
            <Icon name="pin" size={13} color={t.textMute} />
            <Text style={[styles.metaText, { color: t.textMute }]}>{venue.distance_km}</Text>
            <Text style={[styles.dot, { color: t.textFaint }]}>·</Text>
            <Text style={[styles.metaText, { color: t.textMute }]}>{tr('det_open_until')}</Text>
          </View>
          {/* Heat info */}
          <View style={[styles.heatCard, { backgroundColor: t.bgAlt, borderColor: t.border }]}>
            <HeatDot level={venue.heat} t={t} withLabel size={8} />
            <Text style={[styles.heatText, { color: t.text }]}>
              <Text style={{ fontFamily: FONTS.bold, fontWeight: '700' }}>{venue.booked_today}</Text> {tr('det_booked_today')}
            </Text>
          </View>
          {/* Tags */}
          <View style={styles.tagsRow}>
            {venue.tags.map((tag) => (
              <View key={tag} style={[styles.tag, { backgroundColor: t.bgAlt, borderColor: t.border }]}>
                <Text style={[styles.tagText, { color: t.textMute }]}>{tag}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Booking widget */}
        <View style={[styles.bookingWidget, { backgroundColor: t.primaryDeep, marginHorizontal: 20 }]}>
          <View style={styles.bookingHeader}>
            <Text style={styles.bookingTitle}>{tr('det_book_table')}</Text>
            <View style={[styles.partyPill, { backgroundColor: 'rgba(251,245,232,0.12)' }]}>
              <Pressable onPress={() => setPeople((p) => Math.max(1, p - 1))} hitSlop={8}>
                <Icon name="minus" size={12} color="#FBF5E8" strokeWidth={2.5} />
              </Pressable>
              <Icon name="users" size={13} color="#FBF5E8" strokeWidth={2} />
              <Text style={styles.partyText}>
                {people}{selectedTime ? ` · ${selectedTime}` : ''}
              </Text>
              <Pressable onPress={() => setPeople((p) => Math.min(20, p + 1))} hitSlop={8}>
                <Icon name="plus" size={12} color="#FBF5E8" strokeWidth={2.5} />
              </Pressable>
            </View>
          </View>
          <View style={styles.timeGrid}>
            {(showAllTimes ? venue.times : venue.times.slice(0, 4)).map((time, i) => (
              <TimePill
                key={time}
                time={time}
                t={t}
                size="md"
                dark
                active={selectedTime === time}
                perk={i < 2 ? venue.perk : undefined}
                onPress={() => {
                  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  setSelectedTime(time);
                }}
              />
            ))}
          </View>
          {venue.times.length > 4 && (
            <Pressable onPress={() => setShowAllTimes((v) => !v)} style={styles.moreTimesBtn}>
              <Text style={styles.moreTimesText}>
                {showAllTimes ? tr('det_show_less') : tr('det_show_more')}
              </Text>
              <View style={{ transform: [{ rotate: showAllTimes ? '180deg' : '0deg' }] }}>
                <Icon name="chevD" size={14} color="rgba(251,245,232,0.7)" />
              </View>
            </Pressable>
          )}
        </View>

        {/* Group split CTA */}
        <Pressable onPress={shareVenue} style={[styles.splitCard, { backgroundColor: t.surface, borderColor: t.border, marginHorizontal: 20, marginTop: 12 }]}>
          <View style={[styles.splitIcon, { backgroundColor: t.bgAlt }]}>
            <Icon name="split" size={20} color={t.primary} strokeWidth={2} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.splitTitle, { color: t.text }]}>{tr('det_group_title')}</Text>
            <Text style={[styles.splitSub, { color: t.textMute }]}>{tr('det_group_sub')}</Text>
          </View>
          <Icon name="chevR" size={18} color={t.textFaint} />
        </Pressable>

        {/* Sticky tabs */}
        <View style={[styles.tabsBar, { backgroundColor: t.bg, borderBottomColor: t.border }]}>
          {TABS.map((tab, i) => (
            <Pressable
              key={tab}
              onPress={() => setActiveTab(i)}
              style={[styles.tabBtn, activeTab === i && [styles.tabBtnActive, { borderBottomColor: t.primary }]]}
            >
              <Text style={[styles.tabLabel, { color: activeTab === i ? t.primary : t.textMute }]}>
                {tab}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab content */}
        <View style={styles.tabContent}>
          {activeTab === 0 && (
            <View style={{ gap: 16 }}>
              <Text style={[styles.description, { color: t.text }]}>{venue.description}</Text>
              <View style={styles.factsGrid}>
                {[
                  [tr('det_fact_reservation'), tr('det_fact_confirmed')],
                  [tr('det_fact_cuisine'), venue.cuisine],
                  [tr('det_fact_price'), venue.price],
                  [tr('det_fact_distance'), venue.distance_km],
                ].map(([label, value]) => (
                  <View key={label} style={[styles.factItem, { borderColor: t.border }]}>
                    <Text style={[styles.factLabel, { color: t.textMute }]}>{label}</Text>
                    <Text style={[styles.factValue, { color: t.text }]}>{value}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
          {activeTab === 1 && (
            <View style={{ gap: 12, marginTop: 4 }}>
              {menuLoading ? (
                <ActivityIndicator color={t.primary} style={{ marginTop: 32 }} />
              ) : menuCats.length === 0 ? (
                <View style={[styles.comingSoonCard, { backgroundColor: t.bgAlt, borderColor: t.border }]}>
                  <Icon name="spark" size={32} color={t.textFaint} strokeWidth={1.5} />
                  <Text style={[styles.comingSoonSub, { color: t.textMute }]}>{tr('det_menu_empty')}</Text>
                </View>
              ) : (
                <>
                  {/* Category filter pills */}
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={{ gap: 8, paddingRight: 4 }}
                  >
                    {[null, ...menuCats].map(cat => {
                      const active = selectedCatId === (cat?.id ?? null);
                      return (
                        <Pressable
                          key={cat?.id ?? '__all'}
                          onPress={() => setSelectedCatId(cat?.id ?? null)}
                          style={[
                            styles.catPill,
                            { borderColor: t.border, backgroundColor: active ? t.primary : t.bgAlt },
                          ]}
                        >
                          <Text style={[styles.catPillText, { color: active ? '#fff' : t.textMute }]}>
                            {cat ? cat.name : tr('det_menu_all')}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </ScrollView>

                  {/* Menu items */}
                  {menuItems
                    .filter(item => selectedCatId === null || item.category_id === selectedCatId)
                    .map(item => (
                      <View
                        key={item.id}
                        style={[
                          styles.menuItem,
                          { backgroundColor: t.bgAlt, borderColor: t.border, opacity: item.is_available ? 1 : 0.5 },
                        ]}
                      >
                        {item.photo_url ? (
                          <Image
                            source={{ uri: item.photo_url }}
                            style={styles.menuItemPhoto}
                          />
                        ) : null}
                        <View style={{ flex: 1, gap: 3 }}>
                          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                            <Text style={[styles.menuItemName, { color: t.text }]}>{item.name}</Text>
                            {item.is_popular && (
                              <View style={styles.popularBadge}>
                                <Text style={styles.popularBadgeText}>{tr('det_menu_popular')}</Text>
                              </View>
                            )}
                            {!item.is_available && (
                              <View style={[styles.unavailableBadge, { borderColor: t.border }]}>
                                <Text style={[styles.unavailableBadgeText, { color: t.textMute }]}>{tr('det_menu_unavailable')}</Text>
                              </View>
                            )}
                          </View>
                          {item.description ? (
                            <Text style={[styles.menuItemDesc, { color: t.textMute }]} numberOfLines={2}>
                              {item.description}
                            </Text>
                          ) : null}
                        </View>
                        <Text style={[styles.menuItemPrice, { color: t.primary }]}>
                          {item.price.toLocaleString()} ֏
                        </Text>
                      </View>
                    ))
                  }
                </>
              )}
            </View>
          )}
          {activeTab === 2 && (
            <View style={{ gap: 16 }}>
              <View style={[styles.reviewSummary, { backgroundColor: t.bgAlt, borderColor: t.border }]}>
                <Text style={[styles.reviewRatingBig, { color: t.text }]}>{venue.rating.toFixed(1)}</Text>
                <Stars rating={venue.rating} t={t} size={18} compact />
                <Text style={[styles.reviewCountText, { color: t.textMute }]}>{venue.reviews_count.toLocaleString()} {tr('det_reviews_suffix')}</Text>
              </View>
              <View style={[styles.comingSoonCard, { backgroundColor: t.bgAlt, borderColor: t.border }]}>
                <Icon name="chat" size={28} color={t.textFaint} strokeWidth={1.5} />
                <Text style={[styles.comingSoonSub, { color: t.textMute }]}>{tr('det_reviews_soon')}</Text>
              </View>
            </View>
          )}
          {activeTab === 3 && (
            <View style={[styles.comingSoonCard, { backgroundColor: t.bgAlt, borderColor: t.border }]}>
              <Icon name="sparkle" size={32} color={t.textFaint} strokeWidth={1.5} />
              <Text style={[styles.comingSoonTitle, { color: t.text }]}>{tr('det_photos_soon_title')}</Text>
              <Text style={[styles.comingSoonSub, { color: t.textMute }]}>{tr('det_photos_soon_sub')}</Text>
            </View>
          )}
        </View>

        {/* Similar venues */}
        {similar.length > 0 && (
          <View style={{ marginTop: 28, marginBottom: 120 }}>
            <Text style={[styles.similarTitle, { color: t.text, paddingHorizontal: 20 }]}>{tr('det_similar')}</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 20, gap: 12, marginTop: 14 }}
            >
              {similar.map((v) => (
                <HeroCard
                  key={v.id}
                  venue={v}
                  t={t}
                  onOpen={() => navigation.push('Detail', { venueId: v.id })}
                  onFav={() => toggleFav(v.id)}
                  isFav={favs.has(v.id)}
                />
              ))}
            </ScrollView>
          </View>
        )}
      </ScrollView>

      {/* Sticky book button */}
      {selectedTime && (
        <View style={[styles.stickyBook, { paddingBottom: insets.bottom + 8, backgroundColor: t.bg }]}>
          <Pressable
            onPress={() => {
              if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              navigation.navigate('Booking', { venueId: venue.id, time: selectedTime ?? undefined, people });
            }}
            style={[styles.bookBtn, { backgroundColor: t.primary }]}
          >
            <Text style={styles.bookBtnText}>{tr('det_book_btn')} · {people} {tr('det_people_unit')} · {selectedTime}</Text>
            <Icon name="arrow" size={18} color="#FBF5E8" strokeWidth={2} />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  photoControls: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  glassBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.18)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rightBtns: {
    flexDirection: 'row',
    gap: 8,
  },
  titleSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 22,
    paddingHorizontal: 20,
    gap: 8,
  },
  priceCuisine: {
    fontSize: 12,
    fontFamily: FONTS.medium, fontWeight: '500',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  name: {
    fontSize: 28,
    fontFamily: FONTS.extraBold, fontWeight: '800',
    letterSpacing: -0.5,
    flex: 1,
  },
  mapPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  mapPillText: {
    fontSize: 12,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: { fontSize: 13 },
  dot: { fontSize: 13 },
  heatCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
    marginTop: 4,
  },
  heatText: { fontSize: 13 },
  tagsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 4 },
  tag: {
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  tagText: { fontSize: 12, fontFamily: FONTS.medium, fontWeight: '500' },
  bookingWidget: {
    borderRadius: 20,
    padding: 18,
    gap: 14,
    marginTop: 16,
  },
  bookingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bookingTitle: {
    color: '#FBF5E8',
    fontSize: 15,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
  partyPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  partyText: {
    color: '#FBF5E8',
    fontSize: 13,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  timeGrid: {
    flexDirection: 'row',
    gap: 8,
  },
  moreTimesBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    paddingTop: 4,
  },
  moreTimesText: {
    color: 'rgba(251,245,232,0.7)',
    fontSize: 13,
    fontFamily: FONTS.medium, fontWeight: '500',
  },
  splitCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
  },
  splitIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  splitTitle: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700' },
  splitSub: { fontSize: 12, marginTop: 2 },
  tabsBar: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    marginTop: 20,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabBtnActive: {
    borderBottomWidth: 2,
  },
  tabLabel: {
    fontSize: 13,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  tabContent: {
    padding: 20,
    minHeight: 150,
  },
  description: {
    fontSize: 14,
    lineHeight: 22,
  },
  factsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    borderRadius: 14,
    overflow: 'hidden',
  },
  factItem: {
    width: '50%',
    padding: 14,
    borderWidth: 0.5,
    gap: 3,
  },
  factLabel: { fontSize: 11, fontFamily: FONTS.medium, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  factValue: { fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600' },
  placeholder: { fontSize: 14, textAlign: 'center', marginTop: 32 },
  comingSoonCard: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 32,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 8,
  },
  comingSoonTitle: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700' },
  comingSoonSub: { fontSize: 13, textAlign: 'center' },
  catPill: {
    paddingVertical: 7,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
  },
  catPillText: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500' },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  menuItemPhoto: {
    width: 56,
    height: 56,
    borderRadius: 10,
    flexShrink: 0,
    backgroundColor: '#f4f4f5',
  },
  menuItemName: { fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600', flex: 1 },
  menuItemDesc: { fontSize: 12, lineHeight: 18 },
  menuItemPrice: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', flexShrink: 0 },
  popularBadge: {
    backgroundColor: '#FBBF24',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  popularBadgeText: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', color: '#fff' },
  unavailableBadge: {
    borderWidth: 1,
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 6,
  },
  unavailableBadgeText: { fontSize: 10, fontFamily: FONTS.medium, fontWeight: '500' },
  reviewSummary: {
    alignItems: 'center',
    gap: 8,
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
  },
  reviewRatingBig: { fontSize: 48, fontFamily: FONTS.extraBold, fontWeight: '800', letterSpacing: -2 },
  reviewCountText: { fontSize: 13 },
  similarTitle: { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: -0.3 },
  stickyBook: {
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  bookBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
  },
  bookBtnText: {
    color: '#FBF5E8',
    fontSize: 15,
    fontFamily: FONTS.bold, fontWeight: '700',
  },
});
