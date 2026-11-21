// Launch copy rules: say only what is true and verified, label the feature Pro, and keep the legal pages in step with what the product does.
import fs from 'node:fs'
import { describe, expect, it } from 'vitest'

const read = (p: string) => fs.readFileSync(p, 'utf8').replace(/\r\n/g, '\n')

describe('privacy and terms', () => {
  const privacy = read('app/privacy/page.tsx').replace(/&apos;/g, "'")
  it('the privacy policy covers connected assistants: cross-border, no chat storage, what is stored, how to disconnect', () => {
    expect(privacy).toContain('AI assistants you connect')
    expect(privacy).toMatch(/outside Nigeria/)
    expect(privacy).toMatch(/do not store your chat messages/)
    expect(privacy).toMatch(/counts of tool calls/)
    expect(privacy).toContain('liveportfolio.site/oauth/connections')
    expect(privacy).toMatch(/assistant connection records/) // deleted with the account
  })
  it('the public legal text carries no internal review notes', () => {
    const visible = privacy.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n') // source comments are not public text
    expect(visible).not.toMatch(/lawyer|legal review|TODO/i)
  })
  it('the terms say assistant changes are made on your instruction and can be undone', () => {
    expect(read('app/terms/page.tsx')).toMatch(/AI assistant, changes it makes are made on your instruction/)
  })
})
