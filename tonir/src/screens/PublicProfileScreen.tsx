import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, Image, FlatList, Pressable,
  StyleSheet, StatusBar, ActivityIndicator, Platform,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { NativeStackScreenProps } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation'
import { useStore } from '../store'
import { useTranslation } from '../hooks/useTranslation'
import { useFriends } from '../hooks/useFriends'
import { supabase } from '../lib/supabase'
import { FONTS, COLORS } from '../theme'
import { Icon } from '../components/Icon'

type Props = NativeStackScreenProps<RootStackParamList, 'PublicProfile'>

const EDGE_FN_BASE = 'https://gxsfdejeoekqlnjzudga.supabase.co/functions/v1'

const haptic = () => {
  if (Platform.OS !== 'web') Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light)
}

async function getToken(): Promise<string> {
  const { data: { session } } = await supabase.auth.getSession()
  return session?.access_token ?? ''
}

async function callEdgeFn(path: string, body: Record<string, unknown>): Promise<void> {
  const token = await getToken()
  await fetch(`${EDGE_FN_BASE}/${path}`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
}

type PublicProfile = {
  name: string
  avatar_url: string | null
  tier: string
  total_visits: number
}

type Review = {
  id: string
  rating: number
  comment: string | null
  created_at: string
  venues: { name: string } | null
}

export function PublicProfileScreen({ route, navigation }: Props) {
  const { userId: targetUserId } = route.params
  const { theme: t } = useStore()
  const { tr, trf } = useTranslation()
  const insets = useSafeAreaInsets()
  const { friendshipStatus, refetch: refetchFriends } = useFriends()

  const [profile,       setProfile]       = useState<PublicProfile | null>(null)
  const [reviews,       setReviews]       = useState<Review[]>([])
  const [visitedCount,  setVisitedCount]  = useState(0)
  const [loading,       setLoading]       = useState(true)
  const [notAvailable,  setNotAvailable]  = useState(false)

  const fetchProfile = useCallback(async () => {
    setLoading(true)

    const { data: profileData } = await supabase
      .from('profiles')
      .select('name, avatar_url, tier, total_visits')
      .eq('id', targetUserId)
      .eq('profile_visible', true)
      .single()

    if (!profileData) {
      setNotAvailable(true)
      setLoading(false)
      return
    }

    setProfile(profileData as PublicProfile)

    const [reviewsResult, countResult] = await Promise.all([
      supabase
        .from('reviews')
        .select('id, rating, comment, created_at, venues(name)')
        .eq('user_id', targetUserId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10),
      supabase
        .from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', targetUserId)
        .eq('status', 'visited'),
    ])

    setReviews((reviewsResult.data ?? []) as Review[])
    setVisitedCount(countResult.count ?? 0)
    setLoading(false)
  }, [targetUserId])

  useEffect(() => { fetchProfile() }, [fetchProfile])

  async function handleSendRequest() {
    haptic()
    await callEdgeFn('send-friend-request', { addressee_id: targetUserId })
    await refetchFriends()
  }

  async function handleUnfriend() {
    haptic()
    await callEdgeFn('unfriend', { friend_user_id: targetUserId })
    await refetchFriends()
  }

  async function handleAccept() {
    haptic()
    const { data } = await supabase
      .from('friendships')
      .select('id')
      .eq('requester_id', targetUserId)
      .eq('status', 'pending')
      .single()
    if (data) {
      await callEdgeFn('respond-friend-request', { friendship_id: (data as any).id, action: 'accept' })
      await refetchFriends()
    }
  }

  const status = friendshipStatus(targetUserId)

  function renderFriendButton() {
    switch (status) {
      case 'none':
        return (
          <Pressable
            onPress={handleSendRequest}
            style={[styles.friendBtn, { backgroundColor: t.primary }]}
            accessibilityRole="button"
            accessibilityLabel={tr('friends_add')}
          >
            <Icon name="users" size={16} color={COLORS.cream} />
            <Text style={[styles.friendBtnText, { color: COLORS.cream }]}>{tr('friends_add')}</Text>
          </Pressable>
        )
      case 'pending_sent':
        return (
          <Pressable
            onPress={handleUnfriend}
            style={[styles.friendBtn, { borderColor: t.border, borderWidth: 1 }]}
            accessibilityRole="button"
            accessibilityLabel={tr('friends_pending')}
          >
            <Text style={[styles.friendBtnText, { color: t.textMute }]}>{tr('friends_pending')}</Text>
          </Pressable>
        )
      case 'pending_received':
        return (
          <Pressable
            onPress={handleAccept}
            style={[styles.friendBtn, { backgroundColor: t.primary }]}
            accessibilityRole="button"
            accessibilityLabel={tr('friends_accept')}
          >
            <Text style={[styles.friendBtnText, { color: COLORS.cream }]}>{tr('friends_accept')}</Text>
          </Pressable>
        )
      case 'accepted':
        return (
          <View style={styles.acceptedRow}>
            <View style={[styles.friendBtn, { backgroundColor: `${t.primary}18` }]}>
              <Icon name="check" size={14} color={t.primary} strokeWidth={2.5} />
              <Text style={[styles.friendBtnText, { color: t.primary }]}>{tr('friends_tab_friends')}</Text>
            </View>
            <Pressable
              onPress={handleUnfriend}
              style={[styles.unfriendBtn, { borderColor: t.border }]}
              accessibilityRole="button"
              accessibilityLabel={tr('friends_remove')}
            >
              <Text style={[styles.unfriendBtnText, { color: t.textMute }]}>{tr('friends_remove')}</Text>
            </Pressable>
          </View>
        )
    }
  }

  function renderReview({ item }: { item: Review }) {
    return (
      <View style={[styles.reviewCard, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={styles.reviewHeader}>
          <View style={[styles.ratingBadge, { backgroundColor: `${t.primary}15` }]}>
            <Icon name="star" size={11} color={t.primary} />
            <Text style={[styles.ratingText, { color: t.primary }]}>{item.rating}</Text>
          </View>
          {item.venues?.name && (
            <Text style={[styles.venueName, { color: t.textMute }]} numberOfLines={1}>{item.venues.name}</Text>
          )}
        </View>
        {item.comment && (
          <Text style={[styles.reviewComment, { color: t.text }]} numberOfLines={3}>{item.comment}</Text>
        )}
        <Text style={[styles.reviewDate, { color: t.textFaint }]}>
          {new Date(item.created_at).toLocaleDateString()}
        </Text>
      </View>
    )
  }

  const ListHeader = () => (
    <View style={{ gap: 16, paddingBottom: 8 }}>
      {/* Avatar + name */}
      <View style={styles.heroSection}>
        {profile?.avatar_url ? (
          <Image source={{ uri: profile.avatar_url }} style={styles.heroAvatar} accessibilityLabel={profile.name} />
        ) : (
          <View style={[styles.heroAvatar, styles.heroAvatarFallback, { backgroundColor: t.surface }]}>
            <Icon name="user" size={40} color={t.textMute} />
          </View>
        )}
        <Text style={[styles.heroName, { color: t.text }]}>{profile?.name ?? ''}</Text>
        {profile?.tier && (
          <View style={[styles.tierBadge, { backgroundColor: `${t.accent}20` }]}>
            <Text style={[styles.tierText, { color: t.accent }]}>{profile.tier}</Text>
          </View>
        )}
      </View>

      {/* Stats row */}
      <View style={[styles.statsRow, { backgroundColor: t.surface, borderColor: t.border }]}>
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: t.text }]}>{visitedCount}</Text>
          <Text style={[styles.statLabel, { color: t.textMute }]}>{tr('res_tab_past')}</Text>
        </View>
        <View style={[styles.statDivider, { backgroundColor: t.border }]} />
        <View style={styles.statItem}>
          <Text style={[styles.statNumber, { color: t.text }]}>{reviews.length}</Text>
          <Text style={[styles.statLabel, { color: t.textMute }]}>{tr('det_reviews_suffix')}</Text>
        </View>
      </View>

      {/* Friend button */}
      <View>{renderFriendButton()}</View>

      {reviews.length > 0 && (
        <Text style={[styles.sectionTitle, { color: t.text }]}>{tr('det_reviews_suffix')}</Text>
      )}
    </View>
  )

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg, paddingTop: insets.top }]}>
        <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="arrow" size={20} color={t.text} />
            </View>
          </Pressable>
          <Text style={[styles.title, { color: t.text }]}>{tr('public_profile_title')}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <ActivityIndicator color={t.primary} size="large" />
        </View>
      </View>
    )
  }

  if (notAvailable) {
    return (
      <View style={[styles.container, { backgroundColor: t.bg, paddingTop: insets.top }]}>
        <StatusBar barStyle={t.dark ? 'light-content' : 'dark-content'} />
        <View style={styles.header}>
          <Pressable onPress={() => navigation.goBack()} style={styles.backBtn} hitSlop={12} accessibilityRole="button" accessibilityLabel="Back">
            <View style={{ transform: [{ rotate: '180deg' }] }}>
              <Icon name="arrow" size={20} color={t.text} />
            </View>
          </Pressable>
          <Text style={[styles.title, { color: t.text }]}>{tr('public_profile_title')}</Text>
          <View style={styles.backBtn} />
        </View>
        <View style={styles.center}>
          <Icon name="eyeOff" size={36} color={t.textFaint} />
          <Text style={[styles.unavailableText, { color: t.textMute }]}>Profile not available</Text>
        </View>
      </View>
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
        <Text style={[styles.title, { color: t.text }]}>{tr('public_profile_title')}</Text>
        <View style={styles.backBtn} />
      </View>

      <FlatList
        data={reviews}
        keyExtractor={item => item.id}
        renderItem={renderReview}
        ListHeaderComponent={ListHeader}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      />
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
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 60 },
  heroSection: { alignItems: 'center', gap: 10, paddingTop: 12 },
  heroAvatar: { width: 88, height: 88, borderRadius: 44 },
  heroAvatarFallback: { alignItems: 'center', justifyContent: 'center' },
  heroName: { fontSize: 22, fontFamily: FONTS.bold, fontWeight: '700', textAlign: 'center' },
  tierBadge: { paddingVertical: 4, paddingHorizontal: 12, borderRadius: 999 },
  tierText: { fontSize: 11, fontFamily: FONTS.bold, fontWeight: '700', letterSpacing: 0.5 },
  statsRow: {
    flexDirection: 'row',
    borderRadius: 18,
    borderWidth: 1,
    overflow: 'hidden',
  },
  statItem: { flex: 1, alignItems: 'center', paddingVertical: 16, gap: 4 },
  statNumber: { fontSize: 22, fontFamily: FONTS.bold, fontWeight: '700' },
  statLabel: { fontSize: 12, fontFamily: FONTS.regular },
  statDivider: { width: StyleSheet.hairlineWidth },
  friendBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 13,
    borderRadius: 14,
  },
  friendBtnText: { fontSize: 15, fontFamily: FONTS.semiBold, fontWeight: '600' },
  acceptedRow: { gap: 10 },
  unfriendBtn: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  unfriendBtnText: { fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500' },
  sectionTitle: { fontSize: 16, fontFamily: FONTS.bold, fontWeight: '700', paddingTop: 4 },
  reviewCard: {
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    gap: 6,
  },
  reviewHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  ratingBadge: { flexDirection: 'row', alignItems: 'center', gap: 3, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  ratingText: { fontSize: 12, fontFamily: FONTS.bold, fontWeight: '700' },
  venueName: { flex: 1, fontSize: 13, fontFamily: FONTS.medium, fontWeight: '500' },
  reviewComment: { fontSize: 14, fontFamily: FONTS.regular, lineHeight: 20 },
  reviewDate: { fontSize: 12, fontFamily: FONTS.regular },
  unavailableText: { fontSize: 16, fontFamily: FONTS.medium, fontWeight: '500', textAlign: 'center' },
})
