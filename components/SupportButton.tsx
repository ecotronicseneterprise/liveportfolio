'use client'

import { useEffect, useRef, useState } from 'react'

const WA_URL = 'https://wa.me/2349014545622?text=Hi%2C%20I%20have%20a%20question%20about%20liveportfolio.site'

export default function SupportButton() {
  const [pos, setPos] = useState({ x: -1, y: -1 }) // -1 = not yet initialised
  const [dragging, setDragging] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const hasDragged = useRef(false)
  const btnRef = useRef<HTMLAnchorElement>(null)

  // Set initial position once we know window size
  useEffect(() => {
    const SIZE = 52
    setPos({ x: window.innerWidth - SIZE - 16, y: window.innerHeight - SIZE - 24 })
  }, [])

  const clamp = (val: number, min: number, max: number) => Math.max(min, Math.min(max, val))

  const snapToEdge = (x: number, y: number) => {
    const SIZE = 52
    const midX = window.innerWidth / 2
    // Snap to nearest horizontal edge
    const snappedX = x + SIZE / 2 < midX ? 16 : window.innerWidth - SIZE - 16
    const snappedY = clamp(y, 16, window.innerHeight - SIZE - 16)
    return { x: snappedX, y: snappedY }
  }

  const onPointerDown = (e: React.PointerEvent) => {
    if (!btnRef.current) return
    hasDragged.current = false
    const rect = btnRef.current.getBoundingClientRect()
    dragOffset.current = { x: e.clientX - rect.left, y: e.clientY - rect.top }
    setDragging(true)
    btnRef.current.setPointerCapture(e.pointerId)
  }

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return
    hasDragged.current = true
    const SIZE = 52
    const x = clamp(e.clientX - dragOffset.current.x, 0, window.innerWidth - SIZE)
    const y = clamp(e.clientY - dragOffset.current.y, 0, window.innerHeight - SIZE)
    setPos({ x, y })
  }

  const onPointerUp = (e: React.PointerEvent) => {
    if (!dragging) return
    setDragging(false)
    if (hasDragged.current) {
      // Snap to nearest side edge
      setPos(prev => snapToEdge(prev.x, prev.y))
      // Prevent the click from firing after a drag
      e.preventDefault()
    }
  }

  // Don't render until position is initialised (avoids SSR mismatch)
  if (pos.x === -1) return null

  return (
    <a
      ref={btnRef}
      href={hasDragged.current ? undefined : WA_URL}
      onClick={(e) => { if (hasDragged.current) e.preventDefault() }}
      target="_blank"
      rel="noopener noreferrer"
      title="Chat with support"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        left: pos.x,
        top: pos.y,
        zIndex: 9999,
        touchAction: 'none',
        cursor: dragging ? 'grabbing' : 'grab',
        userSelect: 'none',
        transition: dragging ? 'none' : 'left 0.2s ease, top 0.2s ease',
      }}
      className="h-[52px] bg-[#0A66C2] hover:bg-[#084D9A] text-white rounded-full shadow-lg flex items-center justify-center gap-2 px-4 md:px-5"
    >
      {/* Chat icon */}
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="flex-shrink-0">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
    </a>
  )
}
