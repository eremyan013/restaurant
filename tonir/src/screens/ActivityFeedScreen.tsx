import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, FlatList, Image, Pressable, StyleSheet, StatusBar,
  ActivityIndicator, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation'
import { useStore } from '../store'
import { useTranslation } from '../hooks/useTranslation'
import { supabase } from '../lib/supabase'
import { FONTS, COLORS } from '../theme'
import { Icon } from '../components/Icon'

type Nav = NativeStackNavigationProp<RootStackParamList, 'ActivityFeed'>

const PAGE_SIZE = 20

type FeedItem = {
  id: string
  actor_id: string
  event_type: 'review' | 'visited'
  venue_name: string | null
  rating: number | null
  visited_at: string | null
  created_at: string
  actorName: string
  actorAvatar: string | null
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60_000)
  const hours = Math.floor(diff / 3_600_000)
  const days  = Math.floor(diff / 86_400_000)
  if (mins < 1)   return 'just now'
  if (mins < 60)  return `${mins}m ago`
  if (hours < 24) return `${hours}h ago`
  if (days < 7)   return `${days}d ago`
  return new Date(iso).toLocaleDateString()
}

function AvatarCircle({ name, avatarUrl, size = 42 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = name.trim().split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
  if (avatarUrl) {
    return <Image source={{ uri: avatarUrl }} style={{ width: size, height: size, borderRadius: size / 2 }} accessibilityLabel={name} />
  }
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: COLORS.creamAlpha65, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ fontSize: size * 0.38, fontFamily: FONTS.semiBold, fontWeight: '600', color: COLORS.text }}>{initials}</Text>
    </View>
  )
}

export function ActivityFeedScreen({ navigation }: { navigation: Nav }) {
  const { theme: t } = useStore()
  const { tr, trf } = useTranslation()
  const insets = useSafeAreaInsets()

  const [items,   setItems]   = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page,    setPage]    = useState(0)
  const [hasMore, setHasMore] = useState(true)

  const fetchPage = useCallback(async (pageIndex: number, replace: boolean) => {
    if (replace) setLoading(true); else setLoadingMore(true)

    const { data } = await supabase
      .from('friend_activity_feed')
      .select('id, actor_id, event_type, venue_name, rating, visited_at, created_at, profiles!actor_id(name, avatar_url)')
      .order('created_at', { ascending: false })
      .range(pageIndex * PAGE_SIZE, pageIndex * PAGE_SIZE + PAGE_SIZE - 1)

    const rows: FeedItem[] = (data ?? []).map((r: any) => ({
      id:          r.id,
      actor_id:    r.actor_id,
      event_type:  r.event_type,
      venue_name:  r.venue_name,
      rating:      r.rating,
      visited_at:  r.visited_at,
      created_at:  r.created_at,
      actorName:   r.profiles?.name ?? '',
      actorAvatar: r.profiles?.avatar_url ?? null,
    }))

    if (replace) {
      setItems(rows)
    } else {
      setItems(prev => [...prev, ...rows])
    }
    setHasMore(rows.length === PAGE_SIZE)

    if (replace) setLoading(false); else setLoadingMore(false)
  }, [])

  useEffect(() => { fetchPage(0, true) }, [fetchPage])

  function handleLoadMore() {
    if (loadingMore || !hasMore) return
    const next = page + 1
    setPage(next)
    fetchPage(next, false)
  }

  function renderItem({ item }: { item: FeedItem }) {
    const eventText = item.event_type === 'review'
      ? trf('feed_review', { name: item.actorName, rating: String(item.rating ?? ''), venue: item.venue_name ?? '' })
      : trf('feed_visited', { name: item.actorName, venue: item.venue_name ?? '' })

    return (
      <Pressable
        onPress={() => { if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); navigation.navigate('PublicProfile', { userId: item.actor_id }) }}
        style={[styles.card, { backgroundColor: t.surface, borderColor: t.border }]}
        accessibilityRole="button"
        accessibilityLabel={eventText}
      >
        <AvatarCircle name={item.actorName} avatarUrl={item.actorAvatar} />
        <View style={{ flex: 1, gap: 3 }}>
          <Text style={[styles.eventText, { color: t.text }]} numberOfLines={2}>{eventText}</Text>
          <Text style={[styles.timeText, { color: t.textFaint }]}>{formatRelative(item.created_at)}</Text>
        </View>
        {item.event_type === 'review' && item.rating !== null && (
          <View style={[styles.ratingBadge, { backgroundColor: `${t.primary}15` }]}>
            <Icon name="star" size={12} color={t.primary} />
            <Text style={[styles.ratingText, { color: t.primary }]}>{item.rating}</Text>
          </View>
        )}
      </Pressable>
    )
  }

  return (
    <View style={[styles.container, { backgroundColor: t.bg, paddingTop: insets.top }]}>
      <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <View style={styles.header}>
        <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
          <View style={{ transform: [{ rotate: '180deg' }] }}>
            <Icon name="arrow" size={20} color={t.text} />
          </View>
        </Pressable>
        <Text style={[styles.title, { color: t.text }]}>{tr('feed_title')}</Text>
        <View style={styles.backBtn} />
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={items.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: t.textMute }]}>{tr('feed_empty')}</Text>
          }
          ListFooterComponent={loadingMore ? <ActivityIndicator color={t.primary} style={{ marginVertical: 16 }} /> : null}
        />
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
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40, gap: 10 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, fontFamily: FONTS.regular, textAlign: 'center' },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  eventText: { fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500', lineHeight: 20 },
  timeText: { fontSize: 12, fontFamily: FONTS.regular },
  ratingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  ratingText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700' },
})
