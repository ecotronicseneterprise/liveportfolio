'use client'

import { useEffect, useState } from 'react'
import { getSupabaseClient } from '@/lib/supabase'

export default function PublishedCount() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    try {
      const supabase = getSupabaseClient()
      supabase
        .from('users')
        .select('*', { count: 'exact', head: true })
        .not('published_at', 'is', null)
        .then(({ count: c }) => {
          if (c && c > 0) setCount(c)
        })
    } catch {
      // silently fail — show nothing
    }
  }, [])

  if (!count) return null

  return (
    <p className="text-sm text-gray-500">
      ✦ {count} portfolios published and live
    </p>
  )
}
