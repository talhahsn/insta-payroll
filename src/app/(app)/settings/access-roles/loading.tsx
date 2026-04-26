import { SettingsPageHeaderSkeleton } from '@/components/ui/data-table-skeleton'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export default function AccessRolesLoading() {
  return (
    <div className="max-w-3xl space-y-6">
      <SettingsPageHeaderSkeleton />
      {Array.from({ length: 3 }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-full max-w-md" />
          </CardHeader>
          <CardContent className="space-y-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <Skeleton key={j} className="h-9 w-full" />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
