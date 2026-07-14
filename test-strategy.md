# Test Strategy — Tonir

## Testing Stack

### tonir (Expo / React Native)
- Unit + Component: Vitest + React Native Testing Library
- Mocking: MSW (Mock Service Worker) for Supabase calls
- E2E: Maestro (React Native E2E testing)

### tonir-admin (Next.js)
- Unit + Component: Vitest + React Testing Library
- Mocking: MSW for Supabase calls
- E2E: Playwright

### Supabase Edge Functions
- Unit: Deno test runner
- Integration: test against local Supabase instance (`npx supabase start`)

## Coverage Targets
| Layer | Target |
|-------|--------|
| Business logic (availability, booking) | 95% |
| Edge Functions | 90% |
| React/RN components | 80% |
| E2E critical journeys | 100% |
| Utility functions | 90% |

## Mocking Supabase in Tests
```typescript
// Use MSW to intercept Supabase REST calls
import { http, HttpResponse } from 'msw'
import { setupServer } from 'msw/node'

const server = setupServer(
  http.get('*/rest/v1/reservations', () => {
    return HttpResponse.json([{ id: '1', guest_name: 'Test User', ... }])
  })
)

beforeAll(() => server.listen())
afterEach(() => server.resetHandlers())
afterAll(() => server.close())
```

## Critical Edge Cases

### Availability
- Request on blocked date → empty slots returned
- Request on closed day (is_open = false) → empty slots
- All tables occupied → no slots available
- Party size larger than all tables → no slots
- Request less than 2 hours ahead → rejected
- Last valid slot boundary → correct calculation
- Slot overlaps existing reservation → table excluded

### Reservations
- Create with valid data → success + email sent
- Create on fully booked slot → error `no_availability`
- Confirm with valid token → status = confirmed
- Confirm with invalid token → 404
- Cancel within deadline → success
- Cancel past deadline → error `cancellation_deadline_passed`
- Cancel already cancelled → idempotent success

### Auth (Admin Panel)
- Unauthenticated user visits /admin → redirect to login
- Staff tries admin-only action → RLS blocks it
- Expired session → redirect to login
- Valid session → access granted

### RLS Policies
- Guest cannot read other guests' reservations
- Staff can read all reservations
- Only admin can modify tables/schedule
- Unauthenticated user can insert reservation
- Unauthenticated user cannot update reservations

## E2E Critical Journeys

### Customer (Maestro — tonir)
1. Open app → restaurant info visible
2. Select date with availability → slots shown
3. Select date that is blocked → no slots shown
4. Complete booking form → reservation created
5. Receive confirmation (check Supabase directly in test)
6. Cancel reservation via app

### Admin (Playwright — tonir-admin)
1. Login with valid credentials
2. View today's reservations on dashboard
3. Create reservation manually
4. Edit reservation (change time/party size)
5. Cancel reservation
6. Mark reservation as no-show
7. Add a blocked date
8. Edit opening hours for a day

## Test Naming Convention
```typescript
describe('checkAvailability', () => {
  it('should return available slots when tables are free')
  it('should return empty when date is blocked')
  it('should exclude tables that conflict with existing reservations')
  it('should return empty when restaurant is closed on that day')
})
```
Format: `should [expected behavior] when [condition]`

## Local Test Setup
```bash
# Start local Supabase
npx supabase start

# Run unit tests
npm run test

# Run E2E (admin)
npx playwright test

# Run E2E (mobile)
npx maestro test flows/
```

## Test Data / Seed
Seed local Supabase with:
- 1 restaurant
- 5 tables: 2, 4, 4, 6, 8 capacity
- Full week schedule (Mon-Sun, 18:00-23:00)
- 1 blocked date (next Saturday)
- 1 admin user, 1 staff user
