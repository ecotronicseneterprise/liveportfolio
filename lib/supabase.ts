import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!

// Client-side instance — uses anon key, respects Row Level Security
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// Server-side admin instance — uses service role key, bypasses RLS
// NEVER import this in client components or page components
// Only use in /app/api/** routes and server components that need cross-user access
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
