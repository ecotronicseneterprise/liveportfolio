// The crop maths behind the photo and project-image cropper.
import { describe, expect, it } from 'vitest'
import {
  MAX_ZOOM, MIN_ZOOM, baseScale, clampOffset, cropRects, displaySize, edgeColor, outputSize, workingSize, zoomAt, zoomTo,
} from '../lib/image/crop'

const close = (a: number, b: number, d = 1e-6) => expect(Math.abs(a - b)).toBeLessThan(d)

describe('fill mode (the picture covers the frame)', () => {
  const frame = { w: 100, h: 100 }
  const wide = { w: 200, h: 100 }
  it('covers the frame and can pan along the long side only', () => {
    expect(baseScale(frame, wide, 'fill')).toBe(1)
    expect(clampOffset({ x: 999, y: 999 }, frame, wide, 1, 'fill')).toEqual({ x: 50, y: 0 })
    expect(clampOffset({ x: -999, y: -999 }, frame, wide, 1, 'fill')).toEqual({ x: -50, y: 0 })
  })
  it('reads the middle of the photo when centred, the right edge when panned right', () => {
    expect(cropRects(frame, wide, 1, { x: 0, y: 0 }, 'fill')).toEqual({ sx: 50, sy: 0, sw: 100, sh: 100, dx: 0, dy: 0, dw: 1, dh: 1 })
    const r = cropRects(frame, wide, 1, { x: -50, y: 0 }, 'fill')
    expect(r.sx).toBe(100)
    expect(r.sw).toBe(100)
  })
  it('zooming in reads a smaller part of the photo, centred', () => {
    const r = cropRects(frame, wide, 2, { x: 0, y: 0 }, 'fill')
    expect(r).toMatchObject({ sx: 75, sy: 25, sw: 50, sh: 50, dx: 0, dy: 0, dw: 1, dh: 1 })
  })
  it('never reads outside the photo, whatever the offset, and always fills the whole output', () => {
    for (const zoom of [1, 1.7, 3, MAX_ZOOM]) for (const x of [-500, -20, 0, 33, 500]) for (const y of [-500, 0, 500]) {
      const off = clampOffset({ x, y }, frame, wide, zoom, 'fill')
      const r = cropRects(frame, wide, zoom, off, 'fill')
      expect(r.sx).toBeGreaterThanOrEqual(0); expect(r.sy).toBeGreaterThanOrEqual(0)
      expect(r.sx + r.sw).toBeLessThanOrEqual(wide.w + 1e-9); expect(r.sy + r.sh).toBeLessThanOrEqual(wide.h + 1e-9)
      close(r.dw, 1); close(r.dh, 1); close(r.dx, 0); close(r.dy, 0)
    }
  })
})

describe('zoom keeps your place (the bug: zoom used to snap the photo back to the centre)', () => {
  const frame = { w: 300, h: 300 }
  const photo = { w: 1200, h: 900 }
  it('zooming around the middle keeps the same point of the photo in the middle', () => {
    const a = zoomTo(1, { x: 0, y: 0 }, 1, frame, photo, 'fill')
    const start = zoomTo(2, a.offset, a.zoom, frame, photo, 'fill') // zoom in, then move
    const moved = { zoom: start.zoom, offset: clampOffset({ x: -60, y: 25 }, frame, photo, start.zoom, 'fill') }
    const sOld = baseScale(frame, photo, 'fill') * moved.zoom
    const centreBefore = { x: (0 - moved.offset.x) / sOld, y: (0 - moved.offset.y) / sOld } // image point (from its centre) under the frame centre
    const next = zoomTo(3, moved.offset, moved.zoom, frame, photo, 'fill')
    const sNew = baseScale(frame, photo, 'fill') * next.zoom
    close((0 - next.offset.x) / sNew, centreBefore.x, 1e-6)
    close((0 - next.offset.y) / sNew, centreBefore.y, 1e-6)
    expect(next.offset).not.toEqual({ x: 0, y: 0 }) // it did NOT reset
  })
  it('zooming around a finger or the mouse keeps that point of the photo under it', () => {
    const at = { x: 70, y: -40 }
    const o = clampOffset({ x: -50, y: 20 }, frame, photo, 1.5, 'fill')
    const s0 = baseScale(frame, photo, 'fill') * 1.5
    const before = { x: (at.x - o.x) / s0, y: (at.y - o.y) / s0 }
    const z = zoomAt(2.4, at, o, 1.5, frame, photo, 'fill')
    const s1 = baseScale(frame, photo, 'fill') * z.zoom
    // clamping can move it at the edges, so use a case well inside the photo
    close((at.x - z.offset.x) / s1, before.x, 1e-6)
    close((at.y - z.offset.y) / s1, before.y, 1e-6)
  })
  it('stays within the zoom range', () => {
    expect(zoomTo(99, { x: 0, y: 0 }, 1, frame, photo, 'fill').zoom).toBe(MAX_ZOOM)
    expect(zoomTo(0.1, { x: 0, y: 0 }, 2, frame, photo, 'fill').zoom).toBe(MIN_ZOOM)
  })
  it('zooming out re-clamps the position so no gap appears', () => {
    const big = clampOffset({ x: 9999, y: 9999 }, frame, photo, 3, 'fill')
    const out = zoomTo(1, big, 3, frame, photo, 'fill')
    expect(out.offset).toEqual(clampOffset(out.offset, frame, photo, 1, 'fill'))
  })
})

describe('fit mode (the whole image, with a plain background)', () => {
  const frame = { w: 160, h: 90 }
  const square = { w: 100, h: 100 }
  it('shows the whole image, centred, and reports where it lands', () => {
    close(baseScale(frame, square, 'fit'), 0.9)
    expect(displaySize(frame, square, 1, 'fit')).toEqual({ w: 90, h: 90 })
    expect(clampOffset({ x: 40, y: 40 }, frame, square, 1, 'fit')).toEqual({ x: 0, y: 0 }) // smaller than the frame: stays centred
    const r = cropRects(frame, square, 1, { x: 0, y: 0 }, 'fit')
    expect(r).toMatchObject({ sx: 0, sy: 0, sw: 100, sh: 100 })
    close(r.dx, 35 / 160); close(r.dw, 90 / 160); close(r.dy, 0); close(r.dh, 1)
  })
  it('zooming in from fit eventually fills the frame', () => {
    const r = cropRects(frame, square, 2, { x: 0, y: 0 }, 'fit')
    close(r.dw, 1); close(r.dh, 1)
  })
})

describe('sizes', () => {
  it('output never has more pixels than the visible photo really has, and is bounded', () => {
    expect(outputSize(1, 800, 500)).toEqual({ w: 500, h: 500 })
    expect(outputSize(1, 800, 5000)).toEqual({ w: 800, h: 800 })
    expect(outputSize(1, 800, 100)).toEqual({ w: 320, h: 320 })
    expect(outputSize(16 / 9, 1600, 4000)).toEqual({ w: 1600, h: 900 })
  })
  it('a huge phone photo is shrunk first, a normal one is left alone', () => {
    expect(workingSize({ w: 8000, h: 6000 })).toEqual({ w: 3200, h: 2400 })
    expect(workingSize({ w: 3000, h: 2000 })).toEqual({ w: 3000, h: 2000 })
  })
  it('the background for a fitted image is the colour round its edge', () => {
    const px = new Uint8ClampedArray(4 * 4 * 4)
    for (let i = 0; i < 16; i++) { px[i * 4] = 255; px[i * 4 + 1] = 0; px[i * 4 + 2] = 128; px[i * 4 + 3] = 255 }
    expect(edgeColor(px, 4, 4)).toBe('#ff0080')
  })
})
