import Link from 'next/link'
import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { FestivalsListPageSkeleton } from '@/components/loading/table-page-skeletons'
import { format } from 'date-fns'
import { Plus } from 'lucide-react'
import { getAuthUser } from '@/lib/auth'
import { can } from '@/lib/permissions'
import { prisma } from '@/lib/prisma'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TABLE_HEADER_STICKY } from '@/components/ui/table-header-classname'
import { DeleteFestivalButton } from '@/components/festivals/delete-festival-button'
import { ListPageScrollRoot, ScrollableTableRegion } from '@/components/layout/list-page-layout'

export default function FestivalsPage() {
  return (
    <Suspense fallback={<FestivalsListPageSkeleton />}>
      <FestivalsPageContent />
    </Suspense>
  )
}

async function FestivalsPageContent() {
  let authUser
  try {
    authUser = await getAuthUser()
  } catch {
    redirect('/login')
  }

  const canManage = can(authUser, 'festivals', 'manage')

  const events = await prisma.festivalEvent.findMany({
    where: { restaurantId: authUser.restaurantId },
    include: { _count: { select: { bonuses: true } } },
    orderBy: { eventDate: 'desc' },
  })

  return (
    <ListPageScrollRoot>
      <div className="flex shrink-0 items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Festival Bonuses</h1>
          <p className="text-muted-foreground">Eid, bonuses, and one-time payments</p>
        </div>
        {canManage && (
          <Button render={<Link href="/festivals/new" />}>
            <Plus className="mr-2 h-4 w-4" />
            Add Festival
          </Button>
        )}
      </div>

      {events.length === 0 ? (
        <p className="shrink-0 text-muted-foreground text-sm">No festival events recorded yet.</p>
      ) : (
        <ScrollableTableRegion>
          <Table>
            <TableHeader className={TABLE_HEADER_STICKY}>
              <TableRow>
                <TableHead>Festival</TableHead>
                <TableHead>Event Date</TableHead>
                <TableHead>Applies to</TableHead>
                <TableHead>Bonus Type</TableHead>
                <TableHead>Value</TableHead>
                <TableHead>Employees</TableHead>
                {canManage && <TableHead className="w-10" />}
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((event) => (
                <TableRow key={event.id}>
                  <TableCell className="font-medium">{event.name}</TableCell>
                  <TableCell>{format(event.eventDate, 'dd MMM yyyy')}</TableCell>
                  <TableCell>{format(event.appliesToMonth, 'MMM yyyy')}</TableCell>
                  <TableCell>
                    <Badge variant={event.bonusType === 'FIXED' ? 'outline' : 'secondary'}>
                      {event.bonusType === 'FIXED' ? 'Fixed PKR' : 'N × Daily Rate'}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {event.bonusType === 'FIXED'
                      ? `PKR ${event.bonusValue.toLocaleString()}`
                      : `${event.bonusValue} day${event.bonusValue !== 1 ? 's' : ''}`}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {event._count.bonuses} employees
                  </TableCell>
                  {canManage && (
                    <TableCell>
                      <DeleteFestivalButton id={event.id} />
                    </TableCell>
                  )}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollableTableRegion>
      )}
    </ListPageScrollRoot>
  )
}
