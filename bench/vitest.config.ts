import path from 'node:path'
import { defineConfig } from 'vitest/config'

// '@' mirrors the app's tsconfig alias so route handlers can be imported in tests.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname, '..') } },
  test: { include: ['tests/**/*.test.ts'], testTimeout: 120_000 },
})
