# Tonir — Customer Mobile App (React Native / Expo)

## What This Is
The customer-facing mobile app for Tonir restaurant reservations.
Built with React Native + Expo (TypeScript).

## Key Files — Read These First
- `design-tokens.md` — colors, typography, spacing, status colors
- `component-library.md` — existing components, file structure, key libraries

## Stack
- Framework: React Native + Expo (TypeScript)
- Navigation: Expo Router (file-based)
- Styling: NativeWind (Tailwind classes)
- State: Zustand (booking flow state)
- Forms: React Hook Form + Zod
- Backend: Supabase JS SDK (@supabase/supabase-js)
- Icons: @expo/vector-icons (Ionicons)
- Testing: Vitest + React Native Testing Library + Maestro (E2E)

## Supabase Client
```typescript
// Always import from lib/supabase.ts
import { supabase } from '@/lib/supabase'

// Use EXPO_PUBLIC_ prefix for env vars
// EXPO_PUBLIC_SUPABASE_URL
// EXPO_PUBLIC_SUPABASE_ANON_KEY
```

## File Structure
```
tonir/
├── app/                    Expo Router screens
│   ├── (tabs)/             bottom tab screens
│   ├── booking/            booking flow screens
│   └── reservation/        reservation detail + confirm/cancel
├── components/
│   ├── ui/                 core UI components
│   ├── layout/             screen wrappers, headers
│   ├── reservation/        booking and reservation components
│   └── restaurant/         restaurant info components
├── lib/
│   ├── supabase.ts         Supabase client
│   └── database.types.ts   generated Supabase types
├── hooks/                  data fetching hooks
├── store/                  Zustand stores
└── constants/              colors, spacing
```

## Rules — Always Follow These
- Minimum touch target: 44x44pt — use hitSlop on small elements
- Use NativeWind classes for all styling — no StyleSheet unless necessary
- Check component-library.md before building a new component
- Use design-tokens.md colors — never hardcode hex values
- Every screen needs: loading state, error state, empty state
- Use accessibilityLabel on all interactive elements
- Always use generated types from lib/database.types.ts
- Test UI on both iOS and Android
- Deep links (confirm/cancel tokens) handled in app/reservation/

## Supabase Rules
- Only use anon key — never service_role in mobile app
- All data access respects RLS automatically via anon key
- For booking flow: call create-reservation Edge Function, never insert directly
- Handle Supabase errors gracefully — show user-friendly messages

## Environment Variables
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
