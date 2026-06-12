'use client'

import { useEffect, useState } from 'react'

const CACHE_KEY = 'lp_pricing_region_v2'

interface RegionCache {
  region: 'NG' | 'INTL'
  country: string | null
  cachedAt: number
}

export function useRegion(): { region: 'NG' | 'INTL' | null; loading: boolean } {
  const [region, setRegion] = useState<'NG' | 'INTL' | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cachedData: RegionCache | null = null

    try {
      const raw = localStorage.getItem(CACHE_KEY)
      if (raw) {
        cachedData = JSON.parse(raw) as RegionCache
        setRegion(cachedData.region)
        setLoading(false)
      }
    } catch {
      cachedData = null
    }

    // Always revalidate in background — stale-while-revalidate
    const controller = new AbortController()

    fetch('/api/pricing-region', { signal: controller.signal })
      .then((r) => r.json())
      .then((data: { region: 'NG' | 'INTL'; country: string | null }) => {
        const resolved: 'NG' | 'INTL' = data?.region === 'INTL' ? 'INTL' : 'NG'
        const country = data?.country ?? null

        const changed = !cachedData ||
          cachedData.region !== resolved ||
          cachedData.country !== country

        if (changed) {
          setRegion(resolved)
        }

        try {
          localStorage.setItem(CACHE_KEY, JSON.stringify({ region: resolved, country, cachedAt: Date.now() }))
        } catch { /* ignore */ }

        if (!cachedData) setLoading(false)
      })
      .catch(() => {
        if (!cachedData) {
          setRegion('NG')
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [])

  return { region, loading }
}
