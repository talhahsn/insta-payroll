'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'

export default function ResetPasswordPage() {
  const router = useRouter()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const [hasSession, setHasSession] = useState(false)

  useEffect(() => {
    const supabase = createClient()
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      setHasSession(!!session)
      setReady(true)
    })()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setHasSession(true)
        setReady(true)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      toast.error('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.updateUser({ password })
      if (error) {
        toast.error(error.message)
        return
      }
      toast.success('Password updated')
      router.push('/dashboard')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30 p-4">
        <p className="text-muted-foreground text-sm">Loading…</p>
      </div>
    )
  }

  if (!hasSession) {
    return (
      <div className="flex min-h-0 flex-1 items-center justify-center bg-muted/30 p-4">
        <Card className="w-full max-w-sm">
          <CardHeader className="text-center">
            <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground font-bold text-lg">
              IP
            </div>
            <CardTitle className="text-2xl">Link invalid or expired</CardTitle>
            <CardDescription>
              Open the reset link from your email, or request a new one. If you just clicked the
              link, try again or contact your admin.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Button className="w-full" render={<Link href="/forgot-password" />}>
              Request a new link
            </Button>
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
          <CardTitle className="text-2xl">Set new password</CardTitle>
          <CardDescription>Choose a strong password for your account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="password">New password</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="confirm">Confirm password</Label>
              <Input
                id="confirm"
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                required
                minLength={8}
                autoComplete="new-password"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Saving…' : 'Update password'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              className="w-full"
              render={<Link href="/login" />}
            >
              Cancel
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
