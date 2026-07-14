import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: [
        'src/lib/distance.ts',
        'src/lib/localize.ts',
        'src/theme.ts',
        'src/hooks/useVenueAvailability.ts',
      ],
      exclude: [
        'src/lib/supabase.ts',
        'src/lib/database.types.ts',
        'src/lib/api.ts',
      ],
    },
  },
  resolve: {
    alias: {
      // tsconfig: "@/*" -> "src/*"  (baseUrl = ".")
      '@': path.resolve(__dirname, 'src'),
    },
  },
})
