# Design Tokens — tonir (React Native / Expo)

## Colors

### Brand
```typescript
export const colors = {
  primary: '#C8573A',        // warm terracotta
  primaryHover: '#B04A30',
  primaryLight: '#F5E8E4',

  secondary: '#2C3E2D',      // deep forest green
  secondaryLight: '#E8EFE8',

  // Semantic
  success: '#2D7A4F',
  successBg: '#E8F5EE',
  warning: '#A0620A',
  warningBg: '#FEF3E2',
  error: '#C0392B',
  errorBg: '#FDECEA',
  info: '#1A6FA8',
  infoBg: '#E3F0FA',

  // Neutral
  textPrimary: '#1A1A1A',
  textSecondary: '#5A5A5A',
  textMuted: '#9A9A9A',
  textInverse: '#FFFFFF',

  bgPrimary: '#FFFFFF',
  bgSecondary: '#F8F6F3',    // warm off-white
  bgTertiary: '#F0EDE8',

  border: '#E0DBD5',
  borderStrong: '#C5BDB5',
}
```

## Typography

### Fonts
```typescript
// app.json expo-font config
// Load via expo-font or @expo-google-fonts
export const fonts = {
  heading: 'PlayfairDisplay_600SemiBold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  mono: 'JetBrainsMono_400Regular',
}
```

### Font Sizes
```typescript
export const fontSize = {
  xs: 12,
  sm: 14,
  base: 16,
  lg: 18,
  xl: 20,
  '2xl': 24,
  '3xl': 30,
}
```

### Line Heights
```typescript
export const lineHeight = {
  tight: 1.25,
  normal: 1.5,
  relaxed: 1.75,
}
```

## Spacing (React Native uses numbers, not strings)
```typescript
export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  8: 32,
  10: 40,
  12: 48,
}
```

## Border Radius
```typescript
export const radius = {
  sm: 4,
  md: 8,
  lg: 12,
  xl: 16,
  full: 9999,
}
```

## Reservation Status Colors
```typescript
export const statusColors = {
  pending:   { bg: '#FEFCE8', text: '#A16207', border: '#FDE047' },
  confirmed: { bg: '#F0FDF4', text: '#15803D', border: '#86EFAC' },
  cancelled: { bg: '#FEF2F2', text: '#B91C1C', border: '#FCA5A5' },
  completed: { bg: '#F9FAFB', text: '#4B5563', border: '#D1D5DB' },
  no_show:   { bg: '#FFF7ED', text: '#C2410C', border: '#FDBA74' },
}
```

## NativeWind (Tailwind for RN)
This project uses NativeWind. Use Tailwind class names directly:
```tsx
<View className="bg-white rounded-xl p-4 border border-gray-100">
  <Text className="text-base font-medium text-gray-900">Title</Text>
  <Text className="text-sm text-gray-500">Subtitle</Text>
</View>
```

Custom brand colors are extended in `tailwind.config.js`:
```js
theme: {
  extend: {
    colors: {
      brand: '#C8573A',
      forest: '#2C3E2D',
    }
  }
}
```

## Component Sizing
```typescript
export const sizing = {
  inputHeight: 48,        // taller for mobile touch targets
  buttonHeight: 52,
  iconSm: 16,
  iconMd: 20,
  iconLg: 24,
  avatarSm: 32,
  avatarMd: 40,
  hitSlop: { top: 8, bottom: 8, left: 8, right: 8 }, // touch area
}
```

## Rules
- Minimum touch target: 44x44pt (Apple HIG)
- Use `hitSlop` on small touchable elements
- Never use px units — React Native uses density-independent points
- Test on both iOS and Android for spacing/font differences
