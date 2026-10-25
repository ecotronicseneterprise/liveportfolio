import { defineConfig } from '@playwright/test'

export default defineConfig({
  testDir: './tests/browser',
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  reporter: 'list',
  outputDir: 'test-results',
  use: { baseURL: process.env.TEMPLATE_REVIEW_URL || 'http://localhost:3101', viewport: { width: 375, height: 812 }, reducedMotion: 'reduce', trace: 'retain-on-failure' },
  projects: [ { name: 'chromium', use: { browserName: 'chromium' } }, { name: 'firefox', use: { browserName: 'firefox' } }, { name: 'webkit', use: { browserName: 'webkit' } } ],
})