import { defineConfig } from 'vitest/config'

// Model comparison harness. Calls the real OpenAI API — run explicitly:
//   npm run bench:models
export default defineConfig({
  test: { include: ['*.bench.ts'], testTimeout: 3_600_000, hookTimeout: 60_000 },
})
