// Server-side only — never import in client components

function filterCompany(name: string): string | null {
  if (!name) return null
  const noise = /amazon|google|microsoft|cloudflare|digitalocean|linode|vultr|hetzner|ovh|comcast|verizon|att\b|t-mobile|spectrum|cox |frontier|centurylink|unknown/i
  if (noise.test(name)) return null
  return name.trim() || null
}

interface IpInfoResult {
  company: string | null
  country: string | null
}

// Supabase admin type — loose to avoid import cycle with supabase.ts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function getIpInfo(ip: string, ipHash: string, supabaseAdmin: any): Promise<IpInfoResult> {
  const token = process.env.IPINFO_TOKEN
  if (!token) return { company: null, country: null }

  // Skip private/loopback IPs
  if (!ip || ip === 'unknown' || ip.startsWith('127.') || ip.startsWith('192.168.') || ip.startsWith('10.') || ip === '::1') {
    return { company: null, country: null }
  }

  try {
    // Check if we've seen this ip_hash in the last 24 hours — reuse cached data
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
    const { data: cached } = await supabaseAdmin
      .from('analytics_events')
      .select('company, country')
      .eq('ip_hash', ipHash)
      .gte('created_at', oneDayAgo)
      .not('company', 'is', null)
      .limit(1)
      .single()

    if (cached) {
      return { company: cached.company, country: cached.country }
    }
  } catch {
    // No cached row — proceed to API call
  }

  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 2000)

    const res = await fetch(`https://api.ipinfo.io/lite/${ip}?token=${token}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
    clearTimeout(timeout)

    if (!res.ok) return { company: null, country: null }

    const data = await res.json()
    return {
      company: data.as_name ? filterCompany(data.as_name) : null,
      country: data.country ?? null,
    }
  } catch {
    // Timeout or network error — never block on this
    return { company: null, country: null }
  }
}
