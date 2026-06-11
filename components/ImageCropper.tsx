'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface ImageCropperProps {
  src: string
  aspectRatio: number   // 1 = square (avatar), 16/9 = project
  onCrop: (blob: Blob) => void
  onCancel: () => void
}

function getOutput(aspectRatio: number) {
  if (aspectRatio === 1) return { w: 400, h: 400 }
  return { w: 800, h: 450 }
}

export default function ImageCropper({ src, aspectRatio, onCrop, onCancel }: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [zoom, setZoom] = useState(1)
  const [offset, setOffset] = useState({ x: 0, y: 0 })
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [containerSize, setContainerSize] = useState({ w: 340, h: 340 })
  const [cropError, setCropError] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Pan state
  const dragging = useRef(false)
  const lastPointer = useRef({ x: 0, y: 0 })

  // Pinch state
  const lastPinchDist = useRef<number | null>(null)

  useEffect(() => {
    const updateContainer = () => {
      if (!containerRef.current) return
      const w = Math.min(containerRef.current.offsetWidth, 400)
      const h = aspectRatio === 1 ? w : Math.round(w * (9 / 16))
      setContainerSize({ w, h })
    }
    updateContainer()
    window.addEventListener('resize', updateContainer)
    return () => window.removeEventListener('resize', updateContainer)
  }, [aspectRatio])

  // Reset pan when zoom changes
  useEffect(() => {
    setOffset({ x: 0, y: 0 })
  }, [zoom])

  const handleImageLoad = () => {
    if (!imgRef.current) return
    setNaturalSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight })
  }

  // Clamp offset so the image never leaves the crop window
  const clampOffset = useCallback((ox: number, oy: number, z: number) => {
    if (naturalSize.w === 0) return { x: ox, y: oy }
    const { w: cW, h: cH } = containerSize
    const coverScale = Math.max(cW / naturalSize.w, cH / naturalSize.h)
    const dispW = naturalSize.w * coverScale * z
    const dispH = naturalSize.h * coverScale * z
    const maxX = Math.max(0, (dispW - cW) / 2)
    const maxY = Math.max(0, (dispH - cH) / 2)
    return {
      x: Math.max(-maxX, Math.min(maxX, ox)),
      y: Math.max(-maxY, Math.min(maxY, oy)),
    }
  }, [containerSize, naturalSize])

  // Pointer pan handlers
  const onPointerDown = (e: React.PointerEvent) => {
    dragging.current = true
    lastPointer.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  }
  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging.current) return
    const dx = e.clientX - lastPointer.current.x
    const dy = e.clientY - lastPointer.current.y
    lastPointer.current = { x: e.clientX, y: e.clientY }
    setOffset((prev) => clampOffset(prev.x + dx, prev.y + dy, zoom))
  }
  const onPointerUp = () => { dragging.current = false }

  // Touch pinch-to-zoom
  const onTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      const dx = e.touches[0].clientX - e.touches[1].clientX
      const dy = e.touches[0].clientY - e.touches[1].clientY
      const dist = Math.hypot(dx, dy)
      if (lastPinchDist.current !== null) {
        const ratio = dist / lastPinchDist.current
        setZoom((prev) => Math.max(1, Math.min(3, prev * ratio)))
      }
      lastPinchDist.current = dist
    }
  }
  const onTouchEnd = () => { lastPinchDist.current = null }

  const isSquare = aspectRatio === 1

  const previewStyle: React.CSSProperties = {
    width: containerSize.w,
    height: containerSize.h,
    overflow: 'hidden',
    position: 'relative',
    background: '#111',
    borderRadius: isSquare ? '50%' : 8,
    flexShrink: 0,
    touchAction: 'none',
    cursor: 'grab',
  }

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
    transformOrigin: 'center center',
    transition: dragging.current ? 'none' : 'transform 0.05s ease',
    userSelect: 'none',
    pointerEvents: 'none',
  }

  const handleCrop = useCallback(() => {
    if (!imgRef.current || naturalSize.w === 0) return
    setCropError(null)
    const { w: outW, h: outH } = getOutput(aspectRatio)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const imgW = naturalSize.w
    const imgH = naturalSize.h
    const { w: cW, h: cH } = containerSize

    const coverScale = Math.max(cW / imgW, cH / imgH)
    const dispW = imgW * coverScale * zoom
    const dispH = imgH * coverScale * zoom

    // How much of the natural image is visible, accounting for pan
    const visibleFracX = cW / dispW
    const visibleFracY = cH / dispH

    const srcW = imgW * visibleFracX
    const srcH = imgH * visibleFracY

    // Pan offset in natural image pixels (offset is in screen px, convert back)
    const panNatX = (-offset.x / (coverScale * zoom))
    const panNatY = (-offset.y / (coverScale * zoom))

    const srcX = Math.max(0, (imgW - srcW) / 2 + panNatX)
    const srcY = Math.max(0, (imgH - srcH) / 2 + panNatY)

    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
    canvas.toBlob(
      (blob) => {
        if (blob) {
          onCrop(blob)
        } else {
          setCropError('Could not process image. Please try a different photo or format.')
        }
      },
      'image/jpeg',
      0.88
    )
  }, [imgRef, naturalSize, aspectRatio, zoom, offset, containerSize, onCrop])

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.85)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 16,
      }}
    >
      <div
        style={{
          background: '#fff', borderRadius: 16, padding: 24,
          width: '100%', maxWidth: 460,
          display: 'flex', flexDirection: 'column', gap: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <p style={{ fontWeight: 700, fontSize: 15, margin: 0 }}>
            {isSquare ? 'Crop photo' : 'Crop image'}
          </p>
          <button
            onClick={onCancel}
            style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', lineHeight: 1 }}
            aria-label="Cancel"
          >×</button>
        </div>

        {/* Preview with pan support */}
        <div style={{ display: 'flex', justifyContent: 'center' }} ref={containerRef}>
          <div
            style={previewStyle}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            onTouchMove={onTouchMove}
            onTouchEnd={onTouchEnd}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={src}
              alt="Crop preview"
              onLoad={handleImageLoad}
              style={imgStyle}
              draggable={false}
            />
          </div>
        </div>

        <p style={{ fontSize: 11, color: '#9ca3af', textAlign: 'center', margin: '-12px 0 -8px' }}>
          Drag to reposition · Pinch or use slider to zoom
        </p>

        {/* Zoom slider */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#6b7280' }}>
            <span>Zoom</span>
            <span>{zoom.toFixed(1)}×</span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            style={{ width: '100%', accentColor: '#0A66C2', fontSize: '16px' }}
          />
        </div>

        {cropError && (
          <p style={{ fontSize: 12, color: '#ef4444', textAlign: 'center', margin: '-8px 0' }}>
            {cropError}
          </p>
        )}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={onCancel}
            style={{
              flex: 1, padding: '10px 0', borderRadius: 10,
              border: '1.5px solid #e5e7eb', background: '#fff',
              fontSize: 14, fontWeight: 600, color: '#374151', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
          <button
            onClick={handleCrop}
            style={{
              flex: 2, padding: '10px 0', borderRadius: 10,
              border: 'none', background: '#0A66C2',
              fontSize: 14, fontWeight: 600, color: '#fff', cursor: 'pointer',
            }}
          >
            Use this photo →
          </button>
        </div>
      </div>
    </div>
  )
}
