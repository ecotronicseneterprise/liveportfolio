// Crop maths for the photo and project-image cropper. Pure functions, so the preview on screen and the pixels that get saved
// are computed from the same numbers (what you see is what you get) and can be tested without a browser.
//
// Model: a frame of cW x cH screen pixels shows an image of nW x nH pixels. The image is drawn at scale s = base * zoom, where
// base is "cover" (fill the frame; fill mode) or "contain" (the whole image visible; fit mode). `offset` is how far the image
// centre sits from the frame centre, in screen pixels.

export type CropMode = 'fill' | 'fit'

export interface Size { w: number; h: number }
export interface Point { x: number; y: number }

export const MIN_ZOOM = 1
export const MAX_ZOOM = 4

export const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v))

/** The scale at zoom 1: fill covers the frame, fit shows the whole image. */
export function baseScale(frame: Size, image: Size, mode: CropMode): number {
  const sx = frame.w / image.w
  const sy = frame.h / image.h
  return mode === 'fill' ? Math.max(sx, sy) : Math.min(sx, sy)
}

/** The drawn size of the whole image. */
export function displaySize(frame: Size, image: Size, zoom: number, mode: CropMode): Size {
  const s = baseScale(frame, image, mode) * zoom
  return { w: image.w * s, h: image.h * s }
}

/** Keep the image where it can be seen: it may not leave a gap inside the frame, and an image smaller than the frame stays centred. */
export function clampOffset(offset: Point, frame: Size, image: Size, zoom: number, mode: CropMode): Point {
  const d = displaySize(frame, image, zoom, mode)
  const maxX = Math.max(0, (d.w - frame.w) / 2)
  const maxY = Math.max(0, (d.h - frame.h) / 2)
  return { x: clamp(offset.x, -maxX, maxX) + 0, y: clamp(offset.y, -maxY, maxY) + 0 } // + 0 turns -0 into 0
}

/**
 * Change the zoom without losing your place: the point of the image under the middle of the frame stays under the middle.
 * (The offset scales with the zoom.) The result is clamped for the new zoom.
 */
export function zoomTo(next: number, offset: Point, zoom: number, frame: Size, image: Size, mode: CropMode): { zoom: number; offset: Point } {
  const z = clamp(next, MIN_ZOOM, MAX_ZOOM)
  const k = zoom > 0 ? z / zoom : 1
  return { zoom: z, offset: clampOffset({ x: offset.x * k, y: offset.y * k }, frame, image, z, mode) }
}

/** Zoom around a point of the frame (pinch centre or mouse position), so that point of the image stays under the finger. */
export function zoomAt(next: number, at: Point, offset: Point, zoom: number, frame: Size, image: Size, mode: CropMode): { zoom: number; offset: Point } {
  const z = clamp(next, MIN_ZOOM, MAX_ZOOM)
  const k = zoom > 0 ? z / zoom : 1
  // `at` is measured from the frame centre; the image point under it moves by (1 - k) * (at - offset)
  const x = at.x - (at.x - offset.x) * k
  const y = at.y - (at.y - offset.y) * k
  return { zoom: z, offset: clampOffset({ x, y }, frame, image, z, mode) }
}

export interface CropRects {
  /** The part of the source image to read (source pixels). */
  sx: number; sy: number; sw: number; sh: number
  /** Where it lands in the output, as fractions of the output (0..1). Less than the whole output when the image is smaller than the frame. */
  dx: number; dy: number; dw: number; dh: number
}

/** What to read from the image and where to put it, for the current frame, zoom and offset. */
export function cropRects(frame: Size, image: Size, zoom: number, offset: Point, mode: CropMode): CropRects {
  const s = baseScale(frame, image, mode) * zoom
  // the image's top-left corner in frame coordinates
  const left = frame.w / 2 + offset.x - (image.w * s) / 2
  const top = frame.h / 2 + offset.y - (image.h * s) / 2
  // the frame mapped back into source pixels
  const fx0 = -left / s
  const fy0 = -top / s
  const fw = frame.w / s
  const fh = frame.h / s
  const sx = clamp(fx0, 0, image.w)
  const sy = clamp(fy0, 0, image.h)
  const ex = clamp(fx0 + fw, 0, image.w)
  const ey = clamp(fy0 + fh, 0, image.h)
  return {
    sx, sy, sw: Math.max(0, ex - sx), sh: Math.max(0, ey - sy),
    dx: (sx - fx0) / fw, dy: (sy - fy0) / fh,
    dw: Math.max(0, ex - sx) / fw, dh: Math.max(0, ey - sy) / fh,
  }
}

/** The saved picture's size: the target for the shape, but never more pixels than the visible part of the photo really has. */
export function outputSize(aspect: number, targetW: number, visibleSourceW: number, minW = 320): Size {
  const w = Math.round(clamp(visibleSourceW, minW, targetW))
  return { w, h: Math.round(w / aspect) }
}

/** The largest side a photo is kept at while cropping: a 48-megapixel phone photo is shrunk first so a small phone does not run out of memory. */
export const MAX_WORKING_SIDE = 3200

export function workingSize(natural: Size, max = MAX_WORKING_SIDE): Size {
  const longest = Math.max(natural.w, natural.h)
  if (longest <= max) return natural
  const k = max / longest
  return { w: Math.round(natural.w * k), h: Math.round(natural.h * k) }
}

/** JPEG qualities to try, best first, until the file is under the limit. */
export const QUALITY_STEPS = [0.9, 0.82, 0.74, 0.66, 0.58, 0.5]

/** Where each design trims a project image: the part of the height that stays visible when a 16:9 image is shown at the design's ratio. */
export const PROJECT_SAFE_FRACTION = 6 / 9 // 16:6 shown from a 16:9 picture keeps two thirds of its height

/** The average colour round the edge of a small sample, used as the plain background when a whole image is fitted into the frame. */
export function edgeColor(pixels: Uint8ClampedArray, w: number, h: number): string {
  let r = 0, g = 0, b = 0, n = 0
  const add = (x: number, y: number) => { const i = (y * w + x) * 4; r += pixels[i]; g += pixels[i + 1]; b += pixels[i + 2]; n++ }
  for (let x = 0; x < w; x++) { add(x, 0); add(x, h - 1) }
  for (let y = 1; y < h - 1; y++) { add(0, y); add(w - 1, y) }
  if (!n) return '#f3f4f6'
  const hex = (v: number) => Math.round(v / n).toString(16).padStart(2, '0')
  return `#${hex(r)}${hex(g)}${hex(b)}`
}
