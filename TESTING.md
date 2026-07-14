# Tonir — QA & Testing Reference

This document covers the full test infrastructure set up across both projects:
**`tonir-admin`** (Next.js 15 admin dashboard) and **`tonir`** (React Native / Expo 52 mobile app).

---

## Table of Contents

1. [Running Tests](#running-tests)
2. [tonir-admin — Test Suite](#tonir-admin--test-suite)
   - [Infrastructure](#infrastructure)
   - [Test Files Overview](#test-files-overview)
   - [Bugs Found & Fixed](#bugs-found--fixed)
   - [Coverage Gaps](#coverage-gaps)
3. [tonir (mobile) — Test Suite](#tonir-mobile--test-suite)
   - [Infrastructure](#infrastructure-1)
   - [Test Files Overview](#test-files-overview-1)
   - [Known Behaviours Documented](#known-behaviours-documented)
   - [Coverage Gaps](#coverage-gaps-1)
4. [Shared Patterns & Conventions](#shared-patterns--conventions)
5. [Known Risks & Flaky Test Patterns](#known-risks--flaky-test-patterns)

---

## Running Tests

### tonir-admin

```bash
cd tonir-admin

npm test              # run once (CI mode)
npm run test:watch    # watch mode (development)
npm run test:coverage # run with V8 coverage report
```

### tonir (mobile)

```bash
cd tonir

npm test              # run once (CI mode)
npm run test:watch    # watch mode (development)
npm run test:coverage # run with V8 coverage report
```

---

## tonir-admin — Test Suite

**Stack:** Next.js 15 · TypeScript · Supabase · Vitest 3.x  
**Total:** **242 tests** across 8 files — all passing

### Infrastructure

| File | Purpose |
|---|---|
| `vitest.config.ts` | Node environment; `@` alias → project root; V8 coverage |
| `__tests__/helpers/supabase-mock.ts` | Shared mock utilities (see [Supabase Mock Helper](#supabase-mock-helper)) |

**Coverage includes:** `lib/**/*.ts`, `app/**/*.ts`, `app/**/*.tsx`  
**Coverage excludes:** `app/layout.tsx`, `app/page.tsx`, `lib/database.types.ts`

---

### Test Files Overview

#### `__tests__/lib/transliterate.test.ts` — 116 tests

Tests the Armenian → Latin transliteration library used for slug generation and search normalisation.

| Category | What's tested |
|---|---|
| Armenian lowercase | All 38 single-character mappings |
| Armenian uppercase | All 38 characters capitalised |
| Multi-char mappings | `ժ→zh`, `շ→sh`, `խ→kh`, `ծ→ts`, `չ→ch`, `ձ→dz`, `ղ→gh` |
| Digraph `ու` | All 3 Unicode forms; priority over single-char `ո`/`ւ` |
| Cyrillic passthrough | Cyrillic letters that are not Armenian pass through unchanged |
| Soft/hard signs | `ъ` / `ь` → empty string |
| Latin passthrough | ASCII already-Latin characters are unchanged |
| Edge cases | Empty string, very long input, mixed scripts |

---

#### `__tests__/lib/log-activity.test.ts` — 8 tests

Tests the admin activity logging helper.

| Case | Expected behaviour |
|---|---|
| `admin` is `null` | Returns immediately without inserting |
| Normal call | Inserts correct payload with `admin_id`, `action`, `target_type`, `target_id` |
| `details` omitted | Defaults to `null` in the payload |
| Supabase error | Swallowed silently (logging must never throw) |

---

#### `__tests__/app/api/send-push.test.ts` — 22 tests

Tests the `POST /api/send-push` push notification endpoint and its `GET` preview.

| Category | Cases |
|---|---|
| Auth | 403 for non-`super_admin` role |
| Validation | Empty `title` → 400; empty `body` → 400 |
| Target: all users | Sends to all device tokens |
| Target: tier | Sends only to tokens belonging to the specified tier |
| Target: single user | Sends to one user's token |
| Chunking | 100 tokens → 1 Expo batch; 101 tokens → 2 batches; 200 tokens → 2 batches |
| Expo failure | Individual send failure is reported in the response, does not throw |
| Mixed ok/error | Partial success reported correctly |
| GET preview | Returns token count without sending |

---

#### `__tests__/app/api/upload-venue-photo.test.ts` — 9 tests

Tests `POST /api/upload-venue-photo` (Supabase Storage upload).

| Case | Expected |
|---|---|
| No auth | 403 Forbidden |
| Regular admin | 200 (any authenticated admin may upload) |
| Success | Returns `{ url: "https://..." }` |
| Extension from filename | `banner.png` → upload path ends with `.png` |
| No-dot filename fallback | `noext` → upload path ends with `.jpg` |
| Content-type | Passed from `file.type` to storage options |
| `upsert: false` | Prevents overwriting existing files |
| No file in form | 400 `{ error: "Missing file" }` |
| Storage error | 500 with error message |

---

#### `__tests__/app/api/users-search.test.ts` — 12 tests

Tests `GET /api/users-search?q=...`.

| Case | Expected |
|---|---|
| No auth | 403 |
| Query < 2 chars | Empty array (no DB hit) |
| Valid query | `OR ilike` search on `name` and `email` |
| Results | Limited to 10 |
| DB error | 500 |

---

#### `__tests__/app/api/concierge-escalate.test.ts` — 7 tests

Tests `POST /api/concierge/escalate` and its CORS preflight.

| Case | Expected |
|---|---|
| `OPTIONS` | 204 with `Access-Control-Allow-Origin: *` and correct methods |
| No auth | 403 |
| Regular admin | 200 (any authenticated admin may escalate) |
| Missing `session_id` | 400 |
| Empty `session_id` | 400 |
| Valid request | Updates correct session to `status: 'escalated'` |
| All responses | Include CORS headers |

---

#### `__tests__/app/dashboard/reservations/actions.test.ts` — 29 tests

Tests three server actions: `editReservation`, `createReservationAdmin`, `searchUsersAction`.

**`editReservation`**

| Case | Expected |
|---|---|
| No auth | Early return with error |
| Regular admin accessing foreign venue | Forbidden |
| Regular admin accessing own venue | Allowed |
| `super_admin` | Allowed regardless of venue |
| Date formatting | `'2026-01-05'` → `'Mon, 5 Jan'`; `'2026-01-01'` → `'Thu, 1 Jan'`; `'2026-06-11'` → `'Thu, 11 Jun'` |
| Optional null fields | `occasion`, `note`, `phone` accept `null` |

**`createReservationAdmin`**

| Case | Expected |
|---|---|
| No auth | Error |
| Regular admin on unowned venue | Forbidden |
| Valid creation | Default `status: 'confirmed'`, `yel_earned: '0'` |

**`searchUsersAction`**

| Case | Expected |
|---|---|
| Query < 2 chars | Empty array |
| No auth | Error |
| DB returns `null` | Returns `[]` |
| Valid search | Limited to 8 results |

---

#### `__tests__/app/dashboard/users/actions.test.ts` — 16 tests

Tests the `updateUserTier` server action.

| Case | Expected |
|---|---|
| Non-`super_admin` | Forbidden |
| `tier_level: 0` | Validation error |
| `tier_level: 1` | Valid |
| `tier_level: 4` | Valid |
| `tier_level: 5` | Validation error |
| Missing name | Validation error |
| Missing email | Validation error |
| Phone provided | Stored |
| Phone absent | Stored as `null` |
| Auth update fails | Stops before profile update |
| Profile update fails | Returns error |

---

#### `__tests__/app/dashboard/admins/actions.test.ts` — 23 tests

Tests `createAdmin`, `updateAdmin`, and `deleteAdmin`.

**`createAdmin`**

| Case | Expected |
|---|---|
| Non-`super_admin` | Forbidden |
| Success | Calls `createUser`, then upserts profile with `role: 'admin'` |
| Upsert fails | Rolls back by calling `deleteUser` |
| Rollback `deleteUser` also fails | Does not throw (error is swallowed) |

**`updateAdmin`**

| Case | Expected |
|---|---|
| No password provided | Only updates profile; does not call `updateUserById` |
| Password provided | Updates both auth and profile |

**`deleteAdmin`**

| Case | Expected |
|---|---|
| Delete | Soft-deletes: sets `role: 'user'` in profile; Supabase auth account is preserved |

---

### Bugs Found & Fixed

Three bugs were identified by the test suite and fixed before merging.

#### Bug 1 — Missing auth check on `/api/upload-venue-photo` (HIGH)

**Severity:** High  
**File:** `app/api/upload-venue-photo/route.ts`

**Problem:** The route had no authentication check. Any unauthenticated request could upload files to Supabase Storage.

**Fix:**
```typescript
const admin = await getCurrentAdmin()
if (!admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
```

---

#### Bug 2 — Dead-code extension fallback in `/api/upload-venue-photo` (LOW)

**Severity:** Low  
**File:** `app/api/upload-venue-photo/route.ts`

**Problem:** The `?? 'jpg'` fallback for files with no extension never fired because `'noext'.split('.').pop()` returns `'noext'` (not `undefined`), so the nullish coalescing operator never activated.

**Before:**
```typescript
const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase()
```

**After:**
```typescript
const parts = file.name.split('.')
const ext   = (parts.length > 1 ? parts.pop()! : 'jpg').toLowerCase()
```

---

#### Bug 3 — Missing auth check on `/api/concierge/escalate` (MEDIUM)

**Severity:** Medium  
**File:** `app/api/concierge/escalate/route.ts`

**Problem:** The escalation endpoint had no authentication check. Any unauthenticated request could mark any concierge session as escalated.

**Fix:**
```typescript
const admin = await getCurrentAdmin()
if (!admin) {
  return NextResponse.json({ error: 'Forbidden' }, { status: 403, headers: CORS })
}
```

---

### Coverage Gaps

The following areas are not covered by the current unit test suite:

| Area | Reason | Recommendation |
|---|---|---|
| `lib/supabase-admin.ts` | Thin wrapper; tested indirectly | — |
| `lib/current-admin.ts` | Thin wrapper; mocked in all tests | — |
| Server Actions with complex DB joins | Multiple chained queries require more elaborate mock setup | Add in next iteration |
| Middleware (`middleware.ts`) | Requires Next.js runtime environment | E2E or integration test |
| Dashboard UI components | React components | `@testing-library/react` |
| Supabase RLS policies | Database-level logic | Integration tests against a test DB |

---

## tonir (mobile) — Test Suite

**Stack:** React Native · Expo 52 · TypeScript · Zustand · Vitest 3.x  
**Total:** **143 tests** across 5 files — all passing

### Infrastructure

| File | Purpose |
|---|---|
| `vitest.config.ts` | Node environment; `@` alias → `src/`; V8 coverage |

**Coverage includes:** `src/lib/distance.ts`, `src/lib/localize.ts`, `src/theme.ts`, `src/hooks/useVenueAvailability.ts`

> **Why only pure functions?**  
> Hooks that use `useState`/`useEffect` require a React Native rendering environment (`@testing-library/react-native`). The current suite targets only the exported pure functions which can run in plain Node.js without any React context.

---

### Test Files Overview

#### `__tests__/lib/distance.test.ts` — 36 tests

Tests `haversineKm`, `formatDistance`, and `parseDistanceToKm`.

**`haversineKm`**

| Case | Expected |
|---|---|
| Identical coordinates | ~0 km |
| Yerevan → Tbilisi | 150–200 km (great-circle, not road distance) |
| Symmetry A→B = B→A | Exact floating-point equality |
| Pole to equator | ~10 007 km |
| Southern hemisphere | Negative latitudes handled correctly |
| Western hemisphere | Negative longitudes handled correctly |

**`formatDistance`**

| Input | Output |
|---|---|
| `0` | `'0 մ'` |
| `0.35` | `'350 մ'` |
| `0.9999` | `'1000 մ'` |
| `1` | `'1.0 կմ'` |
| `2.567` | `'2.6 կմ'` |
| `1.95` | `'1.9 կմ'` ⚠️ see below |

**`parseDistanceToKm`** — handles all stored distance string formats:

| Input | Output |
|---|---|
| `'350 մ'` (Armenian м) | `0.35` |
| `'800 м'` (Cyrillic м) | `0.8` |
| `'500 m'` (Latin m) | `0.5` |
| `'1.2 կմ'` (Armenian km) | `1.2` |
| `'1.5 km'` (Latin km) | `1.5` |
| `'0,5 կմ'` (comma decimal) | `0.5` |
| `'abc'` | `Infinity` |
| `''` | `Infinity` |

---

#### `__tests__/lib/localize.test.ts` — 33 tests

Tests `localizeVenue`, `localizeCategory`, `localizeItem`, and `localizeGuide`.

All four functions apply the same 3-level fallback chain per field:

```
field_<lang>  →  field_hy  →  field  →  '' (or [] for arrays, null for description)
```

Falsy values (empty string, `null`, `undefined`) in any slot cause fallback to the next.

| Function | Key behaviours tested |
|---|---|
| `localizeVenue` | All 5 string fields + `tags` array; empty/null triggers fallback; original fields spread |
| `localizeCategory` | Name field fallback chain; original `sort_order` etc. preserved |
| `localizeItem` | Name + description chain; `description` returns `null` (not `''`) when missing; `allergens` array |
| `localizeGuide` | `title`, `subtitle`, `tag` fallback chains |

---

#### `__tests__/theme.test.ts` — 18 tests

Tests `makeTheme` and `heatColor`.

| Case | Expected |
|---|---|
| Default (green, light) | Correct brand colour hex values |
| All 4 palettes | Tokens match `PALETTES` constant exactly |
| Light mode | Warm backgrounds, dark text, `dark: false` |
| Dark mode | Deep backgrounds, light text, `dark: true` |
| Dark + non-green palette | Layout tokens override independently of palette tokens |
| `heatColor('high')` | Returns `theme.pop` |
| `heatColor('med')` | Returns `theme.accent` |
| `heatColor('low')` | Returns `theme.textMute` |
| Cross-palette `heatColor` | Different palettes produce different colours |

---

#### `__tests__/hooks/availability.test.ts` — 24 tests

Tests `isDateAvailable` and `filterAvailableTimes` (pure exported functions, not the hook itself).

**`isDateAvailable`**

| Case | Expected |
|---|---|
| Yesterday | `false` |
| Date in the past | `false` |
| Today | `true` |
| Future date, no hours set | `true` (backwards-compatible behaviour) |
| Future date, blocked | `false` |
| Future unblocked date amid blocked ones | `true` |
| Day with `is_open: false` | `false` |
| Day with `is_open: true` | `true` |
| Day open but no times set | `true` |
| Blocked AND open | `false` (blocked check runs first) |

**`filterAvailableTimes`**

| Case | Expected |
|---|---|
| No hours entry for day | All times returned |
| `is_open: false` | All times returned (caller disables the date; times not filtered further) |
| Times outside open window | Filtered out |
| `open_time` boundary (inclusive) | `'12:00'` passes when `open_time: '12:00'` |
| `close_time` boundary (inclusive) | `'22:00'` passes when `close_time: '22:00'` |
| `isToday: true` | Strips slots `≤` current local time (strict `>`) |
| `isToday + window` | Both filters applied correctly |

---

#### `__tests__/i18n.test.ts` — 32 tests

Validates the structural integrity of the `I18N` translation tables.

| Check | Detail |
|---|---|
| Key completeness | `ru` and `en` have exactly the same keys as `hy` — no missing, no extra |
| No empty strings | No key maps to `''` in any language |
| No empty arrays | No key maps to `[]` in any language |
| No null/undefined | All values are defined |
| `book_days` | Exactly 7 entries in all languages |
| `book_months` | Exactly 12 entries in all languages |
| `prof_tier_names` | Exactly 4 entries in all languages |
| `market_pts_cost` | Contains `{n}` placeholder in all languages |
| Auth screen keys | All 7 critical auth keys present and non-empty in all languages |
| Booking screen keys | All 7 booking keys present and non-empty in all languages |
| Minimum key count | `hy` baseline has > 100 keys (regression guard) |

---

### Known Behaviours Documented

#### `formatDistance(1.95)` → `'1.9 կմ'`

`(1.95).toFixed(1)` returns `'1.9'` in V8 because `1.95` is stored in IEEE-754 as `1.94999…`. This is **not a bug** — it is standard JavaScript floating-point behaviour. The test explicitly documents this so future developers don't mistake it for a regression.

#### `parseDistanceToKm` — metre regex only matches integers

The regex `/^\d[\d\s]*\s*[մмm](?!.*[կk])/u` only matches metre strings that start with a digit and contain no decimal point before the suffix (e.g. `'350 մ'`, not `'1.5 м'`). This is intentional because `formatDistance` always emits integer metres (`Math.round`), so no decimal-metre strings are ever produced by the app.

---

### Coverage Gaps

| Area | Reason | Recommendation |
|---|---|---|
| `useVenueAvailability` hook | Needs `@testing-library/react-native` | Add with RN testing library |
| `useTranslation` hook | `tr`, `tra`, `trf` closures use Zustand store | Extract translation logic to a pure function; test directly |
| All other hooks (`useFavorites`, `useVenues`, `useProfile`, …) | Require React rendering | RN testing library |
| `src/lib/api.ts` | All Supabase calls need DB or full mock | Integration tests against a test Supabase project |
| `src/store.ts` | Zustand + AsyncStorage | Mock AsyncStorage; test state transitions |
| Screen components | React Native UI | E2E (Detox or Maestro) |

---

## Shared Patterns & Conventions

### Supabase Mock Helper (tonir-admin only)

`__tests__/helpers/supabase-mock.ts` provides reusable mock utilities:

```typescript
// Chainable query builder — all filter methods return `this`,
// terminal methods resolve with a configurable QueryResult
const chain = makeChain({ data: { id: 'x' }, error: null })

// Full client mock — supports per-table responses (round-robin),
// storage bucket mocks (upload/getPublicUrl), and auth.admin stubs
const client = makeMockSupabaseClient({
  tableResponses: {
    venues: [{ data: [venue], error: null }, { data: null, error: someError }],
  },
  storage: { publicUrl: 'https://cdn.example.com/photo.jpg' },
})

// Admin fixtures
SUPER_ADMIN   // { id: '...', role: 'super_admin', ... }
REGULAR_ADMIN // { id: '...', role: 'admin', managed_venue_ids: ['venue-1'], ... }
```

**Storage spy access pattern** — to inspect what the route handler uploaded:
```typescript
// Do NOT call client.storage.from('bucket') directly — that creates a NEW mock object.
// Instead, capture the object the route handler received:
const storageMock = (client.storage.from as any).mock.results[0].value
expect(storageMock.upload).toHaveBeenCalledWith(...)
```

### Supabase Import Chain (tonir mobile)

`src/lib/supabase.ts` calls `createClient(undefined, undefined)` at module load time when env vars are absent (which throws). Any test file that imports a module with a transitive dependency on `supabase.ts` must mock `@/lib/api` to cut the chain:

```typescript
vi.mock('@/lib/api', () => ({ fetchVenueAvailability: vi.fn() }))
```

### Path Aliases

| Project | tsconfig path | vitest alias |
|---|---|---|
| `tonir-admin` | `"@/*": ["./*"]` (baseUrl `.`) | `'@': path.resolve(__dirname, '.')` |
| `tonir` | `"@/*": ["src/*"]` (baseUrl `.`) | `'@': path.resolve(__dirname, 'src')` |

### `vi.mock` Hoisting

Vitest hoists all `vi.mock()` calls above imports. This means mocks are in place before any module under test is loaded — critical for mocking Next.js internals (`next/cache`, `next/navigation`) and for cutting the Supabase import chain.

---

## Known Risks & Flaky Test Patterns

### 1. `filterAvailableTimes` — timezone sensitivity

**Location:** `tonir/src/hooks/useVenueAvailability.ts`

**Risk:** `filterAvailableTimes` uses `new Date().getHours()` and `new Date().getMinutes()` (local time). Tests that exercise the `isToday` path must pin the system clock using `vi.setSystemTime(new Date(year, month, day, h, m, s))` (local constructor), **not** a UTC string like `new Date('2026-06-11T15:30:00Z')`. On the development machine (UTC+4), a UTC string would cause `getHours()` to return `19` instead of `15`.

**Recommended fix:** Extract a `getCurrentHHMM()` utility function that can be overridden in tests, removing the timezone dependency entirely.

```typescript
// Before (timezone-coupled)
const currentTime = `${now.getHours().toString().padStart(2,'0')}:...`

// After (injectable)
export function getCurrentHHMM(now = new Date()): string {
  return `${now.getHours().toString().padStart(2,'0')}:${now.getMinutes().toString().padStart(2,'0')}`
}
```

### 2. `isDateAvailable` — UTC vs. local date boundary

**Location:** `tonir/src/hooks/useVenueAvailability.ts`

**Risk:** `isDateAvailable` uses `new Date().toISOString().split('T')[0]` to get today's date — always UTC. A user booking at midnight local time (e.g. 23:00–00:59 UTC+4) sees a different "today" than the UTC date. This is a **product logic issue** worth discussing with the team, not just a test issue.

### 3. `send-push` — Expo chunking tests are count-sensitive

**Location:** `tonir-admin/__tests__/app/api/send-push.test.ts`

**Risk:** Tests assert exact chunk boundaries (100 = 1 batch, 101 = 2 batches). If the Expo batch size constant changes, these tests will fail immediately — which is intentional (they are the guard for that constant). Do not relax these assertions.

### 4. Round-robin `tableResponses` in `makeMockSupabaseClient`

**Location:** `tonir-admin/__tests__/helpers/supabase-mock.ts`

**Risk:** The mock cycles through the provided response array in order. If a server action makes more DB calls than expected (e.g. after a refactor), the mock will loop back to the first response silently. Always provide enough responses to cover every query in the code path under test.

---

*Document generated: 2026-06-11*  
*Test counts: tonir-admin 242 · tonir 143 · total 385*
