import { describe, expect, it } from 'vitest'
import sharp from 'sharp'
import { ImageError, checkImageUrl, fetchPublicImage, hashToken, isPrivateAddress, newUploadToken, normalizeImage, sniffType, targetFromString, targetToString } from '@/lib/mcp/images'

describe('address policy (SSRF)', () => {
  it.each(['127.0.0.1', '10.1.2.3', '172.16.0.1', '172.31.255.255', '192.168.1.1', '169.254.169.254', '0.0.0.0', '100.64.0.1', '224.0.0.1', '::1', '::', 'fe80::1', 'fc00::1', 'fd12::1', '::ffff:127.0.0.1', '::ffff:7f00:1', '::ffff:a9fe:a9fe', 'not-an-ip'])('blocks %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true)
  })
  it.each(['8.8.8.8', '1.1.1.1', '172.15.0.1', '172.32.0.1', '2606:4700:4700::1111'])('allows %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false)
  })
})

describe('url policy', () => {
  it.each(['http://example.com/a.jpg', 'ftp://example.com/a.jpg', 'https://user:pw@example.com/a.jpg', 'https://example.com:8443/a.jpg', 'https://localhost/a.jpg', 'https://app.internal/a.jpg', 'file:///etc/passwd', 'javascript:alert(1)', 'nonsense'])('refuses %s', (u) => {
    expect(() => checkImageUrl(u)).toThrow(ImageError)
  })
  it('accepts a plain https url', () => expect(checkImageUrl('https://example.com/a.jpg').hostname).toBe('example.com'))
  it('refuses a host that resolves to a private address, including a literal IP', async () => {
    await expect(fetchPublicImage('https://evil.example/a.jpg', async () => [{ address: '169.254.169.254', family: 4 }])).rejects.toMatchObject({ code: 'blocked_address' })
    await expect(fetchPublicImage('https://evil.example/a.jpg', async () => [{ address: '8.8.8.8', family: 4 }, { address: '10.0.0.1', family: 4 }])).rejects.toMatchObject({ code: 'blocked_address' })
    await expect(fetchPublicImage('https://127.0.0.1/a.jpg')).rejects.toMatchObject({ code: 'blocked_address' })
  })
})

describe('re-encoding', () => {
  const png = () => sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#336699' } }).png().toBuffer()
  it('sniffs real types and rejects everything else (SVG, HTML, text)', async () => {
    expect(sniffType(await png())).toBe('png')
    expect(sniffType(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull()
    expect(sniffType(Buffer.from('<html>hello world, this is not an image</html>'))).toBeNull()
    await expect(normalizeImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"></svg>'))).rejects.toMatchObject({ code: 'bad_image' })
  })
  it('outputs a capped JPEG with no metadata', async () => {
    const withExif = await sharp(await png()).withMetadata({ exif: { IFD0: { Copyright: 'secret' } } }).jpeg().toBuffer()
    const out = await normalizeImage(withExif)
    const meta = await sharp(out).metadata()
    expect(meta.format).toBe('jpeg')
    expect(Math.max(meta.width!, meta.height!)).toBeLessThanOrEqual(1600)
    expect(meta.exif).toBeUndefined()
  })
  it('rejects a corrupt picture', async () => {
    await expect(normalizeImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(64, 1)]))).rejects.toMatchObject({ code: 'bad_image' })
  })
})

describe('upload tokens', () => {
  it('are unpredictable, hashed at rest and target-bound', () => {
    const a = newUploadToken(), b = newUploadToken()
    expect(a).not.toBe(b)
    expect(a.length).toBeGreaterThanOrEqual(40)
    expect(hashToken(a)).not.toContain(a)
    expect(targetFromString(targetToString({ kind: 'project', index: 3 }))).toEqual({ kind: 'project', index: 3 })
    expect(targetFromString('profile')).toEqual({ kind: 'profile' })
    expect(targetFromString('project:../1')).toBeNull()
  })
})
