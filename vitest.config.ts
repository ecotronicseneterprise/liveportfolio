import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Root unit tests only. bench/ is a separate project with its own vitest config and dependencies.
// '@' mirrors the app's tsconfig alias so route handlers can be imported in tests.
export default defineConfig({
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { include: ['tests/**/*.test.ts'], exclude: ['**/node_modules/**', 'bench/**', 'reactive-resume/**'] },
})
