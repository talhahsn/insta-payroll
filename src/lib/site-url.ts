/**
 * Canonical public URL for auth redirects. Used client-side for password reset emails.
 *
 * - Local dev: `window.location.origin` when the form runs in the browser.
 * - Vercel: set `NEXT_PUBLIC_SITE_URL` to the production domain if you ever need
 *   a server-side absolute URL; client flows use the browser origin automatically.
 * - Supabase: add the same origin(s) under Authentication → URL configuration →
 *   Redirect URLs (e.g. `http://localhost:3000/**`, `https://*.vercel.app/**`,
 *   `https://your-domain.com/**`).
 */
export function getPublicSiteUrl(): string {
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  const fromEnv = process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) {
    return fromEnv.replace(/\/$/, '')
  }
  return 'http://localhost:3000'
}
