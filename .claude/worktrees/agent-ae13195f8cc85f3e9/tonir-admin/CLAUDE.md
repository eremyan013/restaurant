# Tonir Admin — Admin Panel (Next.js)

## What This Is
The staff-facing admin panel for managing Tonir restaurant reservations.
Built with Next.js 14+ App Router (TypeScript).

## Key Files — Read These First
- `design-tokens.md` — Tailwind config, colors, component classes, shadcn components
- `component-library.md` — existing components, file structure, page layout

## Stack
- Framework: Next.js 14+ App Router (TypeScript)
- Styling: Tailwind CSS + shadcn/ui
- State: Zustand + TanStack Query
- Tables: TanStack Table
- Charts: Recharts
- Forms: React Hook Form + Zod
- Backend: Supabase JS SDK (@supabase/supabase-js + @supabase/ssr)
- Testing: Vitest + React Testing Library + Playwright (E2E)

## Supabase Client
```typescript
// Client Components — use browser client
import { createClient } from '@/lib/supabase'
const supabase = createClient()

// Server Components / Route Handlers — use server client
import { createServerSupabaseClient } from '@/lib/supabase-server'
const supabase = createServerSupabaseClient()
```

## File Structure
```
tonir-admin/
├── app/
│   ├── (auth)/login/           login page
│   └── (dashboard)/            protected admin pages
│       ├── layout.tsx          Sidebar + TopBar
│       ├── page.tsx            Dashboard
│       ├── reservations/
│       ├── tables/
│       ├── schedule/
│       └── analytics/
├── components/
│   ├── ui/                     shadcn components
│   ├── layout/                 Sidebar, TopBar, PageWrapper
│   ├── reservations/
│   ├── tables/
│   ├── schedule/
│   └── analytics/
├── lib/
│   ├── supabase.ts             browser client
│   ├── supabase-server.ts      server client
│   └── database.types.ts       generated types
└── hooks/
```

## Rules — Always Follow These
- Check component-library.md before building a new component
- Use shadcn/ui components before building custom ones
- Use design-tokens.md Tailwind classes — never hardcode colors
- Server Components for data fetching — use client only when needed
- Add use client only for: event handlers, useState, useEffect, browser APIs
- Auth validated in middleware for all /(dashboard) routes
- Role checks enforced by RLS — not just frontend conditionals
- Every data component needs: loading skeleton, error state, empty state
- Always use generated types from lib/database.types.ts

## Auth Pattern
```typescript
// middleware.ts handles session refresh and redirects
// Server Components check session:
const supabase = createServerSupabaseClient()
const { data: { user } } = await supabase.auth.getUser()
if (!user) redirect('/login')
```

## Realtime Pattern (for live reservation updates)
```typescript
// Subscribe in useEffect, always unsubscribe on unmount
useEffect(() => {
  const channel = supabase.channel('reservations').on(...)
  return () => supabase.removeChannel(channel)
}, [])
```

## Environment Variables
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   (server only — never expose to client)
