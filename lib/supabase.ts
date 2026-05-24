import { createClient } from '@supabase/supabase-js'

function requireEnv(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is required.`)
  return value
}

// Singleton — one instance per browser context, prevents GoTrueClient warnings.
let _clientInstance: ReturnType<typeof createClient> | null = null

// Client-side instance — uses anon key, respects Row Level Security.
export function getSupabaseClient() {
  if (_clientInstance) return _clientInstance
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseAnonKey = requireEnv(
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
  _clientInstance = createClient(supabaseUrl, supabaseAnonKey)
  return _clientInstance
}

// Server-side admin instance — uses service role key, bypasses RLS.
// NEVER call this in client components.
export function getSupabaseAdmin() {
  const supabaseUrl = requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
  const supabaseServiceRoleKey = requireEnv(
    'SUPABASE_SERVICE_ROLE_KEY',
    process.env.SUPABASE_SERVICE_ROLE_KEY
  )
  return createClient(supabaseUrl, supabaseServiceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
