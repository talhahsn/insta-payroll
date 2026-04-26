import { notFound, redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { SetupForm } from './setup-form'

export default async function SetupPage({
  params,
}: {
  params: Promise<{ restaurantSlug: string }>
}) {
  const { restaurantSlug } = await params

  const restaurant = await prisma.restaurant.findUnique({
    where: { slug: restaurantSlug },
  })

  if (!restaurant) notFound()

  const userCount = await prisma.user.count({
    where: { restaurantId: restaurant.id },
  })

  if (userCount > 0) redirect('/login')

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            IP
          </div>
          <h1 className="text-2xl font-bold">Set Up {restaurant.name}</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Create your Super Admin account to get started
          </p>
        </div>
        <SetupForm restaurantSlug={restaurantSlug} />
      </div>
    </div>
  )
}
