import fs from 'node:fs'
import path from 'node:path'

/**
 * Loads bench/.env.local (a DEDICATED, low-limit OpenAI project key — not the app's key).
 * Never reads the repo-root .env.local and never prints values.
 */
export function loadEnv(file = path.resolve(__dirname, '..', '.env.local')) {
  if (!fs.existsSync(file)) return false
  for (const line of fs.readFileSync(file, 'utf8').split(String.fromCharCode(10))) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/)
    if (m && m[2] && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^['"]|['"]$/g, '')
  }
  return true
}
