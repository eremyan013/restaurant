import React, { useState, useCallback } from 'react'
import {
  View, Text, TextInput, FlatList, Pressable, Image,
  StyleSheet, StatusBar, ActivityIndicator, Platform, Alert,
} from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import * as Haptics from 'expo-haptics'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { RootStackParamList } from '../navigation'
import { useStore } from '../store'
import { useTranslation } from '../hooks/useTranslation'
import { useFriends, AcceptedFriend, FriendRequest } from '../hooks/useFriends'
import { supabase } from '../lib/supabase'
import { FONTS, COLORS } from '../theme'
import { Icon } from '../components/Icon'

type Nav = NativeStackNavigationProp<RootStackParamList, 'Friends'>

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

type SearchResult = {
  id: string
  name: string
  avatar_url: string | null
}

type TabKey = 'friends' | 'requests' | 'find'

function AvatarCircle({ name, avatarUrl, size = 42 }: { name: string; avatarUrl: string | null; size?: number }) {
  const initials = name.trim().split(' ').map(w => w[0] ?? '').join('').slice(0, 2).toUpperCase()
  if (avatarUrl) {
    return (
      <Image
        source={{ uri: avatarUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        accessibilityLabel={name}
      />
    )
  }
  return (
    <View style={{
      width: size, height: size, borderRadius: size / 2,
      backgroundColor: COLORS.creamAlpha65,
      alignItems: 'center', justifyContent: 'center',
    }}>
      <Text style={{ fontSize: size * 0.38, fontFamily: FONTS.semiBold, fontWeight: '600', color: COLORS.text }}>
        {initials}
      </Text>
    </View>
  )
}

export function FriendsScreen({ navigation }: { navigation: Nav }) {
  const { theme: t, userId } = useStore()
  const { tr } = useTranslation()
  const insets = useSafeAreaInsets()
  const { friends, incomingRequests, friendshipStatus, loading, refetch } = useFriends()

  const [activeTab, setActiveTab] = useState<TabKey>('friends')
  const [searchText, setSearchText] = useState('')
  const [searchResults, setSearchResults] = useState<SearchResult[]>([])
  const [searching, setSearching] = useState(false)

  const TABS: Array<{ key: TabKey; label: string }> = [
    { key: 'friends',  label: tr('friends_tab_friends')  },
    { key: 'requests', label: tr('friends_tab_requests') },
    { key: 'find',     label: tr('friends_tab_find')     },
  ]

  const runSearch = useCallback(async (query: string) => {
    if (!query.trim()) { setSearchResults([]); return }
    setSearching(true)
    const stripped = query.replace(/[\s\-()]/g, '')
    const isPhone = /^\+/.test(query) || /^\d{6,}$/.test(stripped)

    let data: SearchResult[] | null = null
    if (isPhone) {
      const { data: rows } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .eq('phone', stripped)
        .limit(20)
      data = rows as SearchResult[] | null
    } else {
      const { data: rows } = await supabase
        .from('profiles')
        .select('id, name, avatar_url')
        .ilike('name', `%${query.trim()}%`)
        .neq('id', userId ?? '')
        .limit(20)
      data = rows as SearchResult[] | null
    }
    setSearchResults(data ?? [])
    setSearching(false)
  }, [userId])

  async function handleAdd(addresseeId: string) {
    haptic()
    await callEdgeFn('send-friend-request', { addressee_id: addresseeId })
    await refetch()
    await runSearch(searchText)
  }

  async function handleUnfriend(friendUserId: string) {
    haptic()
    await callEdgeFn('unfriend', { friend_user_id: friendUserId })
    await refetch()
    await runSearch(searchText)
  }

  async function handleRespond(friendshipId: string, action: 'accept' | 'decline') {
    haptic()
    await callEdgeFn('respond-friend-request', { friendship_id: friendshipId, action })
    await refetch()
  }

  function renderFriend({ item }: { item: AcceptedFriend }) {
    return (
      <Pressable
        style={[styles.row, { borderBottomColor: t.border }]}
        onPress={() => { haptic(); navigation.navigate('PublicProfile', { userId: item.userId }) }}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <AvatarCircle name={item.name} avatarUrl={item.avatarUrl} />
        <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>{item.name || '—'}</Text>
        <Pressable
          onPress={() => handleUnfriend(item.userId)}
          style={[styles.actionBtn, { borderColor: t.border }]}
          accessibilityRole="button"
          accessibilityLabel={tr('friends_remove')}
        >
          <Text style={[styles.actionBtnText, { color: t.textMute }]}>{tr('friends_remove')}</Text>
        </Pressable>
      </Pressable>
    )
  }

  function renderRequest({ item }: { item: FriendRequest }) {
    return (
      <Pressable
        style={[styles.row, { borderBottomColor: t.border }]}
        onPress={() => { haptic(); navigation.navigate('PublicProfile', { userId: item.requesterId }) }}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <AvatarCircle name={item.name} avatarUrl={item.avatarUrl} />
        <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>{item.name || '—'}</Text>
        <View style={styles.twoButtons}>
          <Pressable
            onPress={() => handleRespond(item.friendshipId, 'accept')}
            style={[styles.actionBtn, { backgroundColor: t.primary, borderColor: t.primary }]}
            accessibilityRole="button"
            accessibilityLabel={tr('friends_accept')}
          >
            <Text style={[styles.actionBtnText, { color: COLORS.cream }]}>{tr('friends_accept')}</Text>
          </Pressable>
          <Pressable
            onPress={() => handleRespond(item.friendshipId, 'decline')}
            style={[styles.actionBtn, { borderColor: t.border }]}
            accessibilityRole="button"
            accessibilityLabel={tr('friends_decline')}
          >
            <Text style={[styles.actionBtnText, { color: t.textMute }]}>{tr('friends_decline')}</Text>
          </Pressable>
        </View>
      </Pressable>
    )
  }

  function renderSearchResult({ item }: { item: SearchResult }) {
    const status = friendshipStatus(item.id)
    return (
      <Pressable
        style={[styles.row, { borderBottomColor: t.border }]}
        onPress={() => { haptic(); navigation.navigate('PublicProfile', { userId: item.id }) }}
        accessibilityRole="button"
        accessibilityLabel={item.name}
      >
        <AvatarCircle name={item.name} avatarUrl={item.avatar_url} />
        <Text style={[styles.rowName, { color: t.text }]} numberOfLines={1}>{item.name || '—'}</Text>
        {status === 'none' && (
          <Pressable
            onPress={() => handleAdd(item.id)}
            style={[styles.actionBtn, { backgroundColor: t.primary, borderColor: t.primary }]}
            accessibilityRole="button"
            accessibilityLabel={tr('friends_add')}
          >
            <Text style={[styles.actionBtnText, { color: COLORS.cream }]}>{tr('friends_add')}</Text>
          </Pressable>
        )}
        {status === 'pending_sent' && (
          <Pressable
            onPress={() => handleUnfriend(item.id)}
            style={[styles.actionBtn, { borderColor: t.border }]}
            accessibilityRole="button"
            accessibilityLabel={tr('friends_pending')}
          >
            <Text style={[styles.actionBtnText, { color: t.textMute }]}>{tr('friends_pending')}</Text>
          </Pressable>
        )}
        {status === 'pending_received' && (
          <Pressable
            onPress={async () => {
              // find the friendship id for this requester
              const { data } = await supabase
                .from('friendships')
                .select('id')
                .eq('requester_id', item.id)
                .eq('addressee_id', userId ?? '')
                .eq('status', 'pending')
                .single()
              if (data) await handleRespond((data as any).id, 'accept')
            }}
            style={[styles.actionBtn, { backgroundColor: t.primary, borderColor: t.primary }]}
            accessibilityRole="button"
            accessibilityLabel={tr('friends_accept')}
          >
            <Text style={[styles.actionBtnText, { color: COLORS.cream }]}>{tr('friends_accept')}</Text>
          </Pressable>
        )}
        {status === 'accepted' && (
          <Text style={[styles.actionBtnText, { color: t.primary }]}>{tr('friends_tab_friends')}</Text>
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
        <Text style={[styles.title, { color: t.text }]}>{tr('friends_title')}</Text>
        <View style={styles.backBtn} />
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: t.border }]}>
        {TABS.map(tab => (
          <Pressable
            key={tab.key}
            onPress={() => { haptic(); setActiveTab(tab.key) }}
            style={[styles.tabItem, activeTab === tab.key && { borderBottomColor: t.primary, borderBottomWidth: 2 }]}
            accessibilityRole="tab"
            accessibilityState={{ selected: activeTab === tab.key }}
          >
            <Text style={[
              styles.tabLabel,
              { color: activeTab === tab.key ? t.primary : t.textMute },
            ]}>
              {tab.label}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Content */}
      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator color={t.primary} />
        </View>
      ) : activeTab === 'friends' ? (
        <FlatList
          data={friends}
          keyExtractor={item => item.friendshipId}
          renderItem={renderFriend}
          contentContainerStyle={friends.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: t.textMute }]}>{tr('friends_empty')}</Text>
          }
        />
      ) : activeTab === 'requests' ? (
        <FlatList
          data={incomingRequests}
          keyExtractor={item => item.friendshipId}
          renderItem={renderRequest}
          contentContainerStyle={incomingRequests.length === 0 ? styles.emptyContainer : styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <Text style={[styles.emptyText, { color: t.textMute }]}>{tr('friends_requests_empty')}</Text>
          }
        />
      ) : (
        /* Find tab */
        <View style={{ flex: 1 }}>
          <View style={[styles.searchWrap, { backgroundColor: t.surface, borderColor: t.border }]}>
            <Icon name="search" size={16} color={t.textMute} />
            <TextInput
              style={[styles.searchInput, { color: t.text }]}
              placeholder={tr('friends_find_placeholder')}
              placeholderTextColor={t.textFaint}
              value={searchText}
              onChangeText={text => {
                setSearchText(text)
                runSearch(text)
              }}
              returnKeyType="search"
              onSubmitEditing={() => runSearch(searchText)}
              autoCapitalize="none"
              accessibilityLabel={tr('friends_find_placeholder')}
            />
            {searching && <ActivityIndicator size="small" color={t.primary} />}
          </View>
          <FlatList
            data={searchResults}
            keyExtractor={item => item.id}
            renderItem={renderSearchResult}
            contentContainerStyle={searchResults.length === 0 && searchText.trim() ? styles.emptyContainer : styles.listContent}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              searchText.trim() && !searching
                ? <Text style={[styles.emptyText, { color: t.textMute }]}>{tr('friends_find_empty')}</Text>
                : null
            }
          />
        </View>
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
  tabBar: {
    flexDirection: 'row',
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  tabLabel: { fontSize: 14, fontFamily: FONTS.medium, fontWeight: '500' },
  listContent: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 40 },
  emptyContainer: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingTop: 80 },
  emptyText: { fontSize: 15, fontFamily: FONTS.regular, textAlign: 'center' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rowName: { flex: 1, fontSize: 15, fontFamily: FONTS.medium, fontWeight: '500' },
  twoButtons: { flexDirection: 'row', gap: 8 },
  actionBtn: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  actionBtnText: { fontSize: 13, fontFamily: FONTS.semiBold, fontWeight: '600' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginHorizontal: 20,
    marginVertical: 12,
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 15, padding: 0, fontFamily: FONTS.regular },
})
