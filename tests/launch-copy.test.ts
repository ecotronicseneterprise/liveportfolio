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

describe('no unverified claims, and the feature is labelled Pro', () => {
  const copy = ['app/connect/page.tsx', 'app/page.tsx', 'lib/docs/connect.ts', 'lib/docs/pages.ts', 'components/docs/ConnectGuide.tsx', 'components/dashboard/AssistantCard.tsx'].map((f) => `${f}\n${read(f)}`).join('\n')
  it('says nothing we have not seen work: no "everything filled in", no one-click Claude claim, no phone support claim', () => {
    expect(copy).not.toMatch(/opens Claude with everything filled in/i)
    expect(copy).not.toMatch(/Claude has a one-click button/i)
    expect(copy).not.toMatch(/for the one-click Claude button/i)
    expect(copy).not.toMatch(/Claude \(web, desktop, phone\)/)
  })
  it('the hook does not promise it updates itself', () => {
    expect(copy).not.toMatch(/updates itself/)
  })
  it('the connect guides say it is a Pro feature, and the untested tools say they may need manual setup', () => {
    expect(read('components/docs/ConnectGuide.tsx')).toContain('included with the Pro plan')
    expect(read('lib/docs/connect.ts')).toContain('Gemini CLI (may need manual setup)')
    expect(read('lib/docs/connect.ts')).toMatch(/may need manual setup/)
  })
  it('docs mention the new tools, the Power BI embed, the limits and the changelog', () => {
    const pages = read('lib/docs/pages.ts')
    for (const s of ['Power BI', '30 skills', 'Fix one education entry', 'Disconnect any assistant at liveportfolio.site/oauth/connections', 'The privacy policy covers connected assistants']) expect(pages, s).toContain(s)
  })
  it('the planned in-dashboard assistant no longer reads like the live feature is missing', () => {
    expect(read('lib/plans.ts')).toContain("label: 'Built-in assistant inside your dashboard'")
    expect(read('lib/plans.ts')).not.toContain("label: 'AI assistant'")
  })
})
