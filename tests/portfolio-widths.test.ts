import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (path: string) => fs.readFileSync(path, 'utf8')

describe('public portfolio layouts use the full desktop width', () => {
  it('the shared block portfolio wrapper is no longer capped to a centred desktop column', () => {
    const css = read('components/blocks/blocks.css')
    expect(css).toContain('.lpb .wrap { width: 100%; max-width: none;')
    expect(css).not.toContain('.lpb .wrap { max-width: 1080px;')
  })

  it('the redesigned Pro pages span the viewport instead of a fixed max-width shell', () => {
    const css = read('components/templates/pro/pro-designs.css')
    expect(css).toContain('.pro-main { width:100%; max-width:none;')
    expect(css).toContain('.pro-topbar { width:100%; max-width:none;')
    expect(css).toContain('.pro-footer { width:100%; max-width:none;')
    expect(css).not.toContain('.pro-main { max-width:1280px;')
  })

  it('the remaining legacy templates with body shells are fluid on desktop and still keep mobile breakpoints', () => {
    const developer = read('components/templates/Developer.tsx')
    const dataScientist = read('components/templates/DataScientist.tsx')
    const cybersecurity = read('components/templates/Cybersecurity.tsx')

    expect(developer).toContain('.dv-main { width: 100%; padding: 40px clamp(28px, 5vw, 72px); min-width: 0; }')
    expect(developer).not.toContain('max-width: 860px;')

    expect(dataScientist).toContain('.sci-body { width: 100%; padding: 0 clamp(20px, 6vw, 88px); }')
    expect(dataScientist).not.toContain('max-width: 1100px; margin: 0 auto;')
    expect(dataScientist).toContain('@media (max-width: 700px) {')

    expect(cybersecurity).toContain('.cy-body { width: 100%; padding: 0 clamp(20px, 6vw, 88px); }')
    expect(cybersecurity).not.toContain('max-width: 1000px; margin: 0 auto;')
    expect(cybersecurity).toContain('@media (max-width: 700px) {')
  })
})
