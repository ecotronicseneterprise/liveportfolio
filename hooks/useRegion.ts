'use client'

import { useEffect, useState } from 'react'

const CACHE_KEY = 'lp_pricing_region_v2'
const CACHE_TTL_MS = 60 * 60 * 1000 // 1 hour

interface RegionCache {
  region: 'NG' | 'INTL'
  country: string | null
  cachedAt: number
}

export function useRegion(): { region: 'NG' | 'INTL' | null; loading: boolean } {
  const [region, setRegion] = useState<'NG' | 'INTL' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check localStorage cache first
    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        const cached: RegionCache = JSON.parse(raw)
        if (Date.now() - cached.cachedAt < CACHE_TTL_MS) {
          setRegion(cached.region)
          setLoading(false)
          return
        }
      }
    } catch { /* ignore */ }

    // Fetch from API
    const controller = new AbortController()

    fetch('/api/pricing-region', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { region: 'NG' | 'INTL'; country: string | null }) => {
        const resolved = data?.region === 'INTL' ? 'INTL' : 'NG'
        try {
          const entry: RegionCache = { region: resolved, country: data?.country ?? null, cachedAt: Date.now() }
          localStorage.setItem(CACHE_KEY, JSON.stringify(entry))
        } catch { /* ignore */ }
        setRegion(resolved)
        setLoading(false)
      })
      .catch(() => {
        // Any failure → safe default
        setRegion('NG')
        setLoading(false)
      })

    return () => controller.abort()
  }, [])

  return { region, loading }
}
