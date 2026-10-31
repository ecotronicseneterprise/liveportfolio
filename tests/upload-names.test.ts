// Uploaded pictures: a replaced photo must show at once, and one project's picture must never overwrite another's.
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'

const read = (p: string) => fs.readFileSync(path.resolve(__dirname, p), 'utf8').split('\r\n').join('\n')

describe('upload routes', () => {
  it('a new profile photo gets a new address (a version in the address), so it is not served from a cache', () => {
    const src = read('../app/api/upload-avatar/route.ts')
    expect(src).toContain('?v=${Date.now()}')
    expect(src).toContain('const path = `${user.id}.jpg`') // still one file per person, so removing the account removes it
  })
  it('every project image gets its own file name, never overwritten, and still starts with the user id for account removal', () => {
    const src = read('../app/api/upload-project-image/route.ts')
    expect(src).toMatch(/const path = `\$\{user\.id\}-\$\{idx\}-\$\{Date\.now\(\)\.toString\(36\)\}/)
    expect(src).toContain('upsert: false')
    expect(src).not.toContain('upsert: true')
    expect(read('../app/api/delete-account/route.ts')).toContain(".list('', { search: user.id })")
  })
  it('the cropper saves sharper pictures than before and keeps them under the server limits', () => {
    const src = read('../components/ImageCropper.tsx')
    expect(src).toContain('width: 800')
    expect(src).toContain('width: 1600')
    expect(src).toContain('encodeUnderLimit')
    expect(src).toContain("imageSmoothingQuality = 'high'")
    expect(src).toContain('Math.floor(2.8 * 1024 * 1024)') // under the avatar route's 3 MB
    expect(src).toContain('Math.floor(4.5 * 1024 * 1024)') // under the project route's 5 MB
  })
})
