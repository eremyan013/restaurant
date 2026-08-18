import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { useStore } from '../store'

export type AcceptedFriend = {
  friendshipId: string
  userId:       string
  name:         string
  avatarUrl:    string | null
}

export type FriendRequest = {
  friendshipId: string
  requesterId:  string
  name:         string
  avatarUrl:    string | null
  createdAt:    string
}

export type SentRequest = {
  friendshipId: string
  addresseeId:  string
}

export function useFriends() {
  const { userId } = useStore()
  const [friends,          setFriends]          = useState<AcceptedFriend[]>([])
  const [incomingRequests, setIncomingRequests] = useState<FriendRequest[]>([])
  const [sentRequests,     setSentRequests]     = useState<SentRequest[]>([])
  const [loading,          setLoading]          = useState(true)

  const fetchAll = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    // Accepted friends (both directions)
    const { data: accepted } = await supabase
      .from('friendships')
      .select('id, requester_id, addressee_id, req:profiles!friendships_requester_id_fkey(name, avatar_url), adr:profiles!friendships_addressee_id_fkey(name, avatar_url)')
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
      .eq('status', 'accepted')

    // Incoming pending requests
    const { data: incoming } = await supabase
      .from('friendships')
      .select('id, requester_id, created_at, profiles!friendships_requester_id_fkey(name, avatar_url)')
      .eq('addressee_id', userId)
      .eq('status', 'pending')

    // Sent pending requests
    const { data: sent } = await supabase
      .from('friendships')
      .select('id, addressee_id')
      .eq('requester_id', userId)
      .eq('status', 'pending')

    const parsedFriends: AcceptedFriend[] = (accepted ?? []).map((row: any) => {
      const iAmRequester = row.requester_id === userId
      const other = iAmRequester ? row.adr : row.req
      const otherId = iAmRequester ? row.addressee_id : row.requester_id
      return { friendshipId: row.id, userId: otherId, name: other?.name ?? '', avatarUrl: other?.avatar_url ?? null }
    })

    const parsedIncoming: FriendRequest[] = (incoming ?? []).map((row: any) => ({
      friendshipId: row.id,
      requesterId:  row.requester_id,
      name:         row.profiles?.name ?? '',
      avatarUrl:    row.profiles?.avatar_url ?? null,
      createdAt:    row.created_at,
    }))

    const parsedSent: SentRequest[] = (sent ?? []).map((row: any) => ({
      friendshipId: row.id,
      addresseeId:  row.addressee_id,
    }))

    setFriends(parsedFriends)
    setIncomingRequests(parsedIncoming)
    setSentRequests(parsedSent)
    useStore.getState().setFriendRequestCount(parsedIncoming.length)
    setLoading(false)
  }, [userId])

  useEffect(() => { fetchAll() }, [fetchAll])

  function friendshipStatus(otherUserId: string): 'none' | 'pending_sent' | 'pending_received' | 'accepted' {
    if (friends.some(f => f.userId === otherUserId))               return 'accepted'
    if (sentRequests.some(r => r.addresseeId === otherUserId))     return 'pending_sent'
    if (incomingRequests.some(r => r.requesterId === otherUserId)) return 'pending_received'
    return 'none'
  }

  return {
    friends,
    incomingRequests,
    sentRequests,
    friendCount:     friends.length,
    friendshipStatus,
    loading,
    refetch:         fetchAll,
  }
}
