import React, { useState, useEffect, useMemo } from 'react';
import {
  View, Text, ScrollView, Pressable, StyleSheet, StatusBar,
  ActivityIndicator, Modal, Image, Alert, Platform, RefreshControl,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';

import { RootStackParamList } from '../navigation';
import { useStore } from '../store';
import { useProfile } from '../hooks/useProfile';
import { useTranslation } from '../hooks/useTranslation';
import { fetchMarketPrizes, redeemPrize, Prize } from '../lib/api';
import { Icon } from '../components/Icon';
import { FONTS } from '../theme';

type Props = { navigation: NativeStackNavigationProp<RootStackParamList, 'Market'> };

const TYPE_FILTERS = [
  { key: 'all',      labelKey: 'market_filter_all' },
  { key: 'discount', labelKey: 'market_filter_discount' },
  { key: 'free_item',labelKey: 'market_filter_free' },
  { key: 'experience',labelKey: 'market_filter_exp' },
  { key: 'voucher',  labelKey: 'market_filter_voucher' },
] as const;

const TYPE_ICONS: Record<string, string> = {
  discount: '🏷️', free_item: '🎁', experience: '⭐', voucher: '🎟️',
};

const haptic = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

export function MarketScreen({ navigation }: Props) {
  const { theme: t } = useStore();
  const insets = useSafeAreaInsets();
  const { profile, refetch: refetchProfile } = useProfile();
  const { tr, trf } = useTranslation();

  const [prizes, setPrizes]         = useState<Prize[]>([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter]         = useState<string>('all');
  const [confirming, setConfirming] = useState<Prize | null>(null);
  const [redeeming, setRedeeming]   = useState(false);
  const [successCode, setSuccessCode] = useState<{ code: string; prize: Prize } | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  async function loadPrizes() {
    setError(false);
    setLoading(true);
    try {
      const data = await fetchMarketPrizes();
      setPrizes(data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPrizes();
  }, []);

  async function handleRefresh() {
    setRefreshing(true);
    setError(false);
    try {
      const data = await fetchMarketPrizes();
      setPrizes(data);
      await refetchProfile();
    } catch {
      setError(true);
    } finally {
      setRefreshing(false);
    }
  }

  const filtered = useMemo(
    () => filter === 'all' ? prizes : prizes.filter(p => p.type === filter),
    [prizes, filter],
  );

  async function handleRedeem(prize: Prize) {
    if (!profile) return;
    haptic();
    setConfirming(prize);
  }

  async function confirmRedeem() {
    if (!confirming || !profile) return;
    setRedeeming(true);
    const result = await redeemPrize(profile.id, confirming.id);
    setRedeeming(false);
    setConfirming(null);
    if ('error' in result) {
      const msg =
        result.error === 'insufficient_points' ? tr('market_err_funds') :
        result.error === 'out_of_stock'        ? tr('market_err_stock') :
        tr('market_err_generic');
      Alert.alert('', msg);
      return;
    }
    refetchProfile();
    setCodeCopied(false);
    setSuccessCode({ code: result.code, prize: confirming });
    if (Platform.OS !== 'web') Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  }

  const balance = profile?.yel_points ?? 0;

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12, backgroundColor: t.surface, borderBottomColor: t.border }]}>
        <Pressable onPress={() => { haptic(); navigation.goBack(); }} hitSlop={12}>
          <Icon name="chevL" size={22} color={t.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: t.text }]}>{tr('market_title')}</Text>
        <View style={[styles.balancePill, { backgroundColor: `${t.primary}18` }]}>
          <Text style={[styles.balanceText, { color: t.primary }]}>{balance.toLocaleString()} Yel</Text>
        </View>
      </View>

      {/* Filter tabs */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filterRow, { paddingHorizontal: 16 }]}
        style={{ flexShrink: 0, backgroundColor: t.surface, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: t.border }}
      >
        {TYPE_FILTERS.map(f => (
          <Pressable
            key={f.key}
            onPress={() => { haptic(); setFilter(f.key); }}
            style={[
              styles.filterChip,
              { borderColor: filter === f.key ? t.primary : t.border },
              filter === f.key && { backgroundColor: t.primary },
            ]}
          >
            <Text style={[styles.filterText, { color: filter === f.key ? '#FBF5E8' : t.textMute }]}>
              {tr(f.labelKey)}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Prizes */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : error ? (
        <View style={styles.center}>
          <Icon name="wifi-off" size={32} color={t.textMute} strokeWidth={1.5} />
          <Text style={[styles.empty, { color: t.textMute, marginTop: 12 }]}>{tr('market_err_api' as any)}</Text>
          <Pressable onPress={loadPrizes} style={[styles.retryBtn, { backgroundColor: t.primary }]}>
            <Text style={[styles.retryText, { color: '#FBF5E8' }]}>{tr('err_retry')}</Text>
          </Pressable>
        </View>
      ) : filtered.length === 0 ? (
        <View style={styles.center}>
          <Text style={[styles.empty, { color: t.textMute }]}>{tr('market_empty')}</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={t.primary}
              colors={[t.primary]}
            />
          }
        >
          {filtered.map(prize => {
            const canAfford  = balance >= (prize.points_cost ?? 0);
            const outOfStock = prize.stock === 0;
            return (
              <View key={prize.id} style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}>
                {prize.image_url ? (
                  <Image source={{ uri: prize.image_url }} style={styles.cardImg} />
                ) : (
                  <View style={[styles.cardImgPlaceholder, { backgroundColor: `${t.primary}15` }]}>
                    <Text style={styles.cardEmoji}>{TYPE_ICONS[prize.type] ?? '🎁'}</Text>
                  </View>
                )}
                <View style={styles.cardBody}>
                  <View style={styles.cardTop}>
                    <Text style={[styles.cardName, { color: t.text }]} numberOfLines={2}>{prize.name}</Text>
                    {prize.description ? (
                      <Text style={[styles.cardDesc, { color: t.textMute }]} numberOfLines={2}>{prize.description}</Text>
                    ) : null}
                    {prize.venue_id && (
                      <Text style={[styles.cardVenue, { color: t.textFaint }]}>📍 {(prize as any).venues?.name ?? ''}</Text>
                    )}
                  </View>
                  <View style={styles.cardBottom}>
                    <Text style={[styles.cardCost, { color: t.primary }]}>
                      {trf('market_pts_cost', { n: (prize.points_cost ?? 0).toLocaleString() })}
                    </Text>
                    <Pressable
                      onPress={() => handleRedeem(prize)}
                      disabled={!canAfford || outOfStock}
                      style={[
                        styles.redeemBtn,
                        { backgroundColor: (!canAfford || outOfStock) ? t.border : t.primary },
                      ]}
                    >
                      <Text style={[styles.redeemText, { color: (!canAfford || outOfStock) ? t.textMute : '#FBF5E8' }]}>
                        {outOfStock ? tr('market_out_of_stock') : !canAfford ? tr('market_not_enough') : tr('market_redeem')}
                      </Text>
                    </Pressable>
                  </View>
                </View>
              </View>
            );
          })}
        </ScrollView>
      )}

      {/* Confirm modal */}
      <Modal visible={!!confirming} transparent animationType="fade" onRequestClose={() => setConfirming(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: t.surface }]}>
            <Text style={[styles.sheetTitle, { color: t.text }]}>{tr('market_confirm_title')}</Text>
            {confirming && (
              <>
                <Text style={[styles.sheetPrizeName, { color: t.text }]}>{confirming.name}</Text>
                <Text style={[styles.sheetLine, { color: t.textMute }]}>
                  {trf('market_confirm_cost', { n: (confirming.points_cost ?? 0).toLocaleString() })}
                </Text>
                <Text style={[styles.sheetLine, { color: t.textMute }]}>
                  {trf('market_confirm_balance', { n: Math.max(0, balance - (confirming.points_cost ?? 0)).toLocaleString() })}
                </Text>
              </>
            )}
            <View style={styles.sheetBtns}>
              <Pressable onPress={() => { haptic(); setConfirming(null); }} style={[styles.sheetBtn, { borderColor: t.border }]}>
                <Text style={[styles.sheetBtnText, { color: t.textMute }]}>{tr('market_confirm_no')}</Text>
              </Pressable>
              <Pressable
                onPress={confirmRedeem}
                disabled={redeeming}
                style={[styles.sheetBtn, styles.sheetBtnPrimary, { backgroundColor: t.primary, opacity: redeeming ? 0.7 : 1 }]}
              >
                {redeeming
                  ? <ActivityIndicator color="#FBF5E8" size="small" />
                  : <Text style={[styles.sheetBtnText, { color: '#FBF5E8' }]}>{tr('market_confirm_yes')}</Text>
                }
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success modal */}
      <Modal visible={!!successCode} transparent animationType="fade" onRequestClose={() => setSuccessCode(null)}>
        <View style={styles.overlay}>
          <View style={[styles.sheet, { backgroundColor: t.surface }]}>
            <Text style={[styles.successEmoji]}>🎉</Text>
            <Text style={[styles.sheetTitle, { color: t.text }]}>{tr('market_success_title')}</Text>
            {successCode && (
              <>
                <Text style={[styles.successPrizeName, { color: t.textMute }]}>{successCode.prize.name}</Text>
                <Pressable
                  onPress={async () => {
                    await Clipboard.setStringAsync(successCode.code);
                    setCodeCopied(true);
                    setTimeout(() => setCodeCopied(false), 2000);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel={tr('market_copy_code' as any)}
                  style={[styles.codeBox, { backgroundColor: `${t.primary}12`, borderColor: `${t.primary}30` }]}
                >
                  <Text style={[styles.codeText, { color: t.primary }]}>{successCode.code}</Text>
                </Pressable>
                <Text style={[styles.sheetLine, { color: t.textFaint }]}>
                  {codeCopied ? tr('market_copied' as any) : tr('market_tap_to_copy' as any)}
                </Text>
                <Text style={[styles.sheetLine, { color: t.textFaint }]}>{tr('market_success_sub')}</Text>
              </>
            )}
            <Pressable
              onPress={() => { haptic(); setSuccessCode(null); }}
              style={[styles.sheetBtn, styles.sheetBtnPrimary, styles.sheetBtnFull, { backgroundColor: t.primary }]}
            >
              <Text style={[styles.sheetBtnText, { color: '#FBF5E8' }]}>{tr('market_success_close')}</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
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
  balancePill: { paddingVertical: 5, paddingHorizontal: 12, borderRadius: 999 },
  balanceText: { fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },
  filterRow: { flexDirection: 'row', gap: 8, paddingVertical: 10 },
  filterChip: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 999, borderWidth: 1 },
  filterText: { fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 14, textAlign: 'center', paddingHorizontal: 24 },
  retryBtn: { marginTop: 16, paddingVertical: 10, paddingHorizontal: 24, borderRadius: 999 },
  retryText: { fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600' },
  list: { padding: 16, gap: 12 },
  card: {
    flexDirection: 'row', borderRadius: 18, borderWidth: 1, overflow: 'hidden',
  },
  cardImg: { width: 100, height: 110 },
  cardImgPlaceholder: { width: 100, height: 110, alignItems: 'center', justifyContent: 'center' },
  cardEmoji: { fontSize: 36 },
  cardBody: { flex: 1, padding: 12, justifyContent: 'space-between' },
  cardTop: { gap: 3 },
  cardName: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700', lineHeight: 19 },
  cardDesc: { fontSize: 12, lineHeight: 16 },
  cardVenue: { fontSize: 11, marginTop: 2 },
  cardBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 },
  cardCost: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700' },
  redeemBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999 },
  redeemText: { fontSize: 12, fontFamily: FONTS.semiBold, fontWeight: '600' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', alignItems: 'center', justifyContent: 'flex-end' },
  sheet: { width: '100%', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, gap: 12, alignItems: 'center', paddingBottom: 36 },
  sheetTitle: { fontSize: 18, fontFamily: FONTS.bold, fontWeight: '700' },
  sheetPrizeName: { fontSize: 15, fontFamily: FONTS.semiBold, fontWeight: '600', textAlign: 'center' },
  sheetLine: { fontSize: 13, textAlign: 'center' },
  sheetBtns: { flexDirection: 'row', gap: 10, marginTop: 4, width: '100%' },
  sheetBtn: { flex: 1, paddingVertical: 14, borderRadius: 14, alignItems: 'center', borderWidth: 1, borderColor: 'transparent' },
  sheetBtnPrimary: { borderWidth: 0 },
  sheetBtnFull: { flex: undefined, width: '100%' },
  sheetBtnText: { fontSize: 15, fontFamily: FONTS.semiBold, fontWeight: '600' },
  successEmoji: { fontSize: 48 },
  successPrizeName: { fontSize: 14, textAlign: 'center' },
  codeBox: { paddingVertical: 14, paddingHorizontal: 28, borderRadius: 14, borderWidth: 1, marginVertical: 4 },
  codeText: { fontSize: 26, fontFamily: FONTS.extraBold, fontWeight: '800', letterSpacing: 2 },
});
