// Review fixes for the import flow: values that reach the browser are validated with exact-host checks, the GitHub
// ranking never pre-selects more than the form can hold, field limits match /api/generate, and both feature flags
// ship disabled.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { RANK } from '../lib/connectors/github-rank'
import { parseGithubUsername } from '../lib/connectors/github'
import { normalizeProfile } from '../lib/connectors/normalize'
import { applyDraftToForm, MAX_FORM_PROJECTS } from '../lib/connectors/to-form'
import { LIMITS } from '../lib/connectors/types'
import { httpUrl, isGithubAvatarUrl, isLinkedinProfileUrl, isRepoRef, parseExcludeList } from '../lib/connectors/safe-url'

const ROOT = path.resolve(__dirname, '..')

describe('avatar host allow-list (exact host)', () => {
  it('accepts only https://avatars.githubusercontent.com', () => {
    expect(isGithubAvatarUrl('https://avatars.githubusercontent.com/u/1?v=4')).toBe(true)
  })
  it.each([
    'http://avatars.githubusercontent.com/u/1',
    'https://avatars.githubusercontent.com.evil.example/u/1',
    'https://evil.example/avatars.githubusercontent.com/u/1',
    'https://avatars.githubusercontent.com@evil.example/u/1',
    'https://user:pw@avatars.githubusercontent.com/u/1',
    'https://avatars.githubusercontent.com:8443/u/1',
    'https://AVATARS.githubusercontent.com.evil.example/',
    'https://githubusercontent.com/u/1',
    'https://raw.githubusercontent.com/u/1',
    'javascript:alert(1)',
    'data:image/png;base64,AAAA',
    '//avatars.githubusercontent.com/u/1',
    '',
  ])('rejects %s', (u) => {
    expect(isGithubAvatarUrl(u)).toBe(false)
  })
  it('rejects non-strings and over-long values', () => {
    expect(isGithubAvatarUrl(null)).toBe(false)
    expect(isGithubAvatarUrl({})).toBe(false)
    expect(isGithubAvatarUrl('https://avatars.githubusercontent.com/' + 'a'.repeat(600))).toBe(false)
  })
  it('normalizeProfile and the form adapter drop any other avatar host', () => {
    expect(normalizeProfile({ avatar_url: 'https://evil.example/pixel.png' }).avatar_url).toBeUndefined()
    expect(normalizeProfile({ avatar_url: 'https://avatars.githubusercontent.com.evil.example/x' }).avatar_url).toBeUndefined()
    const ok = normalizeProfile({ avatar_url: 'https://avatars.githubusercontent.com/u/1?v=4' })
    expect(ok.avatar_url).toBe('https://avatars.githubusercontent.com/u/1?v=4')
  })
  it('applyDraftToForm ignores a non-GitHub avatar even if one reaches it', () => {
    const prev = { avatar_url: '' } as Parameters<typeof applyDraftToForm>[0]
    const next = applyDraftToForm(prev, { avatar_url: 'https://evil.example/pixel.png' } as Parameters<typeof applyDraftToForm>[1])
    expect(next.avatar_url).toBe('')
  })
})

describe('links are http(s) only', () => {
  it.each(['javascript:alert(1)', 'data:text/html,<script>', 'file:///etc/passwd', 'vbscript:x', 'ftp://x.example', 'https://u:p@x.example/', 'not a url', ''])(
    'httpUrl rejects %s',
    (u) => expect(httpUrl(u)).toBeNull(),
  )
  it('httpUrl keeps normal links', () => {
    expect(httpUrl('https://example.com/a?b=1')).toBe('https://example.com/a?b=1')
    expect(httpUrl('http://example.com')).toBe('http://example.com/')
  })
  it('normalizeProfile drops scheme-less junk and script URLs from every link field', () => {
    const p = normalizeProfile({ github_url: 'javascript:alert(1)', linkedin_url: 'data:text/html,x', avatar_url: 'ftp://x/y.png' })
    expect(p.github_url).toBeUndefined()
    expect(p.linkedin_url).toBeUndefined()
    expect(p.avatar_url).toBeUndefined()
  })
  it('LinkedIn must be a linkedin.com/in/ profile on the real host', () => {
    expect(isLinkedinProfileUrl('https://www.linkedin.com/in/ada-lovelace')).toBe(true)
    expect(isLinkedinProfileUrl('https://linkedin.com/in/ada')).toBe(true)
    expect(isLinkedinProfileUrl('https://evil.example/?u=linkedin.com/in/ada')).toBe(false)
    expect(isLinkedinProfileUrl('https://linkedin.com.evil.example/in/ada')).toBe(false)
    expect(isLinkedinProfileUrl('https://notlinkedin.com/in/ada')).toBe(false)
    expect(isLinkedinProfileUrl('https://www.linkedin.com/company/acme')).toBe(false)
    expect(isLinkedinProfileUrl('javascript:alert(1)//linkedin.com/in/x')).toBe(false)
  })
})

describe('GitHub login parsing (it is interpolated into API paths)', () => {
  it.each(['octocat', 'a', 'a-b', 'A1-b2', 'x'.repeat(39)])('accepts %s', (n) => expect(parseGithubUsername(n)).toBe(n))
  it.each([
    '', ' ', '-a', 'a-', 'a--b', 'a_b', 'a.b', 'a b', 'x'.repeat(40), '../etc', 'a/../b', 'a%2fb', 'a%2Fb', 'a?x=1', 'a#b', 'a\\b',
    'oct\ncat', 'oct\u0000cat', 'ünï', '<script>', 'a;b', 'a&b=c', 'https://github.com/', 'https://github.com/../x', 'https://evil.example/octocat',
    'https://github.com.evil.example/octocat',
  ])('rejects %j', (n) => expect(parseGithubUsername(n)).toBeNull())
  it('surrounding whitespace is trimmed, inner whitespace is not allowed', () => {
    expect(parseGithubUsername('  octocat\n')).toBe('octocat')
  })
  it('takes the first path segment of a profile URL only', () => {
    expect(parseGithubUsername('https://github.com/octocat/hello-world')).toBe('octocat')
    expect(parseGithubUsername('github.com/octocat?tab=repositories')).toBe('octocat')
  })
})

describe('exclude list validation', () => {
  it('keeps valid repo names and owner/name, drops everything else', () => {
    const raw = ['good-repo', 'owner/repo.js', 'my_repo', '../etc/passwd', 'a/b/c', 'bad name', '<x>', 'a;b', '', '.', '..', 'ok', 'ok'].join(',')
    expect(parseExcludeList(raw)).toEqual(['good-repo', 'owner/repo.js', 'my_repo', 'ok'])
  })
  it('splits on newlines too, de-duplicates, caps at 50', () => {
    expect(parseExcludeList('a\nb\r\nc')).toEqual(['a', 'b', 'c'])
    const many = Array.from({ length: 200 }, (_, i) => `r${i}`).join(',')
    expect(parseExcludeList(many)).toHaveLength(50)
  })
  it('ignores non-strings and oversized input entirely', () => {
    expect(parseExcludeList(undefined)).toEqual([])
    expect(parseExcludeList(['a'] as unknown as string)).toEqual([])
    expect(parseExcludeList('a,'.repeat(5000))).toEqual([])
  })
  it('isRepoRef rejects 101-char parts and traversal', () => {
    expect(isRepoRef('a'.repeat(100))).toBe(true)
    expect(isRepoRef('a'.repeat(101))).toBe(false)
    expect(isRepoRef('../x')).toBe(false)
  })
})

describe('project pre-selection', () => {
  it('never pre-selects more than the form and /api/generate can hold (4)', () => {
    expect(RANK.selectedCount).toBe(4)
    expect(RANK.selectedCount).toBeLessThanOrEqual(MAX_FORM_PROJECTS)
    expect(RANK.selectedCount).toBeLessThanOrEqual(LIMITS.projects)
  })
})

describe('import limits match /api/generate (the server clamps; the import must not promise more)', () => {
  const gen = fs.readFileSync(path.join(ROOT, 'app/api/generate/route.ts'), 'utf8')
  const cap = (re: RegExp) => Number(re.exec(gen)?.[1])
  it('bio, skills, projects, project description, bullets, certifications, education', () => {
    expect(LIMITS.bio).toBeLessThanOrEqual(cap(/bio: stripHtml\(body\.bio \|\| ''\)\.slice\(0, (\d+)\)/))
    expect(LIMITS.skills).toBeLessThanOrEqual(cap(/body\.skills \|\| \[\]\)\.slice\(0, (\d+)\)/))
    expect(LIMITS.projects).toBeLessThanOrEqual(cap(/body\.projects \|\| \[\]\)\.slice\(0, (\d+)\)/))
    expect(LIMITS.projectDescription).toBeLessThanOrEqual(cap(/description: stripHtml\(p\.description \|\| ''\)\.slice\(0, (\d+)\)/))
    expect(LIMITS.certifications).toBeLessThanOrEqual(cap(/body\.certifications \|\| \[\]\)\.slice\(0, (\d+)\)/))
    expect(LIMITS.education).toBeLessThanOrEqual(cap(/body\.education \|\| \[\]\)\.slice\(0, (\d+)\)/))
    expect(LIMITS.bulletsPerRole).toBeLessThanOrEqual(cap(/e\.bullets \|\| \[\]\)\.slice\(0, (\d+)\)/))
    expect(LIMITS.bullet).toBeLessThanOrEqual(cap(/stripBulletMarker\(stripHtml\(b\)\)\.slice\(0, (\d+)\)/))
  })
})

describe('feature flags ship disabled', () => {
  it('both flags are false in .env.local.example and nothing committed turns them on', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.local.example'), 'utf8')
    expect(ex).toMatch(/^IMPORT_ENABLED=false\s*$/m)
    expect(ex).toMatch(/^NEXT_PUBLIC_IMPORT_ENABLED=false\s*$/m)
    for (const f of ['vercel.json', 'next.config.ts', 'ecosystem.config.js']) {
      const p = path.join(ROOT, f)
      if (fs.existsSync(p)) expect(fs.readFileSync(p, 'utf8')).not.toMatch(/IMPORT_ENABLED['"]?\s*[:=]\s*['"]?true/)
    }
  })
  it('the API route and the UI both require the flag to equal exactly "true"', () => {
    const route = fs.readFileSync(path.join(ROOT, 'app/api/import/route.ts'), 'utf8')
    const page = fs.readFileSync(path.join(ROOT, 'app/create/page.tsx'), 'utf8')
    expect(route).toMatch(/process\.env\.IMPORT_ENABLED !== 'true'/)
    expect(page).toMatch(/process\.env\.NEXT_PUBLIC_IMPORT_ENABLED === 'true'/)
  })
})
