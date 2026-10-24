import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Root unit tests only. bench/ is a separate project with its own vitest config and dependencies.
// '@' mirrors the app's tsconfig alias so route handlers can be imported in tests.
// esbuild jsx 'automatic' matches Next's runtime so .tsx components can be rendered to markup in tests.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  resolve: { alias: { '@': path.resolve(__dirname) } },
  test: { include: ['tests/**/*.test.ts'], exclude: ['**/node_modules/**', 'bench/**', 'reactive-resume/**'] },
})
