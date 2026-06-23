import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar,
  ActivityIndicator, Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';

import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { useProfile } from '../hooks/useProfile';
import { useTranslation } from '../hooks/useTranslation';
import { fetchUserPrizes, UserPrize } from '../lib/api';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'MyPrizes'> };

const TYPE_ICONS: Record<string, string> = {
  discount: '🏷️', free_item: '🎁', experience: '⭐', voucher: '🎟️',
};

const haptic = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

export function MyPrizesScreen({ navigation }: Props) {
  const { theme: t } = useStore();
  const insets = useSafeAreaInsets();
  const { profile } = useProfile();
  const { tr } = useTranslation();

  const [prizes, setPrizes] = useState<UserPrize[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'active' | 'used' | 'all'>('active');

  useFocusEffect(
    useCallback(() => {
      if (!profile?.id) return;
      setLoading(true);
      fetchUserPrizes(profile.id)
        .then(setPrizes)
        .catch(() => {})
        .finally(() => setLoading(false));
    }, [profile?.id]),
  );

  const filtered = useMemo(() => {
    if (tab === 'all') return prizes;
    return prizes.filter(p => p.status === tab);
  }, [prizes, tab]);

  const emptyKey = tab === 'active' ? 'prizes_empty_active' : tab === 'used' ? 'prizes_empty_used' : 'prizes_empty_all';

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <Pressable onPress={() => { haptic(); navigation.goBack(); }} hitSlop={12}>
          <Icon name="chevL" size={22} color={t.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.text }]}>{tr('prizes_title')}</Text>
        <View style={{ width: 22 }} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: t.surface, borderBottomColor: t.border }]}>
        {(['active', 'used', 'all'] as const).map(key => (
          <Pressable
            key={key}
            onPress={() => { haptic(); setTab(key); }}
            style={[styles.tab, tab === key && [styles.tabActive, { borderBottomColor: t.primary }]]}
          >
            <Text style={[styles.tabText, { color: tab === key ? t.primary : t.textMute }]}>
              {tr(`prizes_tab_${key}` as any)}
            </Text>
          </Pressable>
        ))}
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: t.textMute }]}>{tr(emptyKey as any)}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {filtered.map(up => {
            const prize  = up.prize;
            const isUsed = up.status === 'used';
            return (
              <View
                key={up.id}
                style={[styles.card, { backgroundColor: t.surface, borderColor: t.border, opacity: isUsed ? 0.65 : 1 }]}
              >
                {/* Top row */}
                <View style={styles.cardHeader}>
                  <Text style={styles.cardEmoji}>{TYPE_ICONS[prize?.type ?? ''] ?? '🎁'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.cardName, { color: t.text }]} numberOfLines={2}>
                      {prize?.name ?? '—'}
                    </Text>
                    {prize?.description ? (
                      <Text style={[styles.cardDesc, { color: t.textMute }]} numberOfLines={1}>
                        {prize.description}
                      </Text>
                    ) : null}
                    {prize?.venues?.name ? (
                      <Text style={[styles.cardVenue, { color: t.textFaint }]}>📍 {prize.venues.name}</Text>
                    ) : null}
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: isUsed ? t.bgAlt : `${t.primary}18` }]}>
                    <Text style={[styles.statusText, { color: isUsed ? t.textMute : t.primary }]}>
                      {isUsed ? tr('prizes_used') : tr('prizes_tab_active')}
                    </Text>
                  </View>
                </View>

                {/* Code */}
                {up.code && !isUsed && (
                  <>
                    <Text style={[styles.showCodeHint, { color: t.textFaint }]}>{tr('prizes_show_code')}</Text>
                    <View style={[styles.codeBox, { backgroundColor: `${t.primary}10`, borderColor: `${t.primary}25` }]}>
                      <Text style={[styles.codeText, { color: t.primary }]}>{up.code}</Text>
                    </View>
                  </>
                )}
                {up.code && isUsed && (
                  <Text style={[styles.usedCode, { color: t.textFaint }]}>{up.code}</Text>
                )}

                {/* Footer */}
                <Text style={[styles.claimedAt, { color: t.textFaint }]}>
                  {tr('prizes_claimed')}: {new Date(up.claimed_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                  {up.used_at ? `  ·  ${tr('prizes_used')}: ${new Date(up.used_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}` : ''}
                </Text>
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTitle: { fontSize: 17, fontFamily: FONTS.bold, fontWeight: '700' },
  tabs: { flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth },
  tab: { flex: 1, paddingVertical: 12, alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
  tabActive: {},
  tabText: { fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 14 },
  list: { padding: 16, gap: 12 },
  card: { borderRadius: 18, borderWidth: 1, padding: 16, gap: 10 },
  cardHeader: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  cardEmoji: { fontSize: 28, lineHeight: 34 },
  cardName: { fontSize: 15, fontFamily: FONTS.bold, fontWeight: '700', lineHeight: 20 },
  cardDesc: { fontSize: 12, marginTop: 2 },
  cardVenue: { fontSize: 11, marginTop: 3 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  statusText: { fontSize: 11, fontFamily: FONTS.semiBold, fontWeight: '600' },
  showCodeHint: { fontSize: 11, textAlign: 'center' },
  codeBox: { paddingVertical: 14, borderRadius: 14, borderWidth: 1, alignItems: 'center' },
  codeText: { fontSize: 28, fontFamily: FONTS.extraBold, fontWeight: '800', letterSpacing: 3 },
  usedCode: { fontSize: 16, fontFamily: FONTS.medium, fontWeight: '500', textAlign: 'center', textDecorationLine: 'line-through' },
  claimedAt: { fontSize: 11, textAlign: 'center' },
});
