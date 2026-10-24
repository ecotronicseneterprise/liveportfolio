#!/usr/bin/env node
// Horizontal-overflow check through the Chrome DevTools Protocol. For each width it reports documentElement.scrollWidth vs
// innerWidth and lists the elements that stick out past the right edge (the usual cause of a page that scrolls sideways or
// "tilts" on a phone). Usage: node scripts/overflow-check.mjs http://localhost:3101/ [more urls...]
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const urls = process.argv.slice(2)
if (!urls.length) { console.error('usage: overflow-check.mjs <url> [url...]'); process.exit(2) }
const WIDTHS = process.env.WIDTHS ? process.env.WIDTHS.split(",").map(Number) : [360, 390, 768, 1366, 1920]
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9555
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'ovf-chrome-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${prof}`, `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break } catch {} await sleep(250) }
const ws = new WebSocket((await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) } }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true })).result.result.value

const probe = `(() => {
  const iw = innerWidth, out = []
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect()
    if (r.width === 0 || r.height === 0) continue
    const cs = getComputedStyle(el)
    if (cs.visibility === 'hidden' || cs.display === 'none') continue
    if (r.right > iw + 1 || r.left < -1) out.push({ tag: el.tagName.toLowerCase(), cls: String(el.className).slice(0, 70), pos: cs.position, left: Math.round(r.left), right: Math.round(r.right), w: Math.round(r.width), anim: cs.animationName !== 'none' })
  }
  out.sort((a, b) => b.right - a.right)
  return JSON.stringify({ sw: document.documentElement.scrollWidth, iw, bodySw: document.body.scrollWidth, offenders: out.slice(0, 6) })
})()`

let bad = 0
await send('Page.enable')
for (const url of urls) {
  for (const w of WIDTHS) {
    await send('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 1, mobile: w < 900 })
    await send('Page.navigate', { url })
    await sleep(2500)
    const r = JSON.parse(await evaluate(probe))
    const ok = r.sw <= r.iw
    if (!ok) bad++
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${url} @${w}: scrollWidth ${r.sw} / innerWidth ${r.iw}`)
    if (!ok || process.env.ALL) for (const o of r.offenders) console.log('       ', JSON.stringify(o))
  }
}
ws.close(); chrome.kill()
try { fs.rmSync(prof, { recursive: true, force: true }) } catch {}
process.exit(bad ? 1 : 0)
