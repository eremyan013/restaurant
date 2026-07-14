# Component Library — tonir (React Native / Expo)

## Existing Components (update as you build)

### Core UI (components/ui/)
- `Button` — primary, secondary, ghost, danger; sm/md/lg sizes
- `Input` — text input with label, error message, helper text
- `Select` — bottom sheet picker for React Native
- `Badge` — reservation status badge
- `Card` — white card with shadow and rounded corners
- `Spinner` — loading indicator
- `Toast` — success/error notification (react-native-toast-message)
- `Avatar` — initials circle or image avatar
- `Divider` — horizontal separator

### Layout (components/layout/)
- `ScreenWrapper` — safe area + scroll view + consistent padding
- `Header` — screen header with back button and title
- `BottomTabBar` — main navigation tabs

### Reservation (components/reservation/)
- `DateSelector` — horizontal scrollable date picker (next 30 days)
- `TimeSlotGrid` — grid of available time slots for selected date
- `TimeSlotButton` — individual slot button (available/selected/unavailable)
- `BookingForm` — guest info form (name, email, phone, party size, notes)
- `PartySizeSelector` — +/- stepper for party size
- `ReservationCard` — summary card: date, time, party, status, restaurant
- `ReservationStatusBadge` — colored status pill
- `ConfirmationScreen` — post-booking success with details + share/add to calendar
- `EmptyReservations` — empty state when no upcoming bookings

### Restaurant (components/restaurant/)
- `RestaurantHero` — image, name, address, phone
- `OpeningHours` — weekly schedule display
- `InfoRow` — icon + label + value row (used in restaurant info)

## Component Rules
- Minimum touch target: 44x44pt — use `hitSlop` on small elements
- Every async component has a loading skeleton (use `react-native-skeleton-placeholder`)
- Error states: every data screen has an error message + retry button
- Empty states: friendly illustration + message for empty lists
- Use `accessibilityLabel` on all interactive elements
- Test on both iOS and Android

## Navigation Structure (Expo Router)
```
app/
├── (tabs)/
│   ├── _layout.tsx         (bottom tabs)
│   ├── index.tsx           (home / restaurant info)
│   ├── book.tsx            (booking flow start)
│   └── reservations.tsx    (my reservations list)
├── booking/
│   ├── [date].tsx          (time slot selection)
│   └── confirm.tsx         (booking form + submit)
├── reservation/
│   ├── [id].tsx            (reservation detail)
│   ├── confirm.tsx         (confirm via token)
│   └── cancel.tsx          (cancel via token)
└── _layout.tsx             (root layout + Supabase provider)
```

## File Structure
```
tonir/
├── app/                    (Expo Router screens)
├── components/
│   ├── ui/
│   ├── layout/
│   ├── reservation/
│   └── restaurant/
├── lib/
│   ├── supabase.ts         (Supabase client)
│   └── database.types.ts   (generated types)
├── hooks/
│   ├── useAvailability.ts
│   ├── useReservation.ts
│   └── useRestaurant.ts
├── store/
│   └── bookingStore.ts     (Zustand: booking flow state)
└── constants/
    ├── colors.ts
    └── spacing.ts
```

## Key Libraries
- `expo-router` — file-based navigation
- `@supabase/supabase-js` — backend client
- `nativewind` — Tailwind classes for RN
- `react-hook-form` + `zod` — form validation
- `zustand` — booking flow state
- `react-native-toast-message` — notifications
- `@expo/vector-icons` — icons (Ionicons set)
- `expo-linking` — deep link handling (confirm/cancel tokens)
