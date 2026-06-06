import { NextRequest, NextResponse } from 'next/server'
import os from 'os'
import { spawnSync } from 'child_process'

export const dynamic = 'force-dynamic'

function isAuthorized(req: NextRequest): boolean {
  const token = req.headers.get('x-metrics-secret')
  const secret = process.env.ADMIN_METRICS_SECRET
  if (!secret) return false
  return token === secret
}

function getDiskUsage(): { used_gb: number; total_gb: number; pct: number } | null {
  try {
    const result = spawnSync('df', ['-k', '/'], { timeout: 5000 })
    if (result.status !== 0) return null
    const lines = result.stdout.toString().trim().split('\n')
    // df -k output: Filesystem 1K-blocks Used Available Use% Mounted
    const parts = lines[1]?.split(/\s+/)
    if (!parts || parts.length < 5) return null
    const totalKb = parseInt(parts[1], 10)
    const usedKb = parseInt(parts[2], 10)
    if (isNaN(totalKb) || isNaN(usedKb) || totalKb === 0) return null
    return {
      used_gb: parseFloat((usedKb / 1024 / 1024).toFixed(2)),
      total_gb: parseFloat((totalKb / 1024 / 1024).toFixed(2)),
      pct: parseFloat(((usedKb / totalKb) * 100).toFixed(1)),
    }
  } catch {
    return null
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
    const result = spawnSync('pm2', ['jlist'], { timeout: 10000 })
    if (result.status !== 0) return []
    const list = JSON.parse(result.stdout.toString()) as Array<Record<string, unknown>>
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
    disk: disk ?? { used_gb: 0, total_gb: 0, pct: 0 },
    pm2_processes: pm2Processes,
  })
}
