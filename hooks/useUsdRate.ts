'use client'

import { useEffect, useState } from 'react'

const CACHE_KEY = 'lp_ngn_usd_rate'
const CACHE_TTL_MS = 24 * 60 * 60 * 1000 // 24 hours
const RETRY_DELAY_MS = 3000

const BASIC_NGN = 15000
const PRO_NGN = 45000

interface UsdRateResult {
  basicUsd: string | null  // e.g. "11.23" — null means loading/unknown
  proUsd: string | null    // e.g. "32.95"
  rateLoading: boolean
}

function calcUsd(ngn: number, rate: number): string {
  return (ngn * rate).toFixed(2)
}

function readCachedRate(): { rate: number; fresh: boolean } | null {
  try {
    const raw = localStorage.getItem(CACHE_KEY)
    if (!raw) return null
    const { rate, ts } = JSON.parse(raw)
    if (typeof rate !== 'number' || rate <= 0) return null
    return { rate, fresh: Date.now() - ts < CACHE_TTL_MS }
  } catch {
    return null
  }
}

function writeCachedRate(rate: number): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ rate, ts: Date.now() }))
  } catch { /* ignore */ }
}

export function useUsdRate(): UsdRateResult {
  const [basicUsd, setBasicUsd] = useState<string | null>(null)
  const [proUsd, setProUsd] = useState<string | null>(null)
  const [rateLoading, setRateLoading] = useState(true)

  useEffect(() => {
    // Check for a fresh cached rate first
    const cached = readCachedRate()
    if (cached?.fresh) {
      setBasicUsd(calcUsd(BASIC_NGN, cached.rate))
      setProUsd(calcUsd(PRO_NGN, cached.rate))
      setRateLoading(false)
      return
    }

    let retried = false
    let controller = new AbortController()
    let timeout: ReturnType<typeof setTimeout>

    function doFetch() {
      controller = new AbortController()
      timeout = setTimeout(() => controller.abort(), 4000)

      fetch('https://api.frankfurter.app/latest?from=NGN&to=USD', { signal: controller.signal })
        .then((r) => r.json())
        .then((data) => {
          const rate = data?.rates?.USD
          if (typeof rate === 'number' && rate > 0) {
            writeCachedRate(rate)
            setBasicUsd(calcUsd(BASIC_NGN, rate))
            setProUsd(calcUsd(PRO_NGN, rate))
            setRateLoading(false)
          } else {
            throw new Error('bad rate')
          }
        })
        .catch(() => {
          // Try stale cache before giving up
          const stale = readCachedRate()
          if (stale) {
            setBasicUsd(calcUsd(BASIC_NGN, stale.rate))
            setProUsd(calcUsd(PRO_NGN, stale.rate))
            setRateLoading(false)
            return
          }
          // No cache at all — retry once after 3s, then leave null (skeleton shown)
          if (!retried) {
            retried = true
            setTimeout(doFetch, RETRY_DELAY_MS)
          } else {
            // Both attempts failed, no cache — leave null so skeleton renders
            setRateLoading(false)
          }
        })
        .finally(() => clearTimeout(timeout))
    }

    doFetch()

    return () => {
      controller.abort()
      clearTimeout(timeout)
    }
  }, [])

  return { basicUsd, proUsd, rateLoading }
}
