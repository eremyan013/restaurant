import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    clearMocks: true, // auto-clear mock calls/instances between each test
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      include: ['lib/**/*.ts', 'app/**/*.ts', 'app/**/*.tsx'],
      exclude: ['app/layout.tsx', 'app/page.tsx', 'lib/database.types.ts'],
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
})
