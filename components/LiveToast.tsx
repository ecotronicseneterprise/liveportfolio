'use client'

import { useEffect, useState } from 'react'

interface Toast {
  id: number
  message: string
}

let toastId = 0
let globalPush: ((msg: string) => void) | null = null

export function pushLiveToast(message: string) {
  globalPush?.(message)
}

export default function LiveToast() {
  const [toasts, setToasts] = useState<Toast[]>([])

  useEffect(() => {
    globalPush = (message: string) => {
      const id = ++toastId
      setToasts((prev) => [...prev, { id, message }])
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id))
      }, 5000)
    }
    return () => { globalPush = null }
  }, [])

  if (toasts.length === 0) return null

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 16,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        maxWidth: 320,
        pointerEvents: 'none',
      }}
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          style={{
            background: '#0A0A0A',
            color: '#fff',
            padding: '10px 14px',
            borderRadius: 10,
            fontSize: 13,
            fontWeight: 500,
            lineHeight: 1.4,
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            animation: 'lp-toast-in 0.2s ease',
          }}
        >
          <span style={{ width: 7, height: 7, background: '#10B981', borderRadius: '50%', flexShrink: 0 }} />
          {t.message}
        </div>
      ))}
      <style>{`@keyframes lp-toast-in{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}`}</style>
    </div>
  )
}
