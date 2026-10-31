'use client'

// Crop dialog for profile photos (square) and project images (16:9). The on-screen view and the saved picture are computed from the same
// numbers (lib/image/crop.ts). Drag to move, pinch / wheel / slider / + - to zoom (zoom keeps your place), arrow keys to nudge.
// Guides (not saved) show what some designs trim; a project image can also be fitted whole onto a plain background.
import { useCallback, useEffect, useRef, useState } from 'react'
import {
  MAX_ZOOM, MIN_ZOOM, QUALITY_STEPS, clampOffset, cropRects, displaySize, edgeColor, outputSize, workingSize, zoomAt, zoomTo,
  type CropMode, type Point, type Size,
} from '@/lib/image/crop'

interface ImageCropperProps {
  src: string
  aspectRatio: number // 1 = square (profile photo), 16/9 = project image
  onCrop: (blob: Blob) => void
  onCancel: () => void
}

const AVATAR = { width: 800, maxBytes: Math.floor(2.8 * 1024 * 1024) } // the avatar route accepts up to 3 MB
const PROJECT = { width: 1600, maxBytes: Math.floor(4.5 * 1024 * 1024) } // the project-image route accepts up to 5 MB

function toBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, 'image/jpeg', quality))
}

/** The best JPEG that fits under the limit: tries a lower quality until it does. */
async function encodeUnderLimit(canvas: HTMLCanvasElement, maxBytes: number): Promise<Blob | null> {
  let last: Blob | null = null
  for (const q of QUALITY_STEPS) {
    last = await toBlob(canvas, q)
    if (last && last.size <= maxBytes) return last
  }
  return null
}

export default function ImageCropper({ src, aspectRatio, onCrop, onCancel }: ImageCropperProps) {
  const isSquare = aspectRatio === 1
  const target = isSquare ? AVATAR : PROJECT

  const imgRef = useRef<HTMLImageElement>(null)
  const sourceRef = useRef<CanvasImageSource | null>(null) // what is drawn when saving: the image, or a shrunk copy of a huge one
  const wrapRef = useRef<HTMLDivElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const pointers = useRef(new Map<number, Point>())
  const pinch = useRef<{ dist: number; zoom: number } | null>(null)

  const [image, setImage] = useState<Size>({ w: 0, h: 0 }) // the working size (shrunk if the photo is huge)
  const [frame, setFrame] = useState<Size>({ w: 340, h: isSquare ? 340 : 191 })
  const [view, setView] = useState<{ zoom: number; offset: Point }>({ zoom: 1, offset: { x: 0, y: 0 } })
  const [mode, setMode] = useState<CropMode>('fill')
  const [background, setBackground] = useState('#f3f4f6')
  const [guides, setGuides] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const ready = image.w > 0

  // the frame fills the dialog (up to 420px wide) and keeps the shape of the picture
  useEffect(() => {
    const measure = () => {
      const w = Math.min(wrapRef.current?.clientWidth ?? 340, 420)
      setFrame({ w, h: isSquare ? w : Math.round((w * 9) / 16) })
    }
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [isSquare])

  // a different frame size (rotation, resize) must not leave a gap
  useEffect(() => {
    if (!ready) return
    setView((v) => ({ zoom: v.zoom, offset: clampOffset(v.offset, frame, image, v.zoom, mode) }))
  }, [frame, image, mode, ready])

  const onLoad = () => {
    const el = imgRef.current
    if (!el) return
    const natural = { w: el.naturalWidth, h: el.naturalHeight }
    if (!natural.w || !natural.h) return
    const work = workingSize(natural)
    try {
      if (work.w !== natural.w) {
        // a very large photo: shrink once so a small phone does not run out of memory while cropping and saving
        const c = document.createElement('canvas')
        c.width = work.w; c.height = work.h
        const ctx = c.getContext('2d')
        if (ctx) { ctx.imageSmoothingQuality = 'high'; ctx.drawImage(el, 0, 0, work.w, work.h); sourceRef.current = c }
      } else sourceRef.current = el
      // the plain colour used behind a whole image in "fit" mode: taken from the picture's own edge
      const s = document.createElement('canvas')
      s.width = 24; s.height = 24
      const sctx = s.getContext('2d')
      if (sctx) { sctx.drawImage(el, 0, 0, 24, 24); setBackground(edgeColor(sctx.getImageData(0, 0, 24, 24).data, 24, 24)) }
    } catch { /* the sample is optional */ }
    if (!sourceRef.current) sourceRef.current = el
    setImage(work)
  }

  // ── gestures ───────────────────────────────────────────────────────────────────────────────────────────────
  const centreOf = (p: Point): Point => {
    const r = frameRef.current?.getBoundingClientRect()
    return r ? { x: p.x - r.left - r.width / 2, y: p.y - r.top - r.height / 2 } : { x: 0, y: 0 }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()]
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: view.zoom }
    }
  }
  const onPointerMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId)
    if (!prev || !ready) return
    const now = { x: e.clientX, y: e.clientY }
    pointers.current.set(e.pointerId, now)
    if (pointers.current.size === 1) {
      const dx = now.x - prev.x
      const dy = now.y - prev.y
      setView((v) => ({ zoom: v.zoom, offset: clampOffset({ x: v.offset.x + dx, y: v.offset.y + dy }, frame, image, v.zoom, mode) }))
    } else if (pointers.current.size === 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y) || 1
      const at = centreOf({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
      const next = pinch.current.zoom * (dist / pinch.current.dist)
      setView((v) => zoomAt(next, at, v.offset, v.zoom, frame, image, mode))
    }
  }
  const onPointerEnd = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinch.current = null
  }

  // mouse wheel / trackpad: zoom around the pointer (needs a non-passive listener to stop the page scrolling)
  useEffect(() => {
    const el = frameRef.current
    if (!el) return
    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const factor = Math.exp(-e.deltaY * 0.0015)
      const at = centreOf({ x: e.clientX, y: e.clientY })
      setView((v) => zoomAt(v.zoom * factor, at, v.offset, v.zoom, frame, image, mode))
    }
    el.addEventListener('wheel', onWheel, { passive: false })
    return () => el.removeEventListener('wheel', onWheel)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [frame, image, mode])

  const onKeyDown = (e: React.KeyboardEvent) => {
    const step = e.shiftKey ? 40 : 10
    const move = (dx: number, dy: number) => { e.preventDefault(); setView((v) => ({ zoom: v.zoom, offset: clampOffset({ x: v.offset.x + dx, y: v.offset.y + dy }, frame, image, v.zoom, mode) })) }
    if (e.key === 'ArrowLeft') move(-step, 0)
    else if (e.key === 'ArrowRight') move(step, 0)
    else if (e.key === 'ArrowUp') move(0, -step)
    else if (e.key === 'ArrowDown') move(0, step)
    else if (e.key === '+' || e.key === '=') { e.preventDefault(); setView((v) => zoomTo(v.zoom * 1.12, v.offset, v.zoom, frame, image, mode)) }
    else if (e.key === '-' || e.key === '_') { e.preventDefault(); setView((v) => zoomTo(v.zoom / 1.12, v.offset, v.zoom, frame, image, mode)) }
    else if (e.key === '0') { e.preventDefault(); setView({ zoom: 1, offset: { x: 0, y: 0 } }) }
  }

  useEffect(() => {
    const esc = (e: KeyboardEvent) => { if (e.key === 'Escape') onCancel() }
    document.addEventListener('keydown', esc)
    return () => document.removeEventListener('keydown', esc)
  }, [onCancel])

  const changeMode = (m: CropMode) => { setMode(m); setView({ zoom: 1, offset: { x: 0, y: 0 } }) }

  // ── saving ─────────────────────────────────────────────────────────────────────────────────────────────────
  const handleCrop = useCallback(async () => {
    const source = sourceRef.current
    if (!source || !ready || busy) return
    setBusy(true); setError(null)
    try {
      const rects = cropRects(frame, image, view.zoom, view.offset, mode)
      const frameInSource = frame.w / ((displaySize(frame, image, view.zoom, mode).w) / image.w) // source pixels across the frame
      const out = outputSize(aspectRatio, target.width, frameInSource)
      const canvas = document.createElement('canvas')
      canvas.width = out.w; canvas.height = out.h
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('canvas')
      ctx.fillStyle = mode === 'fit' ? background : '#ffffff'
      ctx.fillRect(0, 0, out.w, out.h)
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      if (rects.sw > 0 && rects.sh > 0) ctx.drawImage(source, rects.sx, rects.sy, rects.sw, rects.sh, rects.dx * out.w, rects.dy * out.h, rects.dw * out.w, rects.dh * out.h)
      const blob = await encodeUnderLimit(canvas, target.maxBytes)
      if (!blob) throw new Error('encode')
      onCrop(blob)
    } catch {
      setError('Could not process this image. Please try a different photo or format.')
      setBusy(false)
    }
  }, [ready, busy, frame, image, view, mode, aspectRatio, target, background, onCrop])

  // ── drawing ────────────────────────────────────────────────────────────────────────────────────────────────
  const d = ready ? displaySize(frame, image, view.zoom, mode) : { w: frame.w, h: frame.h }
  const imgStyle: React.CSSProperties = {
    position: 'absolute', left: 0, top: 0, maxWidth: 'none',
    width: d.w, height: d.h,
    transform: `translate(${frame.w / 2 + view.offset.x - d.w / 2}px, ${frame.h / 2 + view.offset.y - d.h / 2}px)`,
    userSelect: 'none', pointerEvents: 'none', visibility: ready ? 'visible' : 'hidden',
  }

  const hint = isSquare
    ? 'Drag to move. Pinch, scroll or use the slider to zoom. Some designs show a circle and others a square, so keep your face inside the circle.'
    : 'Drag to move. Pinch, scroll or use the slider to zoom. The striped bands are trimmed by some designs, so keep the important part clear of them.'

  return (
    <div role="dialog" aria-modal="true" aria-label={isSquare ? 'Crop photo' : 'Crop image'}
      style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: 24, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', gap: 16, margin: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>{isSquare ? 'Crop photo' : 'Crop image'}</p>
          <button type="button" onClick={onCancel} aria-label="Cancel" style={{ background: 'none', border: 'none', fontSize: 24, cursor: 'pointer', color: '#6b7280', lineHeight: 1, minWidth: 44, minHeight: 44 }}>×</button>
        </div>

        <div ref={wrapRef} style={{ display: 'flex', justifyContent: 'center' }}>
          <div
            ref={frameRef}
            tabIndex={0}
            role="application"
            aria-label="Crop area. Arrow keys move the picture, plus and minus zoom, zero resets."
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerEnd}
            onPointerCancel={onPointerEnd}
            onKeyDown={onKeyDown}
            style={{ width: frame.w, height: frame.h, overflow: 'hidden', position: 'relative', background: mode === 'fit' ? background : '#111', borderRadius: 8, flexShrink: 0, touchAction: 'none', cursor: 'grab', outlineOffset: 2 }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img ref={imgRef} src={src} alt="" onLoad={onLoad} style={imgStyle} draggable={false} />
            {guides && ready && isSquare && (
              <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none', background: 'radial-gradient(circle closest-side, transparent 98%, rgba(0,0,0,0.5) 99%)', boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)' }} />
            )}
            {guides && ready && !isSquare && (
              <>
                {[0, 1].map((i) => (
                  <div key={i} aria-hidden="true" style={{ position: 'absolute', left: 0, right: 0, height: '16.67%', [i ? 'bottom' : 'top']: 0, pointerEvents: 'none', background: 'repeating-linear-gradient(135deg, rgba(0,0,0,0.38) 0 6px, rgba(0,0,0,0.18) 6px 12px)', borderTop: i ? '1px dashed rgba(255,255,255,0.7)' : undefined, borderBottom: i ? undefined : '1px dashed rgba(255,255,255,0.7)' }} />
                ))}
              </>
            )}
          </div>
        </div>

        <p style={{ fontSize: 12, color: '#4b5563', textAlign: 'center', margin: 0 }}>{hint}</p>

        {!isSquare && (
          <div role="group" aria-label="How the image fits" style={{ display: 'flex', gap: 8 }}>
            {([['fill', 'Fill the frame'], ['fit', 'Fit the whole image']] as const).map(([m, label]) => (
              <button key={m} type="button" aria-pressed={mode === m} onClick={() => changeMode(m)}
                style={{ flex: 1, minHeight: 44, borderRadius: 10, border: `1.5px solid ${mode === m ? '#0A66C2' : '#e5e7eb'}`, background: mode === m ? '#E8F0F9' : '#fff', color: mode === m ? '#084D9A' : '#374151', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <label htmlFor="crop-zoom" style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#4b5563' }}>
            <span>Zoom</span><span>{view.zoom.toFixed(1)}×</span>
          </label>
          <input id="crop-zoom" type="range" min={MIN_ZOOM} max={MAX_ZOOM} step={0.02} value={view.zoom}
            onChange={(e) => setView((v) => zoomTo(Number(e.target.value), v.offset, v.zoom, frame, image, mode))}
            style={{ width: '100%', accentColor: '#0A66C2', minHeight: 32 }} />
        </div>

        <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#4b5563', minHeight: 32 }}>
          <input type="checkbox" checked={guides} onChange={(e) => setGuides(e.target.checked)} />
          Show guides (they are not saved)
        </label>

        {error && <p role="alert" style={{ fontSize: 12, color: '#b91c1c', textAlign: 'center', margin: 0 }}>{error}</p>}

        <div style={{ display: 'flex', gap: 10 }}>
          <button type="button" onClick={onCancel} style={{ flex: 1, minHeight: 44, borderRadius: 10, border: '1.5px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Cancel</button>
          <button type="button" onClick={() => void handleCrop()} disabled={!ready || busy}
            style={{ flex: 2, minHeight: 44, borderRadius: 10, border: 'none', background: '#0A66C2', fontSize: 14, fontWeight: 600, color: '#fff', cursor: !ready || busy ? 'not-allowed' : 'pointer', opacity: !ready || busy ? 0.6 : 1 }}>
            {busy ? 'Saving…' : isSquare ? 'Use this photo →' : 'Use this image →'}
          </button>
        </div>
      </div>
    </div>
  )
}
