import path from 'node:path'
import { defineConfig } from 'vitest/config'

// Root unit tests only. bench/ is a separate project with its own vitest config and dependencies.
// '@' mirrors the app's tsconfig alias so route handlers can be imported in tests.
// esbuild jsx 'automatic' matches Next's runtime so .tsx components can be rendered to markup in tests.
export default defineConfig({
  esbuild: { jsx: 'automatic' },
  // 'next/font/local' only runs through Next's compiler, so unit tests get a stub with the same shape
  resolve: { alias: { '@': path.resolve(__dirname), 'next/font/local': path.resolve(__dirname, 'tests/stubs/next-font-local.ts') } },
  test: { include: ['tests/**/*.test.ts'], exclude: ['**/node_modules/**', 'bench/**', 'reactive-resume/**'] },
})
