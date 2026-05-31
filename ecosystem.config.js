const fs = require('fs')
const path = require('path')

// Load .env.local into PM2 env so Next.js server-side vars are available
function loadEnv() {
  const envFile = path.join(__dirname, '.env.local')
  const env = { NODE_ENV: 'production', PORT: 3001, NEXT_TELEMETRY_DISABLED: '1' }
  if (!fs.existsSync(envFile)) return env
  fs.readFileSync(envFile, 'utf8')
    .split('\n')
    .forEach(line => {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) return
      const idx = trimmed.indexOf('=')
      if (idx === -1) return
      const key = trimmed.slice(0, idx).trim()
      const val = trimmed.slice(idx + 1).trim()
      env[key] = val
    })
  return env
}

module.exports = {
  apps: [
    {
      name: 'liveportfolio',
      cwd: '/home/deploy/apps/liveportfolio',
      script: 'node_modules/.bin/next',
      args: 'start -p 3001',
      instances: 2,
      exec_mode: 'cluster',
      env_production: loadEnv(),
      max_memory_restart: '512M',
      error_file: '/home/deploy/logs/liveportfolio-error.log',
      out_file: '/home/deploy/logs/liveportfolio-out.log',
    },
  ],
}
