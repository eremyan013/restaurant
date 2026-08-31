import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet } from 'react-native';
import { useRoute, RouteProp } from '@react-navigation/native';
import { supabase } from '../lib/supabase';
import { useStore } from '../store';
import { useTranslation } from '../hooks/useTranslation';
import { RootStackParamList } from '../navigation';
import { FONTS } from '../theme';

type Route = RouteProp<RootStackParamList, 'BillSplitDetail'>;

type Participant = {
  id:           string;
  user_id:      string;
  is_initiator: boolean;
  name:         string;
  avatar_url:   string | null;
};

type SplitData = {
  id:                string;
  total_amount:      number;
  share_amount:      number;
  currency:          string;
  participant_count: number;
  reservation_id:    string;
};

export default function BillSplitDetailScreen() {
  const route = useRoute<Route>();
  const { splitId } = route.params;
  const { theme: t } = useStore();
  const { tr } = useTranslation();

  const [split,        setSplit]        = useState<SplitData | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState(false);

  useEffect(() => {
    (async () => {
      const { data: splitRow, error: e1 } = await supabase
        .from('bill_splits')
        .select('*')
        .eq('id', splitId)
        .single();
      if (e1 || !splitRow) {
        setError(true);
        setLoading(false);
        return;
      }
      setSplit(splitRow as SplitData);

      const { data: parts, error: e2 } = await supabase
        .from('bill_split_participants')
        .select('id, user_id, is_initiator, profiles(name, avatar_url)')
        .eq('split_id', splitId);
      if (e2) {
        setError(true);
        setLoading(false);
        return;
      }
      setParticipants(
        (parts ?? []).map((p: any) => ({
          id:           p.id,
          user_id:      p.user_id,
          is_initiator: p.is_initiator,
          name:         p.profiles?.name ?? '—',
          avatar_url:   p.profiles?.avatar_url ?? null,
        }))
      );
      setLoading(false);
    })();
  }, [splitId]);

  const s = StyleSheet.create({
    container:  { flex: 1, backgroundColor: t.bg, padding: 20 },
    header:     { fontSize: 22, fontFamily: FONTS.extraBold, fontWeight: '700', color: t.text, marginBottom: 20 },
    card:       { backgroundColor: t.surface, borderRadius: 16, padding: 16, marginBottom: 16 },
    row:        { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    rowLabel:   { fontSize: 15, color: t.textMute },
    rowValue:   { fontSize: 15, color: t.text, fontFamily: FONTS.semiBold, fontWeight: '600' },
    shareValue: { fontSize: 22, color: t.primary, fontFamily: FONTS.extraBold, fontWeight: '700' },
    sectionLbl: {
      fontSize: 13,
      color: t.textMute,
      fontFamily: FONTS.semiBold,
      fontWeight: '600',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 10,
    },
    pRow:       {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 10,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderColor: t.border,
    },
    pName:      { flex: 1, fontSize: 15, color: t.text, fontFamily: FONTS.medium, marginLeft: 12 },
    badge:      { fontSize: 12, color: t.primary, fontFamily: FONTS.semiBold, fontWeight: '600', marginLeft: 6 },
    centered:   { flex: 1, alignItems: 'center', justifyContent: 'center' },
    errText:    { color: t.textMute, fontSize: 15 },
  });

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator color={t.primary} size="large" />
      </View>
    );
  }

  if (error || !split) {
    return (
      <View style={s.centered}>
        <Text style={s.errText}>{tr('split_detail_loading_err')}</Text>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <Text style={s.header}>{tr('split_detail_title')}</Text>

      <View style={s.card}>
        <View style={s.row}>
          <Text style={s.rowLabel}>{tr('split_detail_total')}</Text>
          <Text style={s.rowValue}>
            {split.total_amount.toFixed(2)} {split.currency}
          </Text>
        </View>
        <View style={s.row}>
          <Text style={s.rowLabel}>{tr('split_detail_share')}</Text>
          <Text style={s.shareValue}>
            {split.share_amount.toFixed(2)} {split.currency}
          </Text>
        </View>
      </View>

      <Text style={s.sectionLbl}>{tr('split_detail_participants')}</Text>
      <FlatList
        data={participants}
        keyExtractor={p => p.id}
        renderItem={({ item }) => (
          <View style={s.pRow}>
            <Text style={s.pName}>{item.name}</Text>
            {item.is_initiator && (
              <Text style={s.badge}>{tr('split_detail_initiator')}</Text>
            )}
          </View>
        )}
      />
    </View>
  );
}
