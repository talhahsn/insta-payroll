import {
  assertLogoFile,
  objectPathForRestaurant,
  RESTAURANT_LOGO_BUCKET,
} from '@/lib/restaurant-logo-storage'
import { getSupabaseServiceClient } from '@/lib/supabase/service'
import { AppError } from '@/lib/errors'
import type { SupabaseClient } from '@supabase/supabase-js'

export function requireSupabaseServiceForLogos() {
  const supabase = getSupabaseServiceClient()
  if (!supabase) {
    throw new AppError(
      'INTERNAL',
      'Logo upload is not configured. Set SUPABASE_SERVICE_ROLE_KEY and create a public bucket named restaurant-logos.'
    )
  }
  return supabase
}

export async function uploadRestaurantLogo(
  supabase: SupabaseClient,
  restaurantId: string,
  file: File
): Promise<string> {
  const check = assertLogoFile(file)
  if (!check.ok) throw new AppError('VALIDATION', check.error)
  const path = objectPathForRestaurant(restaurantId)
  const buf = Buffer.from(await file.arrayBuffer())
  const { error: uploadError } = await supabase.storage
    .from(RESTAURANT_LOGO_BUCKET)
    .upload(path, buf, {
      upsert: true,
      contentType: file.type || 'application/octet-stream',
      cacheControl: '3600',
    })
  if (uploadError) {
    console.error('[logo upload]', uploadError)
    throw new AppError(
      'INTERNAL',
      uploadError.message.includes('Bucket not found')
        ? 'Storage bucket missing. Create a public bucket named restaurant-logos in Supabase.'
        : 'Could not upload image. Check Storage configuration.'
    )
  }
  const {
    data: { publicUrl },
  } = supabase.storage.from(RESTAURANT_LOGO_BUCKET).getPublicUrl(path)
  return publicUrl
}
