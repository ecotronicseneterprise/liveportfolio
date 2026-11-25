'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

// The picture drop for an assistant's one-time upload link (?t=...). The picture is shrunk in the browser, then checked and
// re-encoded again on the server. For precise cropping use the picture tools in the dashboard.
const MAX_SIDE = 1600

async function shrink(file: File): Promise<Blob> {
  const bmp = await createImageBitmap(file)
  const k = Math.min(1, MAX_SIDE / Math.max(bmp.width, bmp.height))
  const c = document.createElement('canvas')
  c.width = Math.round(bmp.width * k); c.height = Math.round(bmp.height * k)
  const ctx = c.getContext('2d')!
  ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, c.width, c.height)
  ctx.drawImage(bmp, 0, 0, c.width, c.height)
  return await new Promise((res, rej) => c.toBlob((b) => (b ? res(b) : rej(new Error('encode'))), 'image/jpeg', 0.85))
}

export default function UploadPage() {
  const [token, setToken] = useState('')
  const [state, setState] = useState<'ready' | 'working' | 'done' | 'error'>('ready')
  const [message, setMessage] = useState('')
  const [closeFailed, setCloseFailed] = useState(false)

  useEffect(() => {
    const t = new URLSearchParams(window.location.search).get('t') ?? ''
    setToken(t)
    void getSupabaseClient().auth.getSession().then(({ data }) => {
      if (!data.session) window.location.href = `/login?next=${encodeURIComponent(`/oauth/upload?t=${t}`)}`
    })
  }, [])

  const send = async (file: File | undefined) => {
    if (!file || !token) return
    setState('working')
    try {
      const blob = await shrink(file)
      const fd = new FormData()
      fd.append('token', token)
      fd.append('file', blob, 'picture.jpg')
      const sess = (await getSupabaseClient().auth.getSession()).data.session
      const res = await fetch('/api/mcp/upload', { method: 'POST', headers: { authorization: `Bearer ${sess?.access_token}` }, body: fd })
      const j = await res.json().catch(() => ({}))
      if (!res.ok) { setMessage(j.message || 'That picture could not be added.'); setState('error'); return }
      setMessage('Done. The picture is on your portfolio. You can go back to your assistant.')
      setState('done')
    } catch {
      setMessage('That file could not be read as a picture. Use a JPEG, PNG or WebP.')
      setState('error')
    }
  }

  // Same as the approval page: close this tab, and say so if the browser refuses (a tab the person opened themselves can usually be closed).
  const closeTab = () => { window.close(); setTimeout(() => setCloseFailed(true), 300) }

  return (
    <main className="min-h-screen bg-white text-neutral-900 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md">
        <p className="text-sm font-semibold tracking-wide text-neutral-500">LivePortfolio</p>
        <h1 className="mt-2 text-2xl font-semibold">Add your picture</h1>
        <p className="mt-2 text-neutral-600">Choose the picture your assistant asked for. It is added to your portfolio straight away and you can undo it from History.</p>
        {state === 'done' ? (
          <>
            <p role="status" className="mt-6 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">{message}</p>
            <button onClick={closeTab} className="mt-5 min-h-[48px] w-full rounded-full border border-neutral-300 px-5 font-medium">Close this tab</button>
            {closeFailed && <p className="mt-2 text-sm text-neutral-600">You can close this tab.</p>}
          </>
        ) : (
          <>
            {state === 'error' && <p role="alert" className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{message}</p>}
            <label className="mt-6 flex min-h-[120px] cursor-pointer items-center justify-center rounded-2xl border-2 border-dashed border-neutral-300 p-6 text-center">
              <span>{state === 'working' ? 'Adding…' : 'Tap to choose a picture (JPEG, PNG or WebP)'}</span>
              <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" disabled={state === 'working'} onChange={(e) => send(e.target.files?.[0])} />
            </label>
          </>
        )}
      </div>
    </main>
  )
}
