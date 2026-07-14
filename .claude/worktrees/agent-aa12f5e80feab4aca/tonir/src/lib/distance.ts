/** Haversine great-circle distance in kilometres. */
export function haversineKm(
  lat1: number, lng1: number,
  lat2: number, lng2: number,
): number {
  const R = 6371;
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Format a distance in km for display. */
export function formatDistance(km: number): string {
  if (km < 1) return `${Math.round(km * 1000)} մ`;
  return `${km.toFixed(1)} կմ`;
}

/**
 * Parse a display distance string back to kilometres for sorting.
 * Handles all stored formats: "350 մ", "0.35 կմ", "1.2 km", "800 м".
 */
export function parseDistanceToKm(s: string | number): number {
  const normalised = String(s).replace(',', '.');
  const n = parseFloat(normalised);
  if (isNaN(n)) return Infinity;
  // Metre suffixes: Armenian "մ" (without "կ"), Cyrillic "м", Latin "m" alone
  if (/^\d[\d\s]*\s*[մмm](?!.*[կk])/u.test(normalised.trim())) return n / 1000;
  return n;
}
