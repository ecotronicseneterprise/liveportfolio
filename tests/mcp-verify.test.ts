import { describe, expect, it } from 'vitest'
import { appTrust } from '@/lib/mcp/verify'

describe('app trust on the consent screen', () => {
  it('verifies only the real vendor hosts over https', () => {
    expect(appTrust('https://chatgpt.com/connector_platform_oauth_redirect', 'ChatGPT').level).toBe('verified')
    expect(appTrust('https://claude.ai/api/mcp/auth_callback', 'Claude').level).toBe('verified')
  })
  it('does not trust look-alike hosts or http', () => {
    expect(appTrust('https://chatgpt.com.evil.example/cb', 'ChatGPT')).toMatchObject({ level: 'unverified' })
    expect(appTrust('https://evil.example/claude.ai', 'Claude')).toMatchObject({ level: 'unverified' })
    expect(appTrust('http://claude.ai/cb', 'Claude').level).toBe('unverified')
    expect(appTrust('not a url', 'x').level).toBe('unverified')
  })
  it('warns harder when an unverified app uses a vendor name', () => {
    const t = appTrust('https://evil.example/cb', 'ChatGPT')
    expect(t.level === 'unverified' && t.warning).toMatch(/calls itself "ChatGPT"/)
  })
  it('marks loopback apps (Claude Code, editors) as running on your computer', () => {
    expect(appTrust('http://localhost:54321/callback', 'Claude Code').level).toBe('local')
    expect(appTrust('http://127.0.0.1:8080/cb', 'x').level).toBe('local')
  })
})
