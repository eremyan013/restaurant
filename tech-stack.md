# Tech Stack — Tonir Restaurant Reservation System

## Customer App (tonir/)
- Framework: React Native + Expo (TypeScript)
- Navigation: Expo Router
- Styling: NativeWind (Tailwind for React Native)
- State: Zustand
- Forms: React Hook Form + Zod
- Backend client: Supabase JS SDK (@supabase/supabase-js)
- Testing: Vitest + React Native Testing Library

## Admin Panel (tonir-admin/)
- Framework: Next.js 14+ (App Router, TypeScript)
- Styling: Tailwind CSS + shadcn/ui
- State: Zustand / React Query (TanStack Query)
- Tables: TanStack Table
- Charts: Recharts
- Backend client: Supabase JS SDK (@supabase/supabase-js)
- Testing: Vitest + React Testing Library

## Backend (Supabase)
- Database: PostgreSQL (via Supabase)
- Auth: Supabase Auth (email/password + magic link)
- API: Supabase auto-generated REST + PostgREST
- Realtime: Supabase Realtime (live reservation updates)
- Storage: Supabase Storage (restaurant images)
- Server logic: Supabase Edge Functions (Deno/TypeScript)
- Row Level Security (RLS): enforced on all tables
- Migrations: SQL migration files (supabase/migrations/)

## Infrastructure
- Customer app: Expo EAS (build + deploy)
- Admin panel: Vercel
- Backend: Supabase Cloud
- CI/CD: GitHub Actions

## Development
- Package manager: npm
- Linting: ESLint + Prettier
- TypeScript: strict mode

## Rules
- Never bypass RLS — all data access goes through Supabase client
- Never expose service_role key on the client — use anon key only
- Edge Functions for any logic that must run server-side
- All agents must follow this stack — no unapproved libraries
