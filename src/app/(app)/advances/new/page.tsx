import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { prisma } from '@/lib/prisma'
import { AppContentScrollPage } from '@/components/layout/list-page-layout'
import { AdvanceForm } from '@/components/advances/advance-form'

export default async function NewAdvancePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dbUser = await prisma.user.findUnique({ where: { supabaseUid: user.id } })
  if (!dbUser) redirect('/login')

  const employees = await prisma.employee.findMany({
    where: { restaurantId: dbUser.restaurantId, status: 'ACTIVE' },
    select: { id: true, name: true },
    orderBy: { name: 'asc' },
  })

  return (
    <AppContentScrollPage className="mx-auto w-full max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Record Advance / Expense</h1>
          <p className="text-muted-foreground">Add a cash advance or food expense for an employee</p>
        </div>
        <AdvanceForm employees={employees} />
      </div>
    </AppContentScrollPage>
  )
}
