import { supabase as _supabase } from './supabase';

const ADMIN_URL = process.env.EXPO_PUBLIC_CONCIERGE_URL?.replace(/\/$/, '');
import { VenueRow, ReservationRow, ProfileRow, MenuCategoryRow, MenuItemRow, GuideRow } from './database.types';

// Cast to any to escape Supabase TS generic inference issue with this package version.
// All public functions carry explicit return type annotations for safety.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = _supabase as any;

// ─────────────────────────────────────────────
// VENUES
// ─────────────────────────────────────────────

export async function fetchVenues(): Promise<VenueRow[]> {
  const { data, error } = await sb.from('venues').select('*').order('rating', { ascending: false });
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

export async function createReservation(
  reservation: Omit<ReservationRow, 'id' | 'created_at'>
): Promise<ReservationRow> {
  const { data, error } = await sb.from('reservations').insert(reservation).select().single();
  if (error) throw error;
  return data as ReservationRow;
}

export async function cancelReservation(id: string): Promise<void> {
  const { error } = await sb.from('reservations').update({ status: 'cancelled' }).eq('id', id);
  if (error) throw error;
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
  updates: Partial<Pick<ProfileRow, 'name' | 'avatar_url'>>
): Promise<void> {
  const { error } = await sb.from('profiles').update(updates).eq('id', userId);
  if (error) throw error;
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
): Promise<void> {
  const { error } = await sb.from('reviews').insert({
    user_id: userId,
    venue_id: venueId,
    reservation_id: reservationId,
    rating,
    comment: comment.trim() || null,
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
// MENU
// ─────────────────────────────────────────────

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
