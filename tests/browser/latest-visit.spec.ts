import { test, expect, type Page } from '@playwright/test'
import { build } from 'esbuild'
import { analyticsWindow, summarizeAnalytics } from '../../lib/analytics/summary'

const NOW = new Date('2026-10-31T12:00:00Z')
const summary = summarizeAnalytics(Array.from({ length: 7 }, (_, i) => ({ event_type: 'portfolio_view', label: null, country: 'Nigeria', company: null, referrer: 'https://linkedin.com/feed', ip_hash: `demo-${i}`, created_at: NOW.toISOString(), device_type: null })), analyticsWindow(30, NOW), '2025-01-01T00:00:00Z')
let script: string

test.beforeAll(async () => {
  const result = await build({
    stdin: { resolveDir: process.cwd(), loader: 'tsx', contents: `
      import React from 'react'; import {createRoot} from 'react-dom/client';
      import ProOverview from './components/dashboard/ProOverview';
      const root = createRoot(document.getElementById('app'));
      root.render(<ProOverview portfolioId="demo" userId="owner" token="test-only" slug="demo" portfolioUrl="https://example.invalid/demo" content={{}} insight={null} insightLoading={false} onEdit={()=>{}}/>);
      document.getElementById('unmount').onclick = () => root.unmount();
    ` }, bundle: true, write: false, platform: 'browser', jsx: 'automatic', define: { 'process.env.NODE_ENV': '"test"' },
  })
  script = result.outputFiles[0].text
})

async function mount(page: Page, state: { visit: { country: string | null; time: string } | null; status: number; requests: number }) {
  await page.clock.install({ time: NOW })
  await page.route('**/*', async route => {
    const url = new URL(route.request().url())
    if (url.origin !== 'http://localhost:3101') return route.abort()
    if (url.pathname === '/fixture') return route.fulfill({ contentType: 'text/html', body: '<html><body><button id="unmount">Leave dashboard</button><div id="app"></div></body></html>' })
    if (url.pathname === '/api/analytics/summary') return route.fulfill({ json: summary })
    if (url.pathname === '/api/analytics/latest-visit') {
      state.requests++
      expect(route.request().headers().authorization).toBe('Bearer test-only')
      return route.fulfill({ status: state.status, json: state.status === 200 ? { visit: state.visit } : { error: 'Visits unavailable' } })
    }
    return route.abort()
  })
  await page.goto('http://localhost:3101/fixture')
  await page.addScriptTag({ content: script })
}

test('latest visit updates inline, pauses when hidden, resumes on return and stops on unmount', async ({ page }) => {
  const state = { visit: { country: 'Nigeria', time: '2026-10-31T11:59:30Z' }, status: 200, requests: 0 }
  await mount(page, state)
  const latest = page.getByRole('status', { name: 'Latest portfolio visit' })
  await expect(latest).toContainText('Someone from Nigeria viewed your portfolio')
  await expect(latest).toContainText('just now')
  await expect(page.getByText(/^Published ·/)).toHaveCount(0)
  const sources = page.getByRole('region', { name: 'Where attention comes from' })
  await expect(sources).toContainText('100%')
  await expect(sources).not.toContainText('7 ·')
  state.visit = { country: 'Ghana', time: '2026-10-31T12:00:10Z' }
  await page.clock.fastForward(30_001)
  await expect(latest).toContainText('Someone from Ghana')
  expect(state.requests).toBe(2)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await page.clock.fastForward(90_000)
  expect(state.requests).toBe(2)
  await page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' })
    document.dispatchEvent(new Event('visibilitychange'))
  })
  await expect.poll(() => state.requests).toBe(3)
  await expect(latest).toContainText('1m ago')
  await page.getByRole('button', { name: 'Leave dashboard' }).click()
  await page.clock.fastForward(60_000)
  expect(state.requests).toBe(3)
})

test('empty, unknown-country and failed states do not invent new visitors', async ({ page }) => {
  const state: { visit: { country: string | null; time: string } | null; status: number; requests: number } = { visit: null, status: 200, requests: 0 }
  await mount(page, state)
  const latest = page.getByRole('status', { name: 'Latest portfolio visit' })
  await expect(latest).toHaveText('No portfolio visits yet.')
  state.status = 503
  await page.clock.fastForward(30_001)
  await expect(latest).toContainText('temporarily unavailable')
  state.status = 200
  state.visit = { country: null, time: '2026-10-30T11:00:00Z' }
  await page.clock.fastForward(30_001)
  await expect(latest).toContainText('Someone viewed your portfolio')
  await expect(latest).toContainText('1d ago')
  await expect(latest).not.toContainText('just now')
  state.status = 503
  await page.clock.fastForward(30_001)
  await expect(latest).toContainText('Someone viewed your portfolio')
  await expect(latest).toContainText('Updates temporarily unavailable')
})
