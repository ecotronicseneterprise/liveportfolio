// Developer Pro design: the contact block must not sit under the sticky left rail (the rail overlapped it on a wide screen).
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

describe('Developer design contact placement', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../components/templates/pro/pro-designs.css'), 'utf8')
  it('contact is in the right-hand column on a wide screen, never spanning under the sticky rail', () => {
    expect(css).toMatch(/\.pro-developer \.pro-contact \{ grid-column:2;/)
    expect(css).not.toMatch(/\.pro-developer \.pro-contact \{ grid-column:1\/-1/)
  })
  it('on a narrow screen (single column) it goes back to column 1', () => {
    const narrow = css.slice(css.indexOf('@media(max-width:1000px)'))
    expect(narrow).toMatch(/\.pro-developer \.pro-contact \{ grid-column:1;/)
  })
})