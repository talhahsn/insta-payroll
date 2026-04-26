/** Public bucket: create in Supabase Dashboard → Storage → New bucket → name `restaurant-logos` → public. */
export const RESTAURANT_LOGO_BUCKET = 'restaurant-logos'

const ALLOWED = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/gif',
  'image/svg+xml',
])

const MAX_BYTES = 2 * 1024 * 1024

export function objectPathForRestaurant(restaurantId: string) {
  return `${restaurantId}/logo`
}

export function assertLogoFile(file: File) {
  if (!ALLOWED.has(file.type)) {
    return { ok: false as const, error: 'Use a PNG, JPEG, WebP, GIF, or SVG image.' }
  }
  if (file.size > MAX_BYTES) {
    return { ok: false as const, error: 'Image must be 2MB or smaller.' }
  }
  if (file.size < 1) {
    return { ok: false as const, error: 'File is empty.' }
  }
  return { ok: true as const }
}

/**
 * If `logoUrl` is our Supabase public URL, return the Storage object path; otherwise null
 * (external URL — no server-side delete in bucket).
 */
export function storageObjectPathFromPublicUrl(logoUrl: string | null | undefined, restaurantId: string) {
  if (!logoUrl) return null
  try {
    const u = new URL(logoUrl)
    const segs = u.pathname.split('/object/public/' + RESTAURANT_LOGO_BUCKET + '/')
    if (segs.length < 2) return null
    const path = decodeURIComponent(segs[1] ?? '')
    if (!path.startsWith(`${restaurantId}/`)) return null
    return path
  } catch {
    return null
  }
}
