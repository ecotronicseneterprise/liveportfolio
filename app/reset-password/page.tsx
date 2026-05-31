'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase'
import Logo from '@/components/Logo'

export default function ResetPasswordPage() {
  const router = useRouter()
  let supabase: ReturnType<typeof getSupabaseClient>
  try { supabase = getSupabaseClient() } catch {
    return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">Setup required.</p></div>
  }

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    // Supabase puts the session in the URL hash after clicking the email link
    supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password.length < 8) { setError('Password must be at least 8 characters.'); return }
    if (password !== confirm) { setError('Passwords do not match.'); return }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      setError(error.message)
    } else {
      setDone(true)
      setTimeout(() => router.push('/dashboard'), 2500)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-xl mx-auto px-6 py-12">
        <div className="mb-8">
          <a href="/"><Logo /></a>
        </div>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Set a new password</h1>
          <p className="text-gray-500 text-sm">Choose a strong password for your account.</p>
        </div>

        {done ? (
          <div className="p-5 bg-green-50 border border-green-100 rounded-2xl text-center">
            <p className="text-sm font-semibold text-green-700 mb-1">Password updated</p>
            <p className="text-sm text-green-600">Taking you to your dashboard…</p>
          </div>
        ) : !ready ? (
          <div className="p-5 bg-yellow-50 border border-yellow-100 rounded-2xl">
            <p className="text-sm text-yellow-700">Waiting for your reset link to be verified. If you landed here directly, please click the link in your email first.</p>
          </div>
        ) : (
          <>
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-100 rounded-xl text-sm text-red-600">{error}</div>
            )}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">New password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Min 8 characters"
                  required
                  autoFocus
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  placeholder="Repeat your new password"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A66C2] focus:border-transparent"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors disabled:opacity-50"
              >
                {loading ? 'Saving…' : 'Set new password →'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  )
}
