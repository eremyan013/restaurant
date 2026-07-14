# Architecture Decision Records — Tonir

## How to Use
Create a new ADR for every significant technical decision.
Copy the template below, increment the number, fill it in.

---

## ADR Template

### ADR-XXX: [Title]

**Date:** YYYY-MM-DD
**Status:** Proposed / Accepted / Deprecated / Superseded

#### Context
What situation or problem is this decision addressing?
What constraints exist (time, team size, performance, cost)?

#### Decision
What have we decided to do? State it clearly in 1-2 sentences.

#### Options Considered
| Option | Pros | Cons |
|--------|------|------|
| Option A | ... | ... |
| Option B | ... | ... |

#### Consequences
**Positive:**
- What gets better as a result?

**Negative:**
- What trade-offs does this introduce?

**Risks:**
- What could go wrong? How will we mitigate it?

---

## Existing Decisions

### ADR-001: Supabase as full backend
**Date:** 2024-01-01
**Status:** Accepted

**Decision:** Use Supabase for database, auth, storage, and Edge Functions instead of a custom Node.js API.

| Option | Pros | Cons |
|--------|------|------|
| Supabase | Fast setup, built-in auth, RLS, realtime, no server to manage | Less control, vendor lock-in, Edge Function cold starts |
| Custom Node.js API | Full control, no vendor lock-in | More setup, need to manage auth, server, deployments |

**Consequences:**
- Positive: No backend server to maintain, auth is handled, RLS enforces security at DB level
- Negative: Complex logic must go in Edge Functions (Deno), harder to test locally
- Risk: Supabase free tier limits — mitigate by monitoring usage early

---

### ADR-002: Expo Router for mobile navigation
**Date:** 2024-01-01
**Status:** Accepted

**Decision:** Use Expo Router (file-based routing) instead of React Navigation.

| Option | Pros | Cons |
|--------|------|------|
| Expo Router | File-based like Next.js, deep linking built-in, simpler setup | Newer, less community examples |
| React Navigation | Mature, large community, many examples | More boilerplate, manual deep link setup |

**Consequences:**
- Positive: Consistent mental model with Next.js (tonir-admin), deep links work out of the box
- Negative: Some React Navigation patterns don't apply

---

### ADR-003: NativeWind for React Native styling
**Date:** 2024-01-01
**Status:** Accepted

**Decision:** Use NativeWind (Tailwind for React Native) instead of StyleSheet.

| Option | Pros | Cons |
|--------|------|------|
| NativeWind | Same classes as web (tonir-admin), fast iteration | Extra setup, some web classes don't work in RN |
| StyleSheet | Native RN standard, no extra deps | Verbose, no shared design language with web |

**Consequences:**
- Positive: Same design tokens and class names across mobile and web
- Negative: Need to verify each Tailwind class works in RN context

---

### ADR-004: Separate Supabase projects for staging and production
**Date:** 2024-01-01
**Status:** Accepted

**Decision:** Use two separate Supabase projects (tonir-staging, tonir-prod) instead of one with environment schemas.

**Consequences:**
- Positive: Complete isolation, staging mistakes can't affect production data
- Negative: Must keep schemas in sync via migration files — enforced by running migrations on staging first always
