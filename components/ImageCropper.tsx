'use client'

import { useEffect, useRef, useState, useCallback } from 'react'

interface ImageCropperProps {
  src: string
  aspectRatio: number   // 1 = square (avatar), 16/9 = project
  onCrop: (blob: Blob) => void
  onCancel: () => void
}

// Output dimensions
const OUTPUT_SIZE: Record<string, { w: number; h: number }> = {}
function getOutput(aspectRatio: number) {
  if (aspectRatio === 1) return { w: 400, h: 400 }
  return { w: 800, h: 450 }
}

export default function ImageCropper({ src, aspectRatio, onCrop, onCancel }: ImageCropperProps) {
  const imgRef = useRef<HTMLImageElement>(null)
  const [zoom, setZoom] = useState(1)
  const [naturalSize, setNaturalSize] = useState({ w: 0, h: 0 })
  const [containerSize, setContainerSize] = useState({ w: 340, h: 340 })
  const containerRef = useRef<HTMLDivElement>(null)

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

  const handleImageLoad = () => {
    if (!imgRef.current) return
    setNaturalSize({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight })
  }

  // The preview shows the image scaled and centred, zoomed by slider
  // objectPosition is always center — user just adjusts zoom
  const previewStyle: React.CSSProperties = {
    width: containerSize.w,
    height: containerSize.h,
    overflow: 'hidden',
    position: 'relative',
    background: '#111',
    borderRadius: aspectRatio === 1 ? '50%' : 8,
    flexShrink: 0,
  }

  const imgStyle: React.CSSProperties = {
    position: 'absolute',
    // Scale image to cover the container, then apply zoom
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    transform: `scale(${zoom})`,
    transformOrigin: 'center center',
    transition: 'transform 0.1s ease',
  }

  const handleCrop = useCallback(() => {
    if (!imgRef.current || naturalSize.w === 0) return
    const { w: outW, h: outH } = getOutput(aspectRatio)
    const canvas = document.createElement('canvas')
    canvas.width = outW
    canvas.height = outH
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Compute source rect: centre crop with zoom applied
    const imgW = naturalSize.w
    const imgH = naturalSize.h

    // The container shows the image cover-fitted and then zoomed
    // cover-fit scale factor:
    const coverScale = Math.max(containerSize.w / imgW, containerSize.h / imgH)
    // effective displayed width/height of the image at zoom=1
    const dispW = imgW * coverScale
    const dispH = imgH * coverScale
    // With zoom applied:
    const scaledW = dispW * zoom
    const scaledH = dispH * zoom

    // The portion visible in the container (centred):
    const visibleFracX = containerSize.w / scaledW
    const visibleFracY = containerSize.h / scaledH

    // Source rect in natural image pixels:
    const srcW = imgW * visibleFracX
    const srcH = imgH * visibleFracY
    const srcX = (imgW - srcW) / 2
    const srcY = (imgH - srcH) / 2

    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, outW, outH)
    canvas.toBlob(
      (blob) => { if (blob) onCrop(blob) },
      'image/jpeg',
      0.88
    )
  }, [imgRef, naturalSize, aspectRatio, zoom, containerSize, onCrop])

  const isSquare = aspectRatio === 1

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

        {/* Preview */}
        <div style={{ display: 'flex', justifyContent: 'center' }} ref={containerRef}>
          <div style={previewStyle}>
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
