import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  const response = await updateSession(request)
  // Forward pathname so app layout can enforce route-level permissions server-side
  if (response instanceof NextResponse) {
    response.headers.set('x-pathname', request.nextUrl.pathname)
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
