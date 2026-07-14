# API Conventions — Tonir (Supabase)

## How the API Works
This project uses Supabase — there is no custom Express/REST server.
Data access is through:
1. **Supabase JS client** — for standard CRUD (select, insert, update, delete)
2. **Supabase Edge Functions** — for complex business logic (availability check, booking flow)
3. **Supabase RLS** — security enforced at the database level

## Supabase Client Setup

### Customer app (tonir)
```typescript
// lib/supabase.ts
import { createClient } from '@supabase/supabase-js'
import { Database } from './database.types'

export const supabase = createClient<Database>(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!
)
```

### Admin panel (tonir-admin)
```typescript
// lib/supabase.ts (client component)
import { createBrowserClient } from '@supabase/ssr'

export const createClient = () =>
  createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

// lib/supabase-server.ts (server component / route handler)
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

export const createServerSupabaseClient = () =>
  createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { getAll: () => cookies().getAll() } }
  )
```

## Standard Query Patterns

### Fetch list
```typescript
const { data, error } = await supabase
  .from('reservations')
  .select('*, table:tables(*)')
  .eq('restaurant_id', restaurantId)
  .eq('date', date)
  .order('time_slot', { ascending: true })
```

### Fetch single
```typescript
const { data, error } = await supabase
  .from('reservations')
  .select('*')
  .eq('confirm_token', token)
  .single()
```

### Insert
```typescript
const { data, error } = await supabase
  .from('reservations')
  .insert({ guest_name, guest_email, ... })
  .select()
  .single()
```

### Update
```typescript
const { error } = await supabase
  .from('reservations')
  .update({ status: 'cancelled' })
  .eq('id', reservationId)
```

## Edge Functions
Located in `supabase/functions/`. Use for:
- `check-availability` — compute available time slots for a date/party size
- `create-reservation` — atomic booking (check + assign table + insert)
- `send-confirmation-email` — trigger email via Resend
- `send-reminder-emails` — cron job for 24h reminders
- `cancel-reservation` — validate deadline + update status + send email

### Calling an Edge Function
```typescript
const { data, error } = await supabase.functions.invoke('check-availability', {
  body: { date: '2024-03-15', party_size: 4, restaurant_id: 'xxx' }
})
```

## Error Handling Pattern
```typescript
const { data, error } = await supabase.from('reservations').select('*')

if (error) {
  console.error(error.message)
  // Show user-friendly error, not raw Supabase error
  throw new Error('Failed to load reservations')
}
```

## Realtime (Admin Panel)
```typescript
// Subscribe to new/updated reservations in admin panel
const channel = supabase
  .channel('reservations')
  .on('postgres_changes', {
    event: '*',
    schema: 'public',
    table: 'reservations',
    filter: `date=eq.${today}`
  }, (payload) => {
    // Update UI
  })
  .subscribe()

// Always unsubscribe on unmount
return () => supabase.removeChannel(channel)
```

## Naming Conventions
- Database columns: `snake_case`
- TypeScript variables: `camelCase`
- Always use generated types from `database.types.ts`
- Regenerate types after schema changes:
  ```bash
  npx supabase gen types typescript --project-id YOUR_PROJECT_ID > lib/database.types.ts
  ```

## Never Do
- Never use `service_role` key on the client
- Never disable RLS on production tables
- Never write raw SQL in the client — use Supabase query builder or Edge Functions
- Never expose database errors directly to the user
