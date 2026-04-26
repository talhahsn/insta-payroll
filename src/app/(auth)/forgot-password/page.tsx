'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { getPublicSiteUrl } from '@/lib/site-url'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) {
      toast.error('Enter your email address')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const origin = getPublicSiteUrl()
      const redirectTo = `${origin}/auth/callback?next=${encodeURIComponent('/auth/reset-password')}`

      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })
      if (error) {
        toast.error(error.message)
        return
      }
      setSent(true)
      toast.success('If that email has an account, a reset link is on the way.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              IP
            </div>
            <CardTitle className="text-2xl">Check your email</CardTitle>
            <CardDescription>
              We sent a link to {email} if that address is registered. The link expires after a
              short time.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" className="w-full" render={<Link href="/login" />}>
              Back to sign in
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
            IP
          </div>
          <CardTitle className="text-2xl">Reset password</CardTitle>
          <CardDescription>We will email you a link to set a new password</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Sending…' : 'Send reset link'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" render={<Link href="/login" />}>
              Back to sign in
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
