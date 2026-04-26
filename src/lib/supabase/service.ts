import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cached: SupabaseClient | null | undefined

/**
 * Service-role client for Storage (bypasses RLS). Set `SUPABASE_SERVICE_ROLE_KEY` in env.
 * Used only on the server. Returns null if the key is missing.
 */
export function getSupabaseServiceClient(): SupabaseClient | null {
  if (cached !== undefined) return cached
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!key || !url) {
    cached = null
    return null
  }
  cached = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } })
  return cached
}
