import { test, expect, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { PRO_TEMPLATES } from '../../lib/plans'

// NO real data/services, no analytics, and no writes. Every test uses the synthetic review route.
test.beforeEach(async ({ page, baseURL }) => {
  const origin = new URL(baseURL!).origin
  if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname)) throw new Error('Synthetic browser tests must run locally')
  await page.route('**/*', (route) => {
    const url = new URL(route.request().url())
    if (url.origin !== origin || url.pathname.startsWith('/api/')) return route.abort()
    return route.continue()
  })
})
async function noOverflow(page: Page) {
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1)
}

for (const template of PRO_TEMPLATES) {
  test(`${template}: full-page layouts, a11y, keyboard and defensive data`, async ({ page }, info) => {
    const errors: string[] = []
    page.on('pageerror', (error) => errors.push(error.message))
    const person = template === 'designer' ? 'artwork' : template === 'finance' ? 'finance' : 'engineer'
    await page.goto(`/design-review?p=${person}&t=${template}&v=2`)
    await expect(page.locator('[data-design-version="2"]')).toBeVisible()
    await page.evaluate(() => document.fonts.ready)
    for (const width of [320, 360, 375, 768, 1440]) {
      await page.setViewportSize({ width, height: 900 })
      await noOverflow(page)
      if ([375, 768, 1440].includes(width)) await page.screenshot({ path: info.outputPath(`${template}-${width}.png`), fullPage: true })
    }
    await page.setViewportSize({ width: 375, height: 812 })
    const audit = await new AxeBuilder({ page }).include('.pro-page').withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(audit.violations.map((v) => ({ id: v.id, description: v.description, nodes: v.nodes.map((n) => n.target) }))).toEqual([])
    const menu = page.getByRole('button', { name: 'Open portfolio menu' })
    await menu.focus()
    await page.keyboard.press('Enter')
    await expect(page.getByRole('button', { name: 'Close portfolio menu' })).toHaveAttribute('aria-expanded', 'true')
    await page.getByRole('navigation', { name: 'Mobile portfolio' }).getByRole('link', { name: 'Work', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Open portfolio menu' })).toHaveAttribute('aria-expanded', 'false')
    // CSS zoom is a reflow stress check, not a claim of browser-UI zoom certification.
    await page.locator('.pro-page').evaluate((element) => { (element as HTMLElement).style.zoom = '2' })
    await noOverflow(page)
    await page.locator('.pro-page').evaluate((element) => { (element as HTMLElement).style.zoom = '' })
    for (const fixture of ['sparse', 'chef', 'long', 'hostile', 'many', 'broken']) {
      await page.goto(`/design-review?p=${fixture}&t=${template}&v=2`)
      await expect(page.locator('[data-design-version="2"]')).toBeVisible()
      await noOverflow(page)
      await expect(page.locator('a[href^="javascript:"],img[src^="javascript:"],a[href="mailto:"]')).toHaveCount(0)
      if (fixture === 'many') {
        await expect(page.getByRole('heading', { name: 'Project 50', exact: true })).toHaveCount(1)
        await expect(page.getByText('Certificate 50', { exact: true })).toHaveCount(1)
      }
      if (fixture === 'broken') await expect(page.locator('.pro-portrait, .pro-project-image')).toHaveCount(0)
    }
    expect(errors).toEqual([])
  })
  test(`${template}: preview is write-free, explicit selection is reversible`, async ({ page }) => {
    const writes: string[] = []
    page.on('request', (request) => { if (!['GET', 'HEAD'].includes(request.method())) writes.push(request.url()) })
    await page.goto(`/design-review?p=engineer&t=${template}&picker=1`)
    await page.getByRole('button', { name: 'Preview redesigned version', exact: true }).click()
    await expect(page.locator('[data-design-version="2"]')).toBeAttached()
    await page.getByRole('button', { name: 'Preview original version', exact: true }).click()
    await expect(page.locator('[data-design-version="2"]')).toHaveCount(0)
    expect(writes).toEqual([])
    // This harness saves only to local state. The real API/History uses the unit-tested auth/CAS pipeline.
    await page.getByRole('button', { name: 'Preview redesigned version', exact: true }).click()
    await page.getByRole('button', { name: 'Save this design', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Saved design', exact: true })).toBeDisabled()
    await page.getByRole('button', { name: 'Preview original version', exact: true }).click()
    await page.getByRole('button', { name: 'Save this design', exact: true }).click()
    await expect(page.locator('[data-design-version="2"]')).toHaveCount(0)
    expect(writes).toEqual([])
  })
  test(`${template}: server and client choose the same version`, async ({ page }) => {
    for (const version of ['1', '2']) {
      await page.goto(`/design-review?p=engineer&t=${template}&v=${version}`)
      const expected = await page.locator('h1').innerText()
      await page.goto(`/design-review?p=engineer&t=${template}&v=${version}&client=1`)
      await expect(page.locator('h1')).toHaveText(expected)
      await expect(page.locator('[data-design-version="2"]')).toHaveCount(version === '2' ? 1 : 0)
    }
  })
}