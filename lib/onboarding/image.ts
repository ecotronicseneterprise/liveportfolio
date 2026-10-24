// Project images in the review step: validate what was picked, then shrink it in the browser to a JPEG before upload
// (phone photos are 3 to 8 MB; the route accepts at most 5 MB and the page shows them at 640 px wide anyway).

export const MAX_IMAGE_INPUT = 10 * 1024 * 1024
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

export type ImageCheck = 'ok' | 'type' | 'size'

export function checkImageFile(f: { type: string; size: number }): ImageCheck {
  if (!(IMAGE_TYPES as readonly string[]).includes(f.type)) return 'type'
  if (f.size > MAX_IMAGE_INPUT) return 'size'
  return 'ok'
}

/** Scale down to `maxWidth` (never up), flatten transparency to white, encode as JPEG. Browser only. */
export async function toJpeg(file: File, maxWidth = 1280, quality = 0.85): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxWidth / bitmap.width)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(bitmap.width * scale))
  canvas.height = Math.max(1, Math.round(bitmap.height * scale))
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('canvas unavailable')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close?.()
  const blob = await new Promise<Blob | null>((res) => canvas.toBlob(res, 'image/jpeg', quality))
  if (!blob) throw new Error('encode failed')
  return blob
}
