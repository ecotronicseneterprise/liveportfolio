#!/usr/bin/env node
// Measures the onboarding template gallery on a throttled mobile profile through the Chrome DevTools Protocol.
//   NEXT_PUBLIC_PREVIEW_LAB=true npx next build && npx next start -p 3101      (in another terminal)
//   node scripts/perf-gallery.mjs http://localhost:3101/create/preview-lab
// Profile: 390x844, DPR 2, 4x CPU slowdown, ~1.6 Mbps / 150 ms RTT (a "slow 4G" preset). Prints totals per phase:
// main-thread task time, script time, layout+style time, long tasks (>50 ms) and total blocking time, JS heap, requests
// to third parties (must be 0), and how many templates were actually mounted.
import { spawn } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const URL_ = process.argv[2] || 'http://localhost:3101/create/preview-lab'
const CHROME = process.env.CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe'
const port = 9444
const prof = fs.mkdtempSync(path.join(os.tmpdir(), 'perf-chrome-'))
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', `--user-data-dir=${prof}`, `--remote-debugging-port=${port}`, 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
for (let i = 0; i < 60; i++) { try { if ((await fetch(`http://127.0.0.1:${port}/json/version`)).ok) break } catch {} await sleep(250) }
const targets = await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
const requests = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id) }
  if (d.method === 'Network.requestWillBeSent') requests.push(d.params.request.url)
}
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evaluate = async (expression) => (await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })).result.result.value

await send('Page.enable'); await send('Network.enable'); await send('Performance.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 390, height: 844, deviceScaleFactor: 2, mobile: true })
await send('Emulation.setCPUThrottlingRate', { rate: 4 })
await send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: (1.6 * 1024 * 1024) / 8, uploadThroughput: (750 * 1024) / 8 })
await send('Network.setCacheDisabled', { cacheDisabled: true })

const metrics = async () => Object.fromEntries((await send('Performance.getMetrics')).result.metrics.map((m) => [m.name, m.value]))
const mounted = () => evaluate(`document.querySelectorAll('[inert]').length`)
await send('Page.navigate', { url: URL_ })
const t0 = Date.now()
await evaluate(`new Promise(r => { window.__lt = []; try { new PerformanceObserver(l => l.getEntries().forEach(e => window.__lt.push(e.duration))).observe({ entryTypes: ['longtask'] }) } catch {} r(1) })`)
// first template visible
let firstMs = null
for (let i = 0; i < 200; i++) { if ((await mounted()) > 0) { firstMs = Date.now() - t0; break } await sleep(100) }
await sleep(1500)
const phases = {}
const snap = async (name, extra = {}) => {
  const m = await metrics()
  const lt = await evaluate('window.__lt.slice()')
  phases[name] = {
    taskMs: +(m.TaskDuration * 1000).toFixed(0), scriptMs: +(m.ScriptDuration * 1000).toFixed(0),
    layoutStyleMs: +((m.LayoutDuration + m.RecalcStyleDuration) * 1000).toFixed(0), longTasks: lt.length,
    totalBlockingMs: +lt.reduce((a, d) => a + Math.max(0, d - 50), 0).toFixed(0), heapMB: +(m.JSHeapUsedSize / 1048576).toFixed(1),
    templatesMounted: await mounted(), ...extra,
  }
}
await snap('1 after load (first screen)', { firstTemplateVisibleMs: firstMs })
// scroll through the whole gallery in screen-sized steps
const height = await evaluate('document.documentElement.scrollHeight')
for (let y = 0; y < height; y += 600) { await evaluate(`window.scrollTo(0, ${y})`); await sleep(400) }
await sleep(1500)
await snap('2 after scrolling through all 10')
// type 12 characters; the gallery re-renders once per debounce window, not per key
await evaluate(`window.scrollTo(0, 0); document.getElementById('lab-name').focus()`)
const before = await metrics()
for (const ch of 'Ada Okonkwo-Eze') { await send('Input.insertText', { text: ch }); await sleep(60) }
await sleep(1500)
await snap('3 after typing 15 characters (debounced)')
const third = requests.filter((u) => { try { return new URL(u).host !== new URL(URL_).host && !u.startsWith('data:') } catch { return false } })
console.log(JSON.stringify({ profile: '390x844 @2x, 4x CPU slowdown, 1.6 Mbps / 150 ms RTT, cache off', url: URL_, phases, thirdPartyRequests: third, totalRequests: requests.length }, null, 2))
ws.close(); chrome.kill()
try { fs.rmSync(prof, { recursive: true, force: true }) } catch {}
