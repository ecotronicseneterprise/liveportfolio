import { test, expect } from '@playwright/test'
import { build } from 'esbuild'
import postcss from 'postcss'
import tailwindcss from 'tailwindcss'
import path from 'node:path'

// Isolated component harness: real layout/pickers and interaction handlers, lightweight preview drawings.
// No Next server, credentials, real portfolios or writes. Dashboard wiring is covered by dashboard-mobile-fixes.test.ts.
const fixture = `
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import FreeSplit from './components/dashboard/FreeSplit';
import FreePreview from './components/dashboard/FreePreview';
import TemplateCarousel from './components/dashboard/TemplateCarousel';
import LookPicker from './components/dashboard/LookPicker';
import ProDesignPicker from './components/dashboard/ProDesignPicker';
function Harness() {
  const plan = document.documentElement.dataset.plan;
  const pro = plan === 'pro';
  const [preview, setPreview] = useState('minimal');
  const [saved, setSaved] = useState('minimal');
  const [selections, setSelections] = useState(0);
  const content = { name:'Demo', role:'Designer', projects:[], experience:[], skills:[], layout:{v:1, arrangement:'profile'} };
  const select = id => { setSaved(id); setPreview(id); setSelections(n => n + 1); };
  return <main className="p-4"><output aria-label="Selection count">{selections}</output>
    <FreeSplit enabled mobilePreview={!pro} preview={<FreePreview content={content} plan={plan} slug="demo" liveUrl="https://example.invalid/demo" previewId={preview} savedId={saved} onPick={select} onUpgrade={()=>{}} onPublish={()=>{}}/>}>
      <h1>Edit your portfolio</h1>
      {pro && <div className="lg:hidden"><TemplateCarousel content={content} previewId={preview} savedId={saved} onPreview={setPreview} onUse={select}/></div>}
      <div data-testid="look-controls" className={pro ? 'hidden lg:block' : undefined}><LookPicker content={content} template={saved} isPro={pro} hideLooksOnPhone={pro} onChange={()=>{}} onLocked={()=>{}}/></div>
      <div data-testid="version-controls" className={pro ? 'hidden lg:block' : undefined}><ProDesignPicker content={content} template="developer" selectedTemplate={saved} isPro={pro} busy={false} onSave={async()=>{}} onUpgrade={()=>{}}/></div>
      <label>Headline<input aria-label="Headline"/></label>
    </FreeSplit></main>;
}
createRoot(document.getElementById('app')).render(<Harness/>);`

let script: string
let css: string

test.beforeAll(async () => {
  const result = await build({
    stdin: { contents: fixture, resolveDir: process.cwd(), loader: 'tsx' },
    bundle: true, write: false, platform: 'browser', jsx: 'automatic',
    define: { 'process.env.NODE_ENV': '"test"' },
    plugins: [{ name: 'local-preview-drawings', setup(builder) {
      builder.onResolve({ filter: /TemplateGallery$/ }, () => ({ path: 'thumb', namespace: 'fixture' }))
      builder.onResolve({ filter: /templates\/dynamic$/ }, () => ({ path: 'labels', namespace: 'fixture' }))
      builder.onLoad({ filter: /.*/, namespace: 'fixture' }, ({ path: name }) => ({ loader: 'jsx', resolveDir: process.cwd(), contents: name === 'thumb'
        ? `import React from 'react'; export const useDebounced = value => value; export const TemplateThumb = ({id,height}) => <div data-testid="drawing" style={{height:height||100,background:'#e8f0f9'}}>Preview: {id}</div>;`
        : `export const TEMPLATE_LABEL = {minimal:'Minimal',bold:'Bold',creative:'Creative',developer:'Developer',designer:'Designer','data-scientist':'Data scientist','product-manager':'Product manager',finance:'Finance',graduate:'Graduate',cybersecurity:'Cybersecurity'};` }))
    } }],
  })
  script = result.outputFiles[0].text
  const styles = await postcss([tailwindcss({ content: [
    { raw: fixture, extension: 'tsx' },
    ...['FreeSplit', 'FreePreview', 'TemplateCarousel', 'LookPicker', 'ProDesignPicker'].map(name => path.resolve('components', 'dashboard', `${name}.tsx`)),
  ] })]).process('@tailwind base; @tailwind utilities;', { from: undefined })
  css = styles.css
})

async function mount(page: import('@playwright/test').Page, plan: string) {
  await page.route('**/*', route => route.abort())
  await page.setContent(`<html data-plan="${plan}"><head></head><body><div id="app"></div></body></html>`)
  await page.addStyleTag({ content: css })
  await page.addScriptTag({ content: script })
  await expect(page.getByRole('heading', { name: 'Edit your portfolio' })).toBeVisible()
}

test('Pro phone/tablet keeps just the carousel; swipes preview and card selection fires once', async ({ page }, info) => {
  await mount(page, 'pro')
  for (const width of [375, 768, 1023]) {
    await page.setViewportSize({ width, height: 900 })
    await expect(page.getByRole('region', { name: 'Choose a design' })).toBeVisible()
    await expect(page.getByRole('tablist', { name: 'Edit or preview' })).toHaveCount(0)
    await expect(page.locator('#fs-panel-preview')).toBeHidden()
    await expect(page.getByTestId('look-controls')).toBeHidden()
    await expect(page.getByTestId('version-controls')).toBeHidden()
    await expect(page.getByTestId('drawing').filter({ visible: true })).toHaveCount(11) // one preview and ten small cards
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  }
  await page.setViewportSize({ width: 375, height: 900 })
  await page.getByRole('button', { name: 'Next design', exact: true }).click()
  await expect(page.getByRole('region', { name: 'Choose a design' }).getByRole('status')).toContainText('Previewing only')
  await expect(page.getByLabel('Selection count')).toHaveText('0')
  const preview = page.getByRole('img', { name: /Preview of your portfolio in/ })
  await preview.dispatchEvent('pointerdown', { clientX: 280, clientY: 160 })
  await preview.dispatchEvent('pointerup', { clientX: 120, clientY: 165 })
  await expect(page.getByLabel('Selection count')).toHaveText('0')
  await page.getByRole('button', { name: 'Developer, Pro', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Developer, Pro, your current design', exact: true })).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByLabel('Selection count')).toHaveText('1')
  await expect(page.getByRole('region', { name: 'Choose a design' }).getByRole('status')).toContainText('Your current design')
  await page.screenshot({ path: info.outputPath('pro-mobile-editor.png'), fullPage: true })
  await page.setViewportSize({ width: 1440, height: 900 })
  await expect(page.getByRole('region', { name: 'Choose a design' })).toBeHidden()
  await expect(page.locator('#fs-panel-preview')).toBeVisible()
  await expect(page.getByTestId('look-controls')).toBeVisible()
  await expect(page.getByTestId('version-controls')).toBeVisible()
})

for (const plan of ['free', 'basic']) {
  test(`${plan} retains mobile Edit/Preview tabs and its existing controls`, async ({ page }) => {
    await mount(page, plan)
    await expect(page.getByRole('tablist', { name: 'Edit or preview' })).toBeVisible()
    await expect(page.getByTestId('look-controls')).toBeVisible()
    await expect(page.getByTestId('version-controls')).toBeVisible()
    await page.getByRole('tab', { name: 'Preview', exact: true }).click()
    await expect(page.locator('#fs-panel-preview')).toBeVisible()
    await expect(page.locator('#fs-panel-edit')).toBeHidden()
    await page.getByRole('tab', { name: 'Edit', exact: true }).click()
    await expect(page.getByRole('textbox', { name: 'Headline', exact: true })).toBeVisible()
  })
}
