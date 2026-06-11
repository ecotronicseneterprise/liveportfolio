'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import Logo from '@/components/Logo'
import { getSupabaseClient } from '@/lib/supabase'

export default function LandingNav() {
  const [mounted, setMounted] = useState(false)
  const [loggedIn, setLoggedIn] = useState(false)

  useEffect(() => {
    setMounted(true)
    try {
      const supabase = getSupabaseClient()
      supabase.auth.getSession().then(({ data: { session } }) => {
        setLoggedIn(!!session)
      })
    } catch {
      // Supabase not configured — stay logged out state
    }
  }, [])

  const showDashboard = mounted && loggedIn

  return (
    <nav className="border-b border-gray-100 sticky top-0 z-50 bg-white/95 backdrop-blur-sm">
      <div className="w-full px-6 sm:px-10 lg:px-16 py-4 flex items-center justify-between">
        <Link href="/"><Logo /></Link>
        <div className="flex items-center gap-4">
          <Link href="/blog" className="text-sm text-gray-500 hover:text-gray-800 transition-colors hidden sm:block">
            Blog
          </Link>
          {showDashboard ? (
            <Link
              href="/dashboard"
              className="px-5 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
            >
              My dashboard →
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-sm text-gray-500 hover:text-gray-800 transition-colors">
                Sign in
              </Link>
              <Link
                href="/create"
                className="px-5 py-2 bg-[#0A66C2] text-white text-sm font-semibold rounded-full hover:bg-[#084D9A] transition-colors"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
