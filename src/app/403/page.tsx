import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center">
      <div className="text-center space-y-4">
        <p className="text-6xl font-bold text-muted-foreground">403</p>
        <h1 className="text-2xl font-semibold">Access Denied</h1>
        <p className="text-muted-foreground">
          You don&apos;t have permission to view this page.
        </p>
        <Button render={<Link href="/dashboard" />}>Go to Dashboard</Button>
      </div>
    </div>
  )
}
