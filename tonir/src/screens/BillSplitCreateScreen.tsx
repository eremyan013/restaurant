import React, { useState, useEffect } from 'react';
import {
  View, Text, TextInput, Pressable, FlatList, ActivityIndicator,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import * as Haptics from 'expo-haptics';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackParamList } from '../navigation';
import { FONTS } from '../theme';

type Nav   = NativeStackNavigationProp<RootStackParamList, 'BillSplitCreate'>;
type Route = RouteProp<RootStackParamList, 'BillSplitCreate'>;

type Friend = { id: string; name: string; avatar_url: string | null };

export default function BillSplitCreateScreen() {
  const nav   = useNavigation<Nav>();
  const route = useRoute<Route>();
  const { reservationId, venueName } = route.params;
  const { theme: t } = useStore();
  const { tr } = useTranslation();

  const [friends,        setFriends]        = useState<Friend[]>([]);
  const [selectedIds,    setSelectedIds]    = useState<Set<string>>(new Set());
  const [totalAmount,    setTotalAmount]    = useState('');
  const [submitting,     setSubmitting]     = useState(false);
  const [loadingFriends, setLoadingFriends] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from('friendships')
        .select(
          'requester_id, addressee_id, profiles!friendships_requester_id_fkey(id,name,avatar_url), profiles!friendships_addressee_id_fkey(id,name,avatar_url)'
        )
        .eq('status', 'accepted')
        .or(`requester_id.eq.${user.id},addressee_id.eq.${user.id}`);
      const list: Friend[] = (data ?? []).map((row: any) => {
        const isRequester = row.requester_id === user.id;
        const p = isRequester
          ? row['profiles!friendships_addressee_id_fkey']
          : row['profiles!friendships_requester_id_fkey'];
        return { id: p.id, name: p.name, avatar_url: p.avatar_url };
      });
      setFriends(list);
      setLoadingFriends(false);
    })();
  }, []);

  const toggleFriend = (id: string) => {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const amount    = parseFloat(totalAmount);
  const validForm = !isNaN(amount) && amount > 0 && selectedIds.size >= 1;
  const shareAmt  = validForm ? (amount / (selectedIds.size + 1)).toFixed(2) : null;

  const submit = async () => {
    if (!validForm) {
      if (isNaN(amount) || amount <= 0) {
        Alert.alert('', tr('split_err_amount'));
        return;
      }
      Alert.alert('', tr('split_err_friends'));
      return;
    }
    setSubmitting(true);
    const { data, error } = await supabase.functions.invoke('create-bill-split', {
      body: {
        reservation_id: reservationId,
        total_amount:   amount,
        friend_ids:     Array.from(selectedIds),
      },
    });
    setSubmitting(false);
    if (error || !data?.ok) {
      const msg = data?.error === 'split_already_exists'
        ? tr('split_err_already')
        : tr('split_err_failed');
      Alert.alert('', msg);
      return;
    }
    nav.replace('BillSplitDetail', { splitId: data.split_id });
  };

  const s = StyleSheet.create({
    container:   { flex: 1, backgroundColor: t.bg },
    inner:       { padding: 20, flex: 1 },
    header:      { fontSize: 22, fontFamily: FONTS.extraBold, fontWeight: '700', color: t.text, marginBottom: 4 },
    sub:         { fontSize: 14, color: t.textMute, marginBottom: 24 },
    label:       {
      fontSize: 13,
      color: t.textMute,
      marginBottom: 6,
      fontFamily: FONTS.semiBold,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    input:       {
      backgroundColor: t.surface,
      borderRadius: 12,
      padding: 14,
      fontSize: 20,
      fontFamily: FONTS.bold,
      color: t.text,
      borderWidth: 1,
      borderColor: t.border,
      marginBottom: 20,
    },
    preview:     { fontSize: 14, color: t.primary, marginTop: -14, marginBottom: 20 },
    friendRow:   {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    friendName:  { flex: 1, fontSize: 16, color: t.text, marginLeft: 12, fontFamily: FONTS.medium },
    check:       {
      width: 22,
      height: 22,
      borderRadius: 11,
      borderWidth: 2,
      borderColor: t.primary,
      alignItems: 'center',
      justifyContent: 'center',
    },
    checkFill:   { width: 12, height: 12, borderRadius: 6, backgroundColor: t.primary },
    submitBtn:   {
      backgroundColor: t.primary,
      borderRadius: 14,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    submitText:  { color: '#fff', fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700' },
    emptyText:   { color: t.textMute, textAlign: 'center', marginTop: 20, fontSize: 15 },
  });

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={s.inner}>
        <Text style={s.header}>{tr('split_title')}</Text>
        <Text style={s.sub}>{venueName}</Text>

        <Text style={s.label}>{tr('split_amount_label')}</Text>
        <TextInput
          style={s.input}
          keyboardType="numeric"
          placeholder={tr('split_amount_placeholder')}
          placeholderTextColor={t.textMute}
          value={totalAmount}
          onChangeText={setTotalAmount}
          accessibilityLabel={tr('split_amount_label')}
        />
        {shareAmt !== null && (
          <Text style={s.preview}>
            {tr('split_per_person')}: {shareAmt} {tr('split_currency')}
          </Text>
        )}

        <Text style={s.label}>{tr('split_friends_label')}</Text>
        {loadingFriends ? (
          <ActivityIndicator color={t.primary} />
        ) : friends.length === 0 ? (
          <Text style={s.emptyText}>{tr('split_friends_empty')}</Text>
        ) : (
          <FlatList
            data={friends}
            keyExtractor={f => f.id}
            renderItem={({ item }) => {
              const selected = selectedIds.has(item.id);
              return (
                <Pressable
                  style={s.friendRow}
                  onPress={() => toggleFriend(item.id)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: selected }}
                  accessibilityLabel={item.name}
                >
                  <View style={[s.check, selected && { backgroundColor: t.primary }]}>
                    {selected && <View style={s.checkFill} />}
                  </View>
                  <Text style={s.friendName}>{item.name}</Text>
                </Pressable>
              );
            }}
          />
        )}

        <Pressable
          style={[s.submitBtn, (!validForm || submitting) && { opacity: 0.5 }]}
          onPress={submit}
          disabled={!validForm || submitting}
          accessibilityRole="button"
          accessibilityLabel={tr('split_submit')}
          accessibilityState={{ disabled: !validForm || submitting }}
        >
          <Text style={s.submitText}>
            {submitting ? tr('split_submitting') : tr('split_submit')}
          </Text>
        </Pressable>
      </View>
    </KeyboardAvoidingView>
  );
}
