import { supabase as _supabase } from './supabase';
import { TIER_NAME_FALLBACKS, TIER_MIN_FALLBACKS } from './constants';

const ADMIN_URL = process.env.EXPO_PUBLIC_CONCIERGE_URL?.replace(/\/$/, '');
import { VenueRow, ReservationRow, ProfileRow, MenuCategoryRow, MenuItemRow, GuideRow, VenueHoursRow, VenueBlockedDateRow, LocationRow, OccasionRow, BannerRow } from './database.types';

// Cast to any to escape Supabase TS generic inference issue with this package version.
// All public functions carry explicit return type annotations for safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = _supabase as any;

// ─────────────────────────────────────────────
// VENUES
// ─────────────────────────────────────────────

export async function fetchOccasions(): Promise<OccasionRow[]> {
  const { data, error } = await sb
    .from('occasions')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as OccasionRow[];
}

export async function fetchLocations(): Promise<LocationRow[]> {
  const { data, error } = await sb
    .from('locations')
    .select('*')
    .eq('is_active', true)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as LocationRow[];
}

export async function fetchVenues(locationId?: string | null): Promise<VenueRow[]> {
  let query = sb.from('venues').select('*').order('rating', { ascending: false });
  if (locationId) query = query.eq('location_id', locationId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as VenueRow[];
}

export async function fetchVenueById(id: string): Promise<VenueRow | null> {
  const { data, error } = await sb.from('venues').select('*').eq('id', id).single();
  if (error) throw error;
  return data as VenueRow | null;
}

export async function searchVenues(query: string): Promise<VenueRow[]> {
  const { data, error } = await sb
    .from('venues')
    .select('*')
    .or(`name.ilike.%${query}%,cuisine.ilike.%${query}%,area.ilike.%${query}%`);
  if (error) throw error;
  return (data ?? []) as VenueRow[];
}

export async function fetchVenuesByKind(kind: string): Promise<VenueRow[]> {
  const { data, error } = await sb.from('venues').select('*').eq('kind', kind);
  if (error) throw error;
  return (data ?? []) as VenueRow[];
}

// ─────────────────────────────────────────────
// FAVORITES
// ─────────────────────────────────────────────

export async function fetchFavorites(userId: string): Promise<string[]> {
  const { data, error } = await sb.from('favorites').select('venue_id').eq('user_id', userId);
  if (error) throw error;
  return ((data ?? []) as Array<{ venue_id: string }>).map((f) => f.venue_id);
}

export async function addFavorite(userId: string, venueId: string): Promise<void> {
  const { error } = await sb.from('favorites').insert({ user_id: userId, venue_id: venueId });
  if (error) throw error;
}

export async function removeFavorite(userId: string, venueId: string): Promise<void> {
  const { error } = await sb.from('favorites').delete().eq('user_id', userId).eq('venue_id', venueId);
  if (error) throw error;
}

// ─────────────────────────────────────────────
// RESERVATIONS
// ─────────────────────────────────────────────

export async function fetchReservations(userId: string): Promise<ReservationRow[]> {
  const { data, error } = await sb
    .from('reservations')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as ReservationRow[];
}

export type CreateReservationPayload = Omit<ReservationRow, 'id' | 'created_at' | 'updated_at'>;

export type CreateReservationResult =
  | { data: { reservation_id: string }; error: null }
  | { data: null; error: string };

const EDGE_ERROR_KEY: Record<string, string> = {
  no_availability:              'err_no_availability',
  cancellation_deadline_passed: 'err_cancellation_deadline_passed',
  invalid_token:                'err_invalid_token',
  already_confirmed:            'err_already_confirmed',
  already_cancelled:            'err_already_cancelled',
};

function mapEdgeError(raw: unknown, fallbackKey: string, tr: (k: string) => string): string {
  if (typeof raw === 'string' && EDGE_ERROR_KEY[raw]) return tr(EDGE_ERROR_KEY[raw]!);
  if (typeof raw === 'object' && raw !== null) {
    const code = (raw as Record<string, unknown>)['code'] ?? (raw as Record<string, unknown>)['error'];
    if (typeof code === 'string' && EDGE_ERROR_KEY[code]) return tr(EDGE_ERROR_KEY[code]!);
  }
  return tr(fallbackKey);
}

export async function createReservation(
  payload: CreateReservationPayload,
  tr: (k: string) => string
): Promise<CreateReservationResult> {
  const { data, error } = await sb.functions.invoke('create-reservation', { body: payload });
  if (error) {
    return { data: null, error: mapEdgeError(error?.context, 'err_booking_failed', tr) };
  }
  const id = (data as Record<string, unknown>)?.reservation_id ?? (data as Record<string, unknown>)?.id;
  if (!id) {
    return { data: null, error: tr('err_booking_failed') };
  }
  return { data: { reservation_id: String(id) }, error: null };
}

export async function cancelReservation(id: string): Promise<void> {
  const { error } = await sb.from('reservations').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
}

export type ReservationActionResult =
  | { data: { status: string }; error: null }
  | { data: null; error: string };

export async function confirmReservationByToken(
  token: string,
  tr: (k: string) => string
): Promise<ReservationActionResult> {
  const { data, error } = await sb.functions.invoke('confirm-reservation', { body: { token } });
  if (error) {
    return { data: null, error: mapEdgeError(error?.context, 'err_confirm_failed', tr) };
  }
  return { data: { status: (data as Record<string, unknown>)?.status as string ?? 'confirmed' }, error: null };
}

export async function cancelReservationByToken(
  token: string,
  tr: (k: string) => string
): Promise<ReservationActionResult> {
  const { data, error } = await sb.functions.invoke('cancel-reservation', { body: { token } });
  if (error) {
    return { data: null, error: mapEdgeError(error?.context, 'err_cancel_failed', tr) };
  }
  return { data: { status: (data as Record<string, unknown>)?.status as string ?? 'cancelled' }, error: null };
}

// ─────────────────────────────────────────────
// PROFILE
// ─────────────────────────────────────────────

export async function fetchProfile(userId: string): Promise<ProfileRow | null> {
  const { data, error } = await sb.from('profiles').select('*').eq('id', userId).single();
  if (error) return null;
  return data as ProfileRow | null;
}

export async function updateProfile(
  userId: string,
  updates: Partial<Pick<ProfileRow, 'name' | 'avatar_url' | 'surname' | 'date_of_birth'>>
): Promise<void> {
  const { error } = await sb.from('profiles').update(updates).eq('id', userId);
  if (error) throw error;
}

export async function syncLanguage(userId: string, lang: string): Promise<void> {
  const { error } = await sb.from('profiles').update({ language: lang }).eq('id', userId);
  if (error) console.warn('[syncLanguage]', error.message);
}

export async function updateReservationOccasion(
  userId: string,
  venueId: string,
  dateIso: string,
  time: string,
  occasion: string | null,
): Promise<void> {
  const { error } = await sb
    .from('reservations')
    .update({ occasion })
    .eq('user_id', userId)
    .eq('venue_id', venueId)
    .eq('date_iso', dateIso)
    .eq('time', time);
  if (error) console.warn('[updateReservationOccasion]', error.message);
}

export async function uploadAvatar(userId: string, localUri: string): Promise<string> {
  const response = await fetch(localUri);
  const blob = await response.blob();
  const path = `${userId}/avatar`;
  const { error } = await sb.storage.from('avatars').upload(path, blob, {
    upsert: true,
    contentType: blob.type || 'image/jpeg',
  });
  if (error) throw error;
  const { data: { publicUrl } } = sb.storage.from('avatars').getPublicUrl(path);
  return publicUrl;
}

// ─────────────────────────────────────────────
// REVIEWS
// ─────────────────────────────────────────────

export async function submitReview(
  userId: string,
  venueId: string,
  reservationId: string,
  rating: number,
  comment: string,
  isAnonymous: boolean = false,
): Promise<void> {
  const { error } = await sb.from('reviews').insert({
    user_id: userId,
    venue_id: venueId,
    reservation_id: reservationId,
    rating,
    comment: comment.trim() || null,
    is_anonymous: isAnonymous,
  });
  if (error) throw error;
}

export async function fetchMyReviews(userId: string): Promise<string[]> {
  const { data } = await sb
    .from('reviews')
    .select('reservation_id')
    .eq('user_id', userId);
  return ((data ?? []) as Array<{ reservation_id: string }>).map((r) => r.reservation_id);
}

export type VenueReview = {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  author_name: string | null;
};

export async function fetchVenueReviews(venueId: string): Promise<VenueReview[]> {
  const { data: reviews } = await sb
    .from('reviews')
    .select('id, user_id, rating, comment, created_at, is_anonymous')
    .eq('venue_id', venueId)
    .eq('status', 'approved')
    .order('created_at', { ascending: false })
    .limit(30);

  if (!reviews || reviews.length === 0) return [];

  const userIds = [...new Set((reviews as any[]).map((r: any) => r.user_id))];
  const { data: profiles } = await sb
    .from('profiles')
    .select('id, name')
    .in('id', userIds as any);

  const profileMap: Record<string, string> = Object.fromEntries(
    ((profiles ?? []) as any[]).map((p: any) => [p.id, p.name])
  );

  return (reviews as any[]).map((r: any) => ({
    id: r.id,
    rating: r.rating,
    comment: r.comment ?? null,
    created_at: r.created_at,
    author_name: r.is_anonymous ? null : (profileMap[r.user_id] ?? null),
  }));
}

// ─────────────────────────────────────────────
// ADMIN NOTIFICATIONS
// ─────────────────────────────────────────────

export async function notifyAdminsNewReservation(
  venueName: string,
  date: string,
  time: string,
  people: number,
): Promise<void> {
  if (!ADMIN_URL) return;
  await fetch(`${ADMIN_URL}/api/reservations/notify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ venue_name: venueName, date, time, people }),
  });
}

// ─────────────────────────────────────────────
// GUIDES
// ─────────────────────────────────────────────

export async function fetchGuides(): Promise<GuideRow[]> {
  const { data, error } = await sb
    .from('guides')
    .select('*')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as GuideRow[];
}

// ─────────────────────────────────────────────
// PRIZES
// ─────────────────────────────────────────────

export type Prize = {
  id: string;
  name: string;
  description: string | null;
  type: 'discount' | 'free_item' | 'experience' | 'voucher';
  unlock_type: 'points' | 'tier';
  points_cost: number | null;
  min_tier_level: number | null;
  venue_id: string | null;
  image_url: string | null;
  stock: number | null;
  sort_order: number;
  expires_at: string | null;
};

export type UserPrize = {
  id: string;
  prize_id: string;
  status: 'active' | 'used' | 'expired';
  code: string | null;
  claimed_at: string;
  used_at: string | null;
  prize: Prize & { venues: { name: string } | null };
};

export async function fetchMarketPrizes(): Promise<Prize[]> {
  const { data, error } = await sb
    .from('prizes')
    .select('*')
    .eq('unlock_type', 'points')
    .eq('is_active', true)
    .order('sort_order');
  if (error) throw error;
  return (data ?? []) as Prize[];
}

export async function fetchUserPrizes(userId: string): Promise<UserPrize[]> {
  const { data, error } = await sb
    .from('user_prizes')
    .select('*, prize:prizes(*, venues(name))')
    .eq('user_id', userId)
    .order('claimed_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as UserPrize[];
}

export async function redeemPrize(
  userId: string,
  prizeId: string,
): Promise<{ success: true; code: string; new_points: number } | { error: string }> {
  const { data, error } = await sb.rpc('redeem_prize', {
    p_user_id: userId,
    p_prize_id: prizeId,
  });
  if (error) return { error: error.message };
  return data as { success: true; code: string; new_points: number } | { error: string };
}

export async function fetchTierSettings(): Promise<{
  names: Record<number, string>;
  mins: Record<number, number>;
}> {
  const { data } = await sb
    .from('settings')
    .select('key, value')
    .in('key', ['tier_1_name','tier_2_name','tier_3_name','tier_4_name','tier_2_min','tier_3_min','tier_4_min']);
  const names: Record<number, string> = { ...TIER_NAME_FALLBACKS };
  const mins:  Record<number, number> = { ...TIER_MIN_FALLBACKS };
  for (const row of (data ?? [])) {
    if (row.key.endsWith('_name')) { const l = parseInt(row.key[5]); if (l >= 1 && l <= 4) names[l] = row.value; }
    if (row.key.endsWith('_min'))  { const l = parseInt(row.key[5]); if (l >= 2 && l <= 4) mins[l]  = parseInt(row.value); }
  }
  return { names, mins };
}

// ─────────────────────────────────────────────
// MENU
// ─────────────────────────────────────────────

// ─────────────────────────────────────────────
// RESERVATION COUNT (for detail screen)
// ─────────────────────────────────────────────

export async function fetchTodayBookingCounts(): Promise<Record<string, number>> {
  const today = new Date().toISOString().split('T')[0]!;
  const { data, error } = await sb
    .from('reservations')
    .select('venue_id')
    .eq('date_iso', today)
    .neq('status', 'cancelled');
  if (error) throw error;
  const counts: Record<string, number> = {};
  for (const r of (data ?? []) as { venue_id: string }[]) {
    counts[r.venue_id] = (counts[r.venue_id] ?? 0) + 1;
  }
  return counts;
}

export async function fetchTodayReservationCount(venueId: string): Promise<number> {
  const today = new Date().toISOString().split('T')[0]!;
  const { count, error } = await sb
    .from('reservations')
    .select('*', { count: 'exact', head: true })
    .eq('venue_id', venueId)
    .eq('date_iso', today)
    .neq('status', 'cancelled');
  if (error) throw error;
  return count ?? 0;
}

// ─────────────────────────────────────────────
// VENUE AVAILABILITY
// ─────────────────────────────────────────────

export async function fetchVenueAvailability(venueId: string): Promise<{
  hours: VenueHoursRow[];
  blockedDates: VenueBlockedDateRow[];
}> {
  const [hoursRes, blockedRes] = await Promise.all([
    sb.from('venue_hours').select('*').eq('venue_id', venueId),
    sb.from('venue_blocked_dates').select('*').eq('venue_id', venueId),
  ]);
  return {
    hours: (hoursRes.data ?? []) as VenueHoursRow[],
    blockedDates: (blockedRes.data ?? []) as VenueBlockedDateRow[],
  };
}

// ─────────────────────────────────────────────
// PHONE VERIFICATION
// ─────────────────────────────────────────────

export async function sendPhoneOtp(userId: string, phone: string): Promise<void> {
  if (!ADMIN_URL) throw new Error('Admin URL not configured');
  const res = await fetch(`${ADMIN_URL}/api/send-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, phone }),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body?.error ?? 'Failed to send OTP');
  }
}

export async function verifyPhoneOtp(
  userId: string,
  phone: string,
  code: string,
): Promise<{ success: true } | { error: string }> {
  if (!ADMIN_URL) return { error: 'Admin URL not configured' };
  const res = await fetch(`${ADMIN_URL}/api/verify-otp`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId, phone, code }),
  });
  const body = await res.json().catch(() => ({ error: 'unknown' }));
  return body;
}

export async function fetchMenuByVenue(venueId: string): Promise<{
  categories: MenuCategoryRow[];
  items: MenuItemRow[];
}> {
  const [cats, items] = await Promise.all([
    sb.from('menu_categories').select('*').eq('venue_id', venueId).order('sort_order'),
    sb.from('menu_items').select('*').eq('venue_id', venueId).order('sort_order'),
  ]);
  if (cats.error) throw cats.error;
  if (items.error) throw items.error;
  return {
    categories: (cats.data ?? []) as MenuCategoryRow[],
    items: (items.data ?? []) as MenuItemRow[],
  };
}

// ─────────────────────────────────────────────
// BANNERS
// ─────────────────────────────────────────────

export async function fetchBanners(): Promise<BannerRow[]> {
  const today = new Date().toISOString().split('T')[0]!;
  const { data, error } = await sb
    .from('banners')
    .select('*')
    .eq('is_active', true)
    .or(`start_date.is.null,start_date.lte.${today}`)
    .or(`end_date.is.null,end_date.gte.${today}`)
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as BannerRow[];
}
