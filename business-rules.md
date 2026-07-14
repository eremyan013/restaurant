# Business Rules — Tonir Restaurant Reservation System

## Reservation Rules

### Creating a Reservation
- Minimum advance notice: 2 hours before requested time
- Maximum party size: 20 (from restaurants.max_party_size)
- Required fields: guest_name, guest_email, guest_phone, party_size, date, time_slot
- Use `create-reservation` Edge Function — never insert directly from client
- Edge Function handles atomically: availability check → table assignment → insert
- On success: send confirmation email with confirm/cancel deep links
- New reservation status: `pending`

### Table Assignment Logic
```
1. Query tables where is_active = true AND capacity >= party_size
2. Exclude tables with overlapping active reservations
   (active = status in ['pending', 'confirmed'])
   (overlap = date matches AND time ranges overlap within slot_duration)
3. Sort by capacity ASC (smallest table that fits)
4. Assign first result
5. If no result → return error 'no_availability'
```

### Confirming a Reservation
- Guest clicks confirm link → app calls update with confirm_token
- Status changes: `pending` → `confirmed`
- Token verified server-side in Edge Function
- Already confirmed → return success (idempotent)

### Cancelling a Reservation
- Deadline: 1 hour before reservation time
- Past deadline → return error `cancellation_deadline_passed`
- Guest cancels via cancel_token (no auth required)
- Staff cancels via reservation ID (auth required, any time)
- On cancel: status → `cancelled`, send cancellation email

### Completing a Reservation
- Staff manually marks as `completed`
- Future: auto-complete via cron job 2 hours after time_slot

### No-Show
- Staff manually marks as `no_show`
- Future: auto-mark via cron job 30 min after time_slot with no status change

## Availability Rules

### Time Slot Generation
- Fetch schedule for requested day_of_week
- If is_open = false → return empty (restaurant closed)
- Check blocked_dates for the date → if exists, return empty
- Generate slots from open_time to (close_time - slot_duration_minutes)
- Slot interval: every 30 minutes (configurable)
- Example: open 18:00, close 23:00, duration 90min
  → slots: 18:00, 18:30, 19:00, 19:30, 20:00, 20:30, 21:30 (last slot ends at 23:00)

### Slot Availability
- For each slot: count tables with capacity >= party_size AND no conflict
- Conflict = existing reservation on same table, same date,
  where time ranges overlap: existing_slot < requested_slot + duration
  AND existing_slot + duration > requested_slot
- Slot is available if count > 0

## Reminder Rules
- Send 24h reminder email for all `confirmed` reservations
- Triggered by Supabase cron Edge Function (pg_cron or scheduled function)
- Track with `reminder_sent` flag to avoid duplicates
- Only send to `confirmed` status — not pending or cancelled

## Auth Rules (Supabase Auth)
- Admin panel requires authenticated Supabase session
- Customer app: guests book without auth (token-based access)
- Staff/admin roles stored in `profiles` table
- RLS enforces role checks at database level
- Session managed by Supabase Auth (@supabase/ssr in Next.js)
- Never check roles only on frontend — RLS is the real enforcement

## Email Rules
- Confirmation email: sent immediately after reservation created
- Contains: reservation details + confirm link + cancel link
- Links format (deep link for mobile, web link for admin):
  - Confirm: `tonir://reservation/confirm?token={confirm_token}`
  - Cancel: `tonir://reservation/cancel?token={cancel_token}`
- Reminder email: sent 24h before, contains reservation details + cancel link
- Cancellation email: sent after cancellation confirmed
