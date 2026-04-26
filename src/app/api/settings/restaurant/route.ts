import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { toApiError, AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'
import { storageObjectPathFromPublicUrl, RESTAURANT_LOGO_BUCKET } from '@/lib/restaurant-logo-storage'
import { uploadRestaurantLogo, requireSupabaseServiceForLogos } from '@/lib/restaurant-logo-upload.server'
import { getSupabaseServiceClient } from '@/lib/supabase/service'
import type { Prisma } from '@prisma/client'

const patchSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  phone: z.string().max(40).optional(),
  address: z.string().max(2000).optional(),
})

function toOptNullString(s: string | undefined) {
  if (s === undefined) return undefined
  const t = s.trim()
  return t === '' ? null : t
}

/**
 * `PATCH` with `application/json`: name, phone, address (logo unchanged).
 * `PATCH` with `multipart/form-data`: `name`, `phone`, `address`, optional `logo` (file), optional `removeLogo` = `true`.
 */
export async function PATCH(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')

    const contentType = req.headers.get('content-type') ?? ''

    if (contentType.includes('multipart/form-data')) {
      const form = await req.formData()
      const name = String(form.get('name') ?? '').trim()
      if (!name) throw new AppError('VALIDATION', 'Name is required')
      if (name.length > 120) throw new AppError('VALIDATION', 'Name is too long')
      const phone = String(form.get('phone') ?? '').trim() || null
      const address = String(form.get('address') ?? '').trim() || null
      if (phone && phone.length > 40) throw new AppError('VALIDATION', 'Phone is too long')
      if (address && address.length > 2000) throw new AppError('VALIDATION', 'Address is too long')

      const file = form.get('logo')
      const removeFlag = String(form.get('removeLogo') ?? '')

      const data: Prisma.RestaurantUpdateInput = { name, phone, address }
      if (file instanceof File && file.size > 0) {
        const supabase = requireSupabaseServiceForLogos()
        const publicUrl = await uploadRestaurantLogo(supabase, user.restaurantId, file)
        data.logoUrl = publicUrl
      } else if (removeFlag === 'true') {
        const current = await prisma.restaurant.findUnique({
          where: { id: user.restaurantId },
          select: { logoUrl: true },
        })
        const path = storageObjectPathFromPublicUrl(current?.logoUrl, user.restaurantId)
        const supabase = getSupabaseServiceClient()
        if (path && supabase) {
          await supabase.storage.from(RESTAURANT_LOGO_BUCKET).remove([path]).catch(() => {})
        }
        data.logoUrl = null
      }

      const restaurant = await prisma.restaurant.update({
        where: { id: user.restaurantId },
        data,
      })
      return NextResponse.json(restaurant)
    }

    const body = patchSchema.parse(await req.json())
    const phone = toOptNullString(body.phone)
    const address = toOptNullString(body.address)

    const data: Prisma.RestaurantUpdateInput = { name: body.name }
    if (phone !== undefined) data.phone = phone
    if (address !== undefined) data.address = address

    const restaurant = await prisma.restaurant.update({
      where: { id: user.restaurantId },
      data,
    })
    return NextResponse.json(restaurant)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
