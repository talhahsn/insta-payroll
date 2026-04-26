/**
 * Probes Supabase Storage: uploads a tiny file, deletes it, exits 0.
 * Run from repo root: npx tsx scripts/verify-restaurant-logos-bucket.ts
 * Requires: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, and bucket `restaurant-logos`.
 */
import { config } from 'dotenv'
import { join } from 'node:path'
import { createClient } from '@supabase/supabase-js'

const BUCKET = 'restaurant-logos'

config({ path: join(process.cwd(), '.env.local') })
config({ path: join(process.cwd(), '.env') })

const url = process.env['NEXT_PUBLIC_SUPABASE_URL']
const key = process.env['SUPABASE_SERVICE_ROLE_KEY']
if (!url || !key) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL and/or SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}
const supabaseUrl = url
const serviceKey = key

async function main() {
  const supabase = createClient(supabaseUrl, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } })
  const path = `__probe/verify-${Date.now()}.txt`
  const body = new Uint8Array([104, 105]) // "hi"

  const { error: up } = await supabase.storage.from(BUCKET).upload(path, body, {
    contentType: 'text/plain',
    upsert: false,
  })
  if (up) {
    console.error('Upload failed:', up.message)
    process.exit(1)
  }

  const { error: del } = await supabase.storage.from(BUCKET).remove([path])
  if (del) {
    console.error('Delete failed:', del.message, '(uploaded object may remain at ' + path + ')')
    process.exit(1)
  }

  console.log('OK: upload + delete in bucket', BUCKET, path)
  process.exit(0)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
