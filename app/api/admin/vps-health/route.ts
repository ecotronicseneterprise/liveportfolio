import { NextRequest, NextResponse } from 'next/server'
import os from 'os'
import { spawnSync } from 'child_process'

export const dynamic = 'force-dynamic'

// pm2 is installed globally under the deploy user's nvm — resolve the full path
// so spawnSync can find it regardless of the PATH the Next.js process inherits.
const PM2_BIN = (() => {
  try {
    const which = spawnSync('which', ['pm2'], { encoding: 'utf8', timeout: 2000 })
    const path = which.stdout?.trim()
    return path || '/home/deploy/.nvm/versions/node/v20.19.2/bin/pm2'
  } catch {
    return '/home/deploy/.nvm/versions/node/v20.19.2/bin/pm2'
  }
})()

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-metrics-secret')
  const secret = process.env.ADMIN_METRICS_SECRET
  if (!secret) return false
  return token === secret
}

function getDiskUsage(): { used_gb: number; total_gb: number; pct: number } {
  const fallback = { used_gb: 0, total_gb: 0, pct: 0 }
  try {
    const result = spawnSync('df', ['-k', '/'], { encoding: 'utf8', timeout: 5000 })
    if (result.status !== 0 || !result.stdout) return fallback
    const lines = result.stdout.trim().split('\n')
    const parts = lines[1]?.split(/\s+/)
    if (!parts || parts.length < 5) return fallback
    const totalKb = parseInt(parts[1], 10)
    const usedKb = parseInt(parts[2], 10)
    if (isNaN(totalKb) || isNaN(usedKb) || totalKb === 0) return fallback
    return {
      used_gb: parseFloat((usedKb / 1024 / 1024).toFixed(2)),
      total_gb: parseFloat((totalKb / 1024 / 1024).toFixed(2)),
      pct: parseFloat(((usedKb / totalKb) * 100).toFixed(1)),
    }
  } catch {
    return fallback
  }
}

interface Pm2Process {
  name: string
  status: string
  restarts: number
  uptime_seconds: number
  memory_mb: number
}

function getPm2Processes(): Pm2Process[] {
  try {
    // Use full path and pipe stderr to /dev/null so pm2's internal
    // permission-error noise does not pollute the process error log.
    const result = spawnSync(PM2_BIN, ['jlist'], {
      encoding: 'utf8',
      timeout: 10000,
      stdio: ['ignore', 'pipe', 'ignore'],
    })
    if (result.status !== 0 || !result.stdout?.trim()) return []
    const list = JSON.parse(result.stdout) as Array<Record<string, unknown>>
    return list.map(p => {
      const monit = p.monit as Record<string, number> | undefined
      const pm2Env = p.pm2_env as Record<string, unknown> | undefined
      return {
        name: (p.name as string) ?? 'unknown',
        status: (pm2Env?.status as string) ?? 'unknown',
        restarts: (pm2Env?.restart_time as number) ?? 0,
        uptime_seconds: pm2Env?.pm_uptime
          ? Math.floor((Date.now() - (pm2Env.pm_uptime as number)) / 1000)
          : 0,
        memory_mb: monit?.memory ? parseFloat((monit.memory / 1024 / 1024).toFixed(1)) : 0,
      }
    })
  } catch {
    return []
  }
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const totalMemBytes = os.totalmem()
    const freeMemBytes = os.freemem()
    const usedMemBytes = totalMemBytes - freeMemBytes
    const loadAvg = os.loadavg()

    const disk = getDiskUsage()
    const pm2Processes = getPm2Processes()

    return NextResponse.json({
      uptime_seconds: Math.floor(os.uptime()),
      memory: {
        used_mb: parseFloat((usedMemBytes / 1024 / 1024).toFixed(1)),
        total_mb: parseFloat((totalMemBytes / 1024 / 1024).toFixed(1)),
        pct: parseFloat(((usedMemBytes / totalMemBytes) * 100).toFixed(1)),
      },
      load_avg_1m: parseFloat(loadAvg[0].toFixed(2)),
      disk,
      pm2_processes: pm2Processes,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: 'health check failed', details: message }, { status: 500 })
  }
}
