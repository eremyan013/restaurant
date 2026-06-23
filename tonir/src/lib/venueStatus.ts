import type { VenueHoursRow } from './database.types';

export type VenueStatusResult =
  | { status: 'open';   detail: 'plain' }
  | { status: 'open';   detail: 'closes_soon'; closeTime: string }
  | { status: 'closed'; detail: 'opens_today';    openTime: string }
  | { status: 'closed'; detail: 'opens_tomorrow'; openTime: string }
  | { status: 'closed'; detail: 'unknown' };

function parseMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function getVenueStatus(
  hoursMap: Record<number, VenueHoursRow>,
  now: Date,
  blockedDates?: Set<string>,
): VenueStatusResult {
  // Blocked date overrides all hours logic
  if (blockedDates?.size) {
    const todayISO = now.toISOString().split('T')[0]!;
    if (blockedDates.has(todayISO)) {
      return { status: 'closed', detail: 'unknown' };
    }
  }

  const dow = now.getDay(); // 0=Sun … 6=Sat
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const todayRow = hoursMap[dow];

  // No data for today → treat as open (backwards-compatible)
  if (todayRow === undefined) {
    return { status: 'open', detail: 'plain' };
  }

  // Explicitly closed day → skip to FIND_NEXT
  if (!todayRow.is_open) {
    return findNext(hoursMap, dow);
  }

  // No times set → open all day
  if (!todayRow.open_time || !todayRow.close_time) {
    return { status: 'open', detail: 'plain' };
  }

  const openMin  = parseMinutes(todayRow.open_time);
  const closeMin = parseMinutes(todayRow.close_time);
  // Overnight shift: e.g. opens 22:00, closes 02:00
  const isOvernight = closeMin < openMin;

  if (!isOvernight) {
    if (currentMinutes < openMin)   return findNext(hoursMap, dow);
    if (currentMinutes >= closeMin) return findNext(hoursMap, dow);

    const minutesLeft = closeMin - currentMinutes;
    if (minutesLeft <= 60) {
      return { status: 'open', detail: 'closes_soon', closeTime: todayRow.close_time };
    }
    return { status: 'open', detail: 'plain' };
  }

  // Overnight window: open when currentMinutes >= openMin OR currentMinutes < closeMin
  const inWindow = currentMinutes >= openMin || currentMinutes < closeMin;
  if (!inWindow) {
    return findNext(hoursMap, dow);
  }

  const minutesLeft = currentMinutes >= openMin
    ? (1440 - currentMinutes) + closeMin
    : closeMin - currentMinutes;

  if (minutesLeft <= 60) {
    return { status: 'open', detail: 'closes_soon', closeTime: todayRow.close_time };
  }
  return { status: 'open', detail: 'plain' };
}

function findNext(
  hoursMap: Record<number, VenueHoursRow>,
  dow: number,
): VenueStatusResult {
  for (let offset = 1; offset <= 7; offset++) {
    const candidateDow = (dow + offset) % 7;
    const row = hoursMap[candidateDow];

    if (!row || !row.is_open || !row.open_time) continue;

    if (offset === 1) {
      return { status: 'closed', detail: 'opens_tomorrow', openTime: row.open_time };
    }
    // Beyond tomorrow — stop searching
    break;
  }
  return { status: 'closed', detail: 'unknown' };
}
