import React, { useState } from 'react';
import {
  View, Text, ScrollView, Pressable, Image, StyleSheet, StatusBar, Switch, ActivityIndicator, Alert, Platform,
  Modal, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import * as Haptics from 'expo-haptics';
import { useStore } from '../store';
import { useProfile } from '../hooks/useProfile';
import { useTranslation } from '../hooks/useTranslation';
import { PALETTES, Palette, FONTS} from '../theme';
import { supabase } from '../lib/supabase';
import { updateProfile, uploadAvatar } from '../lib/api';
import { Icon, IconName } from '../components/Icon';
import { CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList, TabParamList } from '../navigation';

type Nav = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'Profile'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const haptic = () => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); };

export function ProfileScreen({ navigation }: { navigation: Nav }) {
  const { theme: t, dark, palette, userId, setDark, setPalette } = useStore();
  const insets = useSafeAreaInsets();
  const { profile, loading, refetch } = useProfile();
  const { tr, tra, trf } = useTranslation();

  const [editVisible, setEditVisible] = useState(false);
  const [editName, setEditName] = useState('');
  const [editAvatarUri, setEditAvatarUri] = useState<string | null>(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  function openEdit() {
    setEditName(profile?.name ?? '');
    setEditAvatarUri(profile?.avatar_url ?? null);
    setEditError(null);
    setEditVisible(true);
  }

  async function pickAvatar() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled && result.assets[0]) {
      setEditAvatarUri(result.assets[0].uri);
    }
  }

  async function saveProfile() {
    if (!userId) return;
    setEditSaving(true);
    setEditError(null);
    try {
      let avatar_url = profile?.avatar_url ?? null;
      if (editAvatarUri && editAvatarUri !== profile?.avatar_url) {
        avatar_url = await uploadAvatar(userId, editAvatarUri);
      } else if (!editAvatarUri) {
        avatar_url = null;
      }
      await updateProfile(userId, { name: editName.trim(), avatar_url });
      setEditVisible(false);
      refetch();
    } catch (e: any) {
      setEditError(e?.message ?? 'Failed to save');
    } finally {
      setEditSaving(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.screen, { backgroundColor: t.bg, alignItems: 'center', justifyContent: 'center' }]}>
        <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  const FALLBACK = {
    name: tr('prof_guest'),
    email: '',
    avatar_url: null as string | null,
    tier: 'Tonir',
    tier_level: 1,
    yel_points: 0,
  };

  const user = profile ?? FALLBACK;
  const yelProgress = (user.yel_points % 1000) / 1000;

  const QUICK_ACTIONS: Array<{ icon: IconName; label: string; sub: string; route?: keyof TabParamList; comingSoon?: boolean }> = [
    { icon: 'gift',     label: tr('prof_qa_coupons'),  sub: tr('prof_qa_coupons_sub'),  comingSoon: true },
    { icon: 'split',    label: tr('prof_qa_split'),    sub: tr('prof_qa_split_sub'),    comingSoon: true },
    { icon: 'users',    label: tr('prof_qa_friends'),  sub: tr('prof_qa_friends_sub'),  comingSoon: true },
    { icon: 'calendar', label: tr('prof_qa_calendar'), sub: tr('prof_qa_calendar_sub'), route: 'Reservations' },
  ];

  const SETTINGS: Array<{ icon: IconName; label: string; onPress: () => void }> = [
    { icon: 'user',    label: tr('prof_settings_personal'), onPress: openEdit },
    { icon: 'pin',     label: tr('prof_settings_address'),  onPress: haptic },
    { icon: 'sparkle', label: tr('prof_settings_notifs'),   onPress: haptic },
    { icon: 'chat',    label: tr('prof_settings_help'),     onPress: haptic },
  ];

  const tierNames = tra('prof_tier_names');

  function signOut() {
    Alert.alert(
      tr('prof_signout_title'),
      tr('prof_signout_sub'),
      [
        { text: tr('prof_signout_back'), style: 'cancel' },
        {
          text: tr('prof_signout'),
          style: 'destructive',
          onPress: () => (supabase as any).auth.signOut(),
        },
      ]
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: t.bg }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16, paddingBottom: 120 }]}
      >
        {/* User card */}
        <View style={[styles.userCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <View style={[styles.avatarWrap, { borderColor: t.accent }]}>
            {user.avatar_url ? (
              <Image source={{ uri: user.avatar_url }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, { backgroundColor: t.bgAlt, alignItems: 'center', justifyContent: 'center' }]}>
                <Icon name="user" size={28} color={t.textMute} />
              </View>
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.userName, { color: t.text }]}>{user.name}</Text>
            {!!user.email && <Text style={[styles.userEmail, { color: t.textMute }]}>{user.email}</Text>}
            <View style={[styles.tierBadge, { backgroundColor: `${t.accent}20` }]}>
              <Text style={[styles.tierText, { color: t.accent }]}>
                {trf('prof_tier_label', { tier: user.tier, level: user.tier_level })}
              </Text>
            </View>
          </View>
        </View>

        {/* Yel card */}
        <LinearGradient
          colors={[t.primary, t.primaryDeep]}
          style={styles.yelCard}
        >
          <View style={styles.yelOrb} />
          <Text style={styles.yelEyebrow}>{tr('prof_yel_eyebrow')}</Text>
          <Text style={styles.yelPoints}>{user.yel_points.toLocaleString()} {tr('prof_points_unit')}</Text>
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                {
                  width: `${yelProgress * 100}%`,
                  backgroundColor: t.accent,
                },
              ]}
            />
          </View>
          <View style={styles.tiers}>
            {tierNames.map((tier, i) => (
              <Text
                key={tier}
                style={[
                  styles.tierItem,
                  {
                    color: i <= user.tier_level - 1
                      ? '#FBF5E8'
                      : 'rgba(251,245,232,0.4)',
                    fontFamily: i === user.tier_level - 1 ? FONTS.bold : FONTS.regular,
                    fontWeight: i === user.tier_level - 1 ? '700' : '400',
                  },
                ]}
              >
                {tier}
              </Text>
            ))}
          </View>
          <Pressable onPress={() => haptic()} style={[styles.redeemBtn, { backgroundColor: t.accent }]}>
            <Text style={[styles.redeemText, { color: t.primaryDeep }]}>{tr('prof_redeem')}</Text>
          </Pressable>
        </LinearGradient>

        {/* Quick actions */}
        <View style={styles.quickGrid}>
          {QUICK_ACTIONS.map((a) => (
            <Pressable
              key={a.label}
              onPress={() => {
                haptic();
                if (a.route) navigation.navigate(a.route);
                else if (a.comingSoon) Alert.alert(tr('prof_soon_title'), trf('prof_soon_sub', { section: a.label }));
              }}
              style={[styles.quickCard, { backgroundColor: t.surface, borderColor: t.border }]}
            >
              <View style={[styles.quickIconTile, { backgroundColor: `${t.primary}15` }]}>
                <Icon name={a.icon} size={20} color={t.primary} strokeWidth={2} />
              </View>
              <Text style={[styles.quickLabel, { color: t.text }]}>{a.label}</Text>
              <Text style={[styles.quickSub, { color: t.textMute }]}>{a.sub}</Text>
            </Pressable>
          ))}
        </View>

        {/* Settings */}
        <View style={[styles.settingsList, { backgroundColor: t.surface, borderColor: t.border }]}>
          {SETTINGS.map((s, i) => (
            <Pressable
              key={s.label}
              onPress={s.onPress}
              style={[
                styles.settingsRow,
                { borderBottomColor: t.border, borderBottomWidth: i < SETTINGS.length - 1 ? StyleSheet.hairlineWidth : 0 },
              ]}
            >
              <View style={[styles.settingsIconTile, { backgroundColor: `${t.primary}12` }]}>
                <Icon name={s.icon} size={17} color={t.primary} strokeWidth={1.75} />
              </View>
              <Text style={[styles.settingsLabel, { color: t.text }]}>{s.label}</Text>
              <Icon name="chevR" size={16} color={t.textFaint} />
            </Pressable>
          ))}
        </View>

        {/* Appearance */}
        <View style={[styles.appearanceCard, { backgroundColor: t.surface, borderColor: t.border }]}>
          <Text style={[styles.appearanceTitle, { color: t.text }]}>{tr('prof_appearance')}</Text>

          {/* Dark mode row */}
          <View style={[styles.appearanceRow, { borderBottomColor: t.border }]}>
            <View style={[styles.settingsIconTile, { backgroundColor: `${t.primary}12` }]}>
              <Icon name="sparkle" size={17} color={t.primary} strokeWidth={1.75} />
            </View>
            <Text style={[styles.settingsLabel, { color: t.text }]}>{tr('prof_dark_mode')}</Text>
            <Switch
              value={dark}
              onValueChange={(val) => { haptic(); setDark(val); }}
              trackColor={{ false: t.border, true: t.primary }}
              thumbColor={dark ? t.accent : '#FBF5E8'}
            />
          </View>

          {/* Palette row */}
          <View style={styles.paletteRow}>
            {(Object.keys(PALETTES) as Palette[]).map((p) => {
              const pal = PALETTES[p];
              const active = palette === p;
              return (
                <Pressable
                  key={p}
                  onPress={() => { haptic(); setPalette(p); }}
                  style={[
                    styles.paletteSwatch,
                    { backgroundColor: pal.primary },
                    active && styles.paletteSwatchActive,
                  ]}
                >
                  {active && (
                    <Icon name="check" size={14} color="#FBF5E8" strokeWidth={2.5} />
                  )}
                </Pressable>
              );
            })}
            <Text style={[styles.paletteLabel, { color: t.textMute }]}>{tr('prof_color_theme')}</Text>
          </View>
        </View>

        {/* Sign out */}
        <Pressable
          onPress={signOut}
          style={[styles.signOutBtn, { borderColor: `#9B233540` }]}
        >
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="arrow" size={16} color="#9B2335" strokeWidth={2} />
          </View>
          <Text style={styles.signOutText}>{tr('prof_signout')}</Text>
        </Pressable>

        {/* Footer */}
        <Text style={[styles.footer, { color: t.textFaint }]}>
          {tr('prof_footer')}
        </Text>
      </ScrollView>

      {/* Edit profile modal */}
      <Modal visible={editVisible} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setEditVisible(false)}>
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={{ flex: 1 }}>
          <View style={[styles.modalScreen, { backgroundColor: t.bg, paddingTop: insets.top + 16 }]}>
            {/* Modal header */}
            <View style={styles.modalHeader}>
              <Pressable onPress={() => setEditVisible(false)} hitSlop={12}>
                <Text style={[styles.modalCancel, { color: t.textMute }]}>{tr('prof_edit_cancel')}</Text>
              </Pressable>
              <Text style={[styles.modalTitle, { color: t.text }]}>{tr('prof_edit_title')}</Text>
              <Pressable onPress={saveProfile} disabled={editSaving} hitSlop={12}>
                {editSaving
                  ? <ActivityIndicator size="small" color={t.primary} />
                  : <Text style={[styles.modalSave, { color: t.primary }]}>{tr('prof_edit_save')}</Text>
                }
              </Pressable>
            </View>

            <ScrollView contentContainerStyle={styles.modalContent} keyboardShouldPersistTaps="handled">
              {/* Avatar picker */}
              <Pressable onPress={pickAvatar} style={styles.avatarPickerWrap}>
                <View style={[styles.avatarPickerRing, { borderColor: t.accent }]}>
                  {editAvatarUri ? (
                    <Image source={{ uri: editAvatarUri }} style={styles.avatarPickerImg} />
                  ) : (
                    <View style={[styles.avatarPickerImg, { backgroundColor: t.bgAlt, alignItems: 'center', justifyContent: 'center' }]}>
                      <Icon name="user" size={32} color={t.textMute} />
                    </View>
                  )}
                </View>
                <Text style={[styles.avatarPickerLabel, { color: t.primary }]}>{tr('prof_edit_change_photo')}</Text>
                {editAvatarUri && (
                  <Pressable
                    onPress={() => setEditAvatarUri(null)}
                    hitSlop={8}
                    style={{ marginTop: 4 }}
                  >
                    <Text style={[styles.avatarPickerLabel, { color: '#9B2335', fontSize: 12 }]}>{tr('prof_edit_remove_photo')}</Text>
                  </Pressable>
                )}
              </Pressable>

              {/* Name field */}
              <View style={[styles.fieldWrap, { backgroundColor: t.surface, borderColor: t.border }]}>
                <Text style={[styles.fieldLabel, { color: t.textMute }]}>{tr('prof_edit_name')}</Text>
                <TextInput
                  value={editName}
                  onChangeText={setEditName}
                  placeholder={tr('prof_edit_name_placeholder')}
                  placeholderTextColor={t.textFaint}
                  autoCapitalize="words"
                  style={[styles.fieldInput, { color: t.text }]}
                />
              </View>

              {editError && (
                <Text style={styles.editErrorText}>{editError}</Text>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  scroll: { paddingHorizontal: 20, gap: 16 },
  userCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 18,
    borderRadius: 22,
    borderWidth: 1,
  },
  avatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    overflow: 'hidden',
  },
  avatar: { width: '100%', height: '100%' },
  userName: { fontSize: 17, fontFamily: FONTS.bold, fontWeight: '700', marginBottom: 2 },
  userEmail: { fontSize: 12, marginBottom: 8 },
  tierBadge: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  tierText: { fontSize: 10, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: 0.5 },
  yelCard: {
    borderRadius: 22,
    padding: 22,
    overflow: 'hidden',
    gap: 10,
  },
  yelOrb: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(201,169,97,0.15)',
  },
  yelEyebrow: {
    color: 'rgba(251,245,232,0.65)',
    fontSize: 11,
    fontFamily: FONTS.semiBold, fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  yelPoints: {
    color: '#FBF5E8',
    fontSize: 34,
    fontFamily: FONTS.extraBold, fontWeight: '800',
    letterSpacing: -0.8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  tiers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tierItem: { fontSize: 11, letterSpacing: 0.3 },
  redeemBtn: {
    alignItems: 'center',
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: 4,
  },
  redeemText: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700' },
  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  quickCard: {
    width: '47%',
    padding: 16,
    borderRadius: 18,
    borderWidth: 1,
    gap: 8,
  },
  quickIconTile: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickLabel: { fontSize: 14, fontFamily: FONTS.bold, fontWeight: '700' },
  quickSub: { fontSize: 12 },
  settingsList: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
  },
  settingsIconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsLabel: { flex: 1, fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500' },
  appearanceCard: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  appearanceTitle: {
    fontSize: 13,
    fontFamily: FONTS.semiBold, fontWeight: '600',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 10,
    opacity: 0.5,
  },
  appearanceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  paletteRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
  },
  paletteSwatch: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paletteSwatchActive: {
    transform: [{ scale: 1.15 }],
  },
  paletteLabel: {
    fontSize: 13,
    marginLeft: 4,
  },
  signOutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
  },
  signOutText: {
    color: '#9B2335',
    fontSize: 14,
    fontFamily: FONTS.semiBold, fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    marginTop: 8,
  },
  modalScreen: { flex: 1 },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingBottom: 16,
    paddingTop: 4,
  },
  modalTitle: { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700' },
  modalCancel: { fontSize: 15 },
  modalSave: { fontSize: 15, fontFamily: FONTS.semiBold, fontWeight: '600' },
  modalContent: { paddingHorizontal: 20, paddingTop: 8, gap: 20, paddingBottom: 40 },
  avatarPickerWrap: { alignItems: 'center', gap: 10, paddingVertical: 8 },
  avatarPickerRing: { width: 88, height: 88, borderRadius: 44, borderWidth: 2.5, overflow: 'hidden' },
  avatarPickerImg: { width: '100%', height: '100%' },
  avatarPickerLabel: { fontSize: 14, fontFamily: FONTS.semiBold, fontWeight: '600' },
  fieldWrap: {
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 4,
  },
  fieldLabel: { fontSize: 11, fontFamily: FONTS.medium, fontWeight: '500', textTransform: 'uppercase', letterSpacing: 0.5 },
  fieldInput: { fontSize: 15, padding: 0 },
  editErrorText: { color: '#9B2335', fontSize: 13, textAlign: 'center' },
});
