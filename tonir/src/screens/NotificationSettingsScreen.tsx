import React, { useState, useEffect } from 'react'
import { View, Text, Switch, ScrollView, Pressable, StyleSheet, StatusBar, ActivityIndicator, Platform } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation'
import { useStore } from '../store'
import { useTranslation } from '../hooks/useTranslation'
import { supabase } from '../lib/supabase'
import { FONTS, COLORS } from '../theme'
import { Icon } from '../components/Icon'

type Nav = NativeStackNavigationProp<RootStackParamList, 'NotificationSettings'>

type Prefs = {
  notif_booking_updates: boolean
  notif_reminders: boolean
  notif_review_prompt: boolean
}

export function NotificationSettingsScreen({ navigation }: { navigation: Nav }) {
  const insets = useSafeAreaInsets()
  const { theme: t, dark, userId } = useStore()
  const { tr } = useTranslation()
  const [prefs, setPrefs] = useState<Prefs | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return
    supabase
      .from('profiles')
      .select('notif_booking_updates, notif_reminders, notif_review_prompt')
      .eq('id', userId)
      .single()
      .then(({ data }) => {
        if (data) setPrefs(data as Prefs)
        setLoading(false)
      })
  }, [userId])

  async function handleToggle(col: keyof Prefs, value: boolean) {
    if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
    setPrefs(p => p ? { ...p, [col]: value } : p)
    const { error } = await (supabase as any)
      .from('profiles')
      .update({ [col]: value })
      .eq('id', userId)
    if (error) {
      setPrefs(p => p ? { ...p, [col]: !value } : p)
    }
  }

  const ROWS: Array<{ col: keyof Prefs; labelKey: string; subKey: string }> = [
    { col: 'notif_booking_updates', labelKey: 'notif_settings_bookings',  subKey: 'notif_settings_bookings_sub'  },
    { col: 'notif_reminders',       labelKey: 'notif_settings_reminders', subKey: 'notif_settings_reminders_sub' },
    { col: 'notif_review_prompt',   labelKey: 'notif_settings_reviews',   subKey: 'notif_settings_reviews_sub'   },
  ]

  return (
    <View style={[styles.container, { backgroundColor: t.bg, paddingTop: insets.top }]}>
      <StatusBar barStyle={dark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12}>
          <Icon name="arrow" size={20} color={t.text} style={{ transform: [{ rotate: '180deg' }] }} />
        </Pressable>
        <Text style={[styles.title, { color: t.text }]}>{tr('notif_settings_title')}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={[styles.list, { backgroundColor: t.surface, borderColor: t.border }]}>
            {ROWS.map((row, i) => (
              <View key={row.col}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: t.border }]} />}
                <View style={styles.row}>
                  <View style={[styles.iconTile, { backgroundColor: `${t.primary}18` }]}>
                    <Icon name="sparkle" size={17} color={t.primary} strokeWidth={1.8} />
                  </View>
                  <View style={styles.rowText}>
                    <Text style={[styles.label, { color: t.text }]}>{tr(row.labelKey)}</Text>
                    <Text style={[styles.sub, { color: t.textMute }]}>{tr(row.subKey)}</Text>
                  </View>
                  <Switch
                    value={prefs?.[row.col] ?? true}
                    onValueChange={(v) => handleToggle(row.col, v)}
                    trackColor={{ false: t.border, true: t.primary }}
                    thumbColor={COLORS.cream}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  backBtn: { width: 36, alignItems: 'flex-start' },
  title: { fontSize: 17, fontFamily: FONTS.semiBold, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  content: { padding: 20 },
  list: {
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    overflow: 'hidden',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 12,
  },
  iconTile: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowText: { flex: 1 },
  label: { fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500' },
  sub: { fontSize: 12, fontFamily: FONTS.regular, marginTop: 2 },
  divider: { height: StyleSheet.hairlineWidth, marginLeft: 62 },
})
