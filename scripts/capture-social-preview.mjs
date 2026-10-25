// Run manually when the homepage specimen changes. Captures public, invented sample content only.
// node scripts/capture-social-preview.mjs [https://liveportfolio.site]
import { chromium } from '@playwright/test'
import sharp from 'sharp'
import { mkdir } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

const origin = new URL(process.argv[2] || 'https://liveportfolio.site').origin
const output = fileURLToPath(new URL('../public/social/creative-portfolio-v1.png', import.meta.url))
const browser = await chromium.launch({ headless: true })
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 }, deviceScaleFactor: 1, reducedMotion: 'reduce' })
  // No analytics, auth, APIs or third-party calls. Use a fresh browser without account cookies.
  await page.route('**/*', (route) => {
    const request = route.request()
    const url = new URL(request.url())
    return url.origin === origin && request.method() === 'GET' && !url.pathname.startsWith('/api/')
      ? route.continue() : route.abort()
  })
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  await page.locator('.spec-pane-studio .name').waitFor()
  await page.locator('label[for="spec-studio"]').click()
  await page.addStyleTag({ content: `
    .lpl .spec { position: fixed; left: 0; top: 0; width: 1200px; z-index: 9999; background: white; }
    .lpl .spec-bar, .lpl .spec-cap { display: none; }
    .lpl .browser-window { width: 1200px; height: 630px; box-shadow: none; }
    .lpl .spec-frame { scrollbar-width: none; }
    .lpl .spec-frame::-webkit-scrollbar { display: none; }
  ` })
  await page.evaluate(async () => {
    await document.fonts.ready
    const pane = document.querySelector('.spec-pane-studio')
    const images = [...pane.querySelectorAll('img')]
    for (const image of images) image.loading = 'eager'
    await Promise.all(images.map((image) => image.decode()))
    if (!images.length || images.some((image) => !image.naturalWidth)) throw new Error('Specimen images did not load')
    document.querySelector('.spec-frame').scrollTop = 0
  })
  const name = await page.locator('.spec-pane-studio .name').textContent()
  if (!name?.includes('Clifford Nwanna')) throw new Error('Unexpected homepage specimen; refusing to replace the share image')
  const screenshot = await page.locator('.spec .browser-window').screenshot({ animations: 'disabled' })
  const image = sharp(screenshot)
  const metadata = await image.metadata()
  if (metadata.width !== 1200 || metadata.height !== 630) throw new Error('Unexpected share image dimensions')
  await mkdir(fileURLToPath(new URL('../public/social/', import.meta.url)), { recursive: true })
  await image.png({ compressionLevel: 9, palette: true, quality: 95 }).toFile(output)
  console.log(`Captured Creative homepage specimen: ${output} (1200 × 630)`)
} finally {
  await browser.close()
}