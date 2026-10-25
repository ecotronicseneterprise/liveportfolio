import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

describe('block portfolio hero spacing', () => {
  it('does not force the first section to fill the viewport on public pages', () => {
    const css = fs.readFileSync('components/blocks/blocks.css', 'utf8')
    expect(css).toContain('.lpb[data-page] main > .b-hero { min-height: auto; display: flex; align-items: flex-start; }')
    expect(css).toContain('.lpb[data-theme="studio"][data-page] main > .b-hero { min-height: auto; }')
    expect(css).not.toContain('min-height: calc(100svh - 56px)')
    expect(css).not.toContain('.lpb[data-theme="studio"][data-page] main > .b-hero { min-height: 100svh; }')
  })

  it('tightens the space after the hero and increases avatar sizes', () => {
    const css = fs.readFileSync('components/blocks/blocks.css', 'utf8')
    expect(css).toContain('.lpb .b-hero + .b { padding-top: clamp(28px, calc(var(--sec) * 0.55), 52px); }')
    expect(css).toContain('.lpb .b-hero .photo { width: 208px; height: 208px;')
    expect(css).toContain('.lpb .b-hero--split .photo, .lpb .b-hero--split .photo-monogram { width: 232px; height: 232px;')
    expect(css).toContain('.lpb .b-hero--statement .photo, .lpb .b-hero--statement .photo-monogram { width: 340px; height: 340px;')
  })
})
