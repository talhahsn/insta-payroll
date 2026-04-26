import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { toApiError, AppError } from '@/lib/errors'
import { prisma } from '@/lib/prisma'

const schema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  permissions: z.array(z.string()),
})

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'settings', 'manage')) throw new AppError('FORBIDDEN', 'Permission denied')

    const { name, description, permissions } = schema.parse(await req.json())

    const role = await prisma.role.create({
      data: {
        name,
        description,
        isProtected: false,
        restaurantId: user.restaurantId,
        permissions: {
          create: permissions.map((perm) => ({
            resource: perm.split('.')[0],
            action: perm.split('.')[1],
          })),
        },
      },
    })

    return NextResponse.json(role, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
