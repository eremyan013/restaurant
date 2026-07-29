// ─────────────────────────────────────────────────────────────────────────────
// BOOKING
// ─────────────────────────────────────────────────────────────────────────────

/** Party size options shown in the booking picker (last entry is the large-group overflow sentinel). */
export const BOOKING_PEOPLE_OPTIONS: (number | '9+')[] = [2, 3, 4, 5, 6, 7, 8, '9+'];

/** The sentinel string that triggers the large-group alert instead of selecting a party size. */
export const BOOKING_LARGE_GROUP_SENTINEL = '9+' as const;

/** How many days ahead the date picker shows (today + 6 more). */
export const BOOKING_HORIZON_DAYS = 7;

// ─────────────────────────────────────────────────────────────────────────────
// CANCELLATION / MODIFICATION DEADLINE
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Milliseconds before a reservation's start time within which cancellation
 * and modification are no longer permitted. Currently: 1 hour.
 */
export const CANCEL_DEADLINE_MS = 60 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// CALENDAR EVENT
// ─────────────────────────────────────────────────────────────────────────────

/** Duration in milliseconds of the calendar event created after a booking. Currently: 90 minutes. */
export const CALENDAR_EVENT_DURATION_MS = 90 * 60 * 1000;

// ─────────────────────────────────────────────────────────────────────────────
// DETAIL SCREEN DISPLAY CAPS
// ─────────────────────────────────────────────────────────────────────────────

/** Maximum number of time slots shown in the booking widget before "show more" appears. */
export const DETAIL_TIMES_PREVIEW_COUNT = 5;

/** Maximum number of similar venues shown in the horizontal scroll list. */
export const DETAIL_SIMILAR_VENUES_COUNT = 4;

// ─────────────────────────────────────────────────────────────────────────────
// LOYALTY / TIER SYSTEM
// ─────────────────────────────────────────────────────────────────────────────

/** Total number of loyalty tiers in the system. Must match the DB settings table. */
export const TIER_COUNT = 4;

/**
 * Fallback tier names used when the settings table fetch fails.
 * Source of truth is the DB — these are emergency defaults only.
 */
export const TIER_NAME_FALLBACKS: Record<number, string> = {
  1: 'Tonir',
  2: 'Pandok',
  3: 'Areni',
  4: 'Master',
};

/**
 * Fallback minimum point thresholds per tier, used when the settings table fetch fails.
 * Source of truth is the DB — these are emergency defaults only.
 */
export const TIER_MIN_FALLBACKS: Record<number, number> = {
  1: 0,
  2: 1000,
  3: 2000,
  4: 3000,
};

/**
 * Point increment used in the HomeScreen loyalty progress bar.
 * Must stay in sync with TIER_MIN_FALLBACKS tier-2 threshold.
 */
export const LOYALTY_TIER_INCREMENT = 1000;

// ─────────────────────────────────────────────────────────────────────────────
// PROFILE / NAME VALIDATION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Maximum allowed length for a user display name (inclusive).
 * TextInput maxLength should be NAME_MAX_LENGTH + 1 to allow the user to see
 * the error state before being hard-stopped, rather than silently truncating.
 */
export const PROFILE_NAME_MAX_LENGTH = 60;

// ─────────────────────────────────────────────────────────────────────────────
// AUTH / PHONE
// ─────────────────────────────────────────────────────────────────────────────

/** Country dialing prefix shown in the signup phone field. */
export const AUTH_COUNTRY_CODE = '+374';

/** Expected digit count for the local (post-prefix) phone number. */
export const AUTH_PHONE_DIGIT_COUNT = 8;

/** Regex that validates the local phone number (must be exactly AUTH_PHONE_DIGIT_COUNT digits). */
export const AUTH_PHONE_REGEX = /^\d{8}$/;

/** Minimum password length accepted during signup and sign-in. */
export const AUTH_PASSWORD_MIN_LENGTH = 6;

// ─────────────────────────────────────────────────────────────────────────────
// CONCIERGE
// ─────────────────────────────────────────────────────────────────────────────

/** Number of user messages after which the "Need help?" escalation button appears. */
export const CONCIERGE_ESCALATION_THRESHOLD = 3;

/** Artificial typing delay (ms) shown before a concierge response is rendered. */
export const CONCIERGE_TYPING_DELAY_MS = 800;

/** Minimum rating a venue must have to appear in fallback concierge results. */
export const CONCIERGE_FALLBACK_RATING_MIN = 4.5;

// ─────────────────────────────────────────────────────────────────────────────
// VENUE STATUS
// ─────────────────────────────────────────────────────────────────────────────

/** Minutes before closing time at which a venue is considered "closing soon". */
export const VENUE_CLOSES_SOON_THRESHOLD_MINUTES = 60;
