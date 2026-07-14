# Security Checklist — Tonir (Supabase Stack)

## Supabase-Specific Security

### Keys & Credentials
- [ ] Only `anon` key used in client apps (tonir + tonir-admin)
- [ ] `service_role` key never in client code — server/Edge Functions only
- [ ] Supabase URL and anon key in env vars, never hardcoded
- [ ] `.env` and `.env.local` files in `.gitignore`
- [ ] No secrets committed to git (check with `git log -p`)

### Row Level Security (RLS)
- [ ] RLS enabled on ALL tables (especially reservations, profiles)
- [ ] No table has RLS disabled in production
- [ ] Policies tested: guest cannot read other guests' reservations
- [ ] Policies tested: staff cannot access admin-only operations
- [ ] Policies tested: unauthenticated user can only create reservations
- [ ] Policies tested: token-based access works for confirm/cancel

### Edge Functions
- [ ] Input validation on all Edge Function parameters (Zod)
- [ ] Edge Functions return generic errors — no internal details
- [ ] Rate limiting on booking Edge Function (prevent spam bookings)
- [ ] Availability + booking done atomically — no race condition
- [ ] Email sending failures don't expose SMTP/Resend errors to client

## Auth Security
- [ ] Admin panel: redirect unauthenticated users to login
- [ ] Session checked server-side in Next.js (not just client)
- [ ] Role check done via RLS — not just frontend conditional rendering
- [ ] No role stored in JWT claims without server verification
- [ ] Supabase Auth email confirmation enabled for staff accounts

## Guest Data (PII)
- [ ] guest_name, guest_email, guest_phone treated as sensitive
- [ ] PII not logged in console or Edge Function logs
- [ ] PII not included in error responses
- [ ] confirm_token and cancel_token are UUIDs (unguessable)
- [ ] Tokens transmitted in links, not in URL query strings where possible

## Next.js Admin Panel
- [ ] Server Components used for data fetching where possible
- [ ] No sensitive data in client-side state unnecessarily
- [ ] Auth session validated in middleware for all /admin routes
- [ ] CSRF protection via Next.js built-in (Server Actions use this by default)
- [ ] No `dangerouslySetInnerHTML` with user-supplied content
- [ ] Content Security Policy headers configured

## Expo Customer App
- [ ] Supabase anon key in `EXPO_PUBLIC_` env var (expected to be public)
- [ ] No service_role key anywhere in app code
- [ ] Deep link handling validates tokens before processing
- [ ] No sensitive data stored in AsyncStorage unencrypted
- [ ] Expo SecureStore used for any auth tokens

## API / Data
- [ ] All user inputs validated before Supabase queries (Zod schemas)
- [ ] Party size within allowed range (1 to max_party_size)
- [ ] Date/time inputs validated as real dates/times
- [ ] No raw SQL with user input — use Supabase query builder only
- [ ] Pagination on all list queries (no unbounded selects)

## Pre-Deployment Checklist
- [ ] All env vars set in Vercel (admin) and EAS (mobile)
- [ ] RLS enabled on all tables — verify in Supabase dashboard
- [ ] Supabase project not in "pause" mode
- [ ] Edge Functions deployed and tested
- [ ] No test/debug code left in production build
- [ ] npm audit passes for both tonir and tonir-admin
- [ ] Supabase Auth email templates customized (not default)
