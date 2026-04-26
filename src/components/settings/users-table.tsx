'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Plus, Trash2 } from 'lucide-react'
import type { Role } from '@prisma/client'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { TABLE_HEADER_STICKY } from '@/components/ui/table-header-classname'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { ScrollableTableRegion } from '@/components/layout/list-page-layout'

interface UserWithRole {
  id: string
  name: string
  email: string
  roleId: string
  role: Role
}

interface Props {
  users: UserWithRole[]
  roles: Role[]
  currentUserId: string
  isProtectedRole: boolean
}

export function UsersTable({ users, roles, currentUserId, isProtectedRole }: Props) {
  const router = useRouter()
  const [loadingId, setLoadingId] = useState<string | null>(null)
  const [addOpen, setAddOpen] = useState(false)
  const [addSaving, setAddSaving] = useState(false)
  const [addForm, setAddForm] = useState({ name: '', email: '', password: '', roleId: '' })

  function setField(key: keyof typeof addForm) {
    return (e: React.ChangeEvent<HTMLInputElement>) =>
      setAddForm((f) => ({ ...f, [key]: e.target.value }))
  }

  async function changeRole(userId: string, roleId: string) {
    setLoadingId(userId + 'role')
    try {
      const res = await fetch(`/api/settings/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roleId }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to update role')
        return
      }
      toast.success('Role updated')
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function deleteUser(user: UserWithRole) {
    if (!confirm(`Delete user "${user.name}"? This cannot be undone.`)) return
    setLoadingId(user.id + 'delete')
    try {
      const res = await fetch(`/api/settings/users/${user.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to delete user')
        return
      }
      toast.success(`${user.name} removed`)
      router.refresh()
    } finally {
      setLoadingId(null)
    }
  }

  async function addUser() {
    if (!addForm.name || !addForm.email || !addForm.password || !addForm.roleId) {
      toast.error('All fields are required')
      return
    }
    if (addForm.password.length < 8) {
      toast.error('Password must be at least 8 characters')
      return
    }
    setAddSaving(true)
    try {
      const res = await fetch('/api/settings/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(addForm),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to add user')
        return
      }
      toast.success(`${addForm.name} added`)
      setAddOpen(false)
      setAddForm({ name: '', email: '', password: '', roleId: '' })
      router.refresh()
    } finally {
      setAddSaving(false)
    }
  }

  function canEditUser(user: UserWithRole) {
    if (user.id === currentUserId) return false
    if (user.role.isProtected && !isProtectedRole) return false
    return true
  }

  function availableRoles(user: UserWithRole) {
    if (isProtectedRole) return roles
    return roles.filter((r) => !r.isProtected || r.id === user.roleId)
  }

  // Roles available for new user — non-Super-Admin cannot assign protected roles
  const newUserRoles = isProtectedRole ? roles : roles.filter((r) => !r.isProtected)

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col gap-4 overflow-hidden">
      <div className="flex shrink-0 justify-end">
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add User
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle>Add User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input value={addForm.name} onChange={setField('name')} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input type="email" value={addForm.email} onChange={setField('email')} autoComplete="off" />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={addForm.password} onChange={setField('password')} autoComplete="new-password" />
              </div>
              <div className="space-y-2">
                <Label>Role</Label>
                <Select value={addForm.roleId} onValueChange={(v) => setAddForm((f) => ({ ...f, roleId: v ?? '' }))} items={newUserRoles.map((r) => ({ value: r.id, label: r.name }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    {newUserRoles.map((r) => (
                      <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={addUser} disabled={addSaving} className="w-full">
                {addSaving ? 'Adding…' : 'Add User'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <ScrollableTableRegion>
        <Table>
          <TableHeader className={TABLE_HEADER_STICKY}>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead className="w-48" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.id}>
                <TableCell className="font-medium">
                  {u.name}
                  {u.id === currentUserId && (
                    <span className="text-muted-foreground text-xs ml-2">(you)</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-sm">{u.email}</TableCell>
                <TableCell>
                  <Badge variant={u.role.isProtected ? 'default' : 'secondary'}>
                    {u.role.name}
                  </Badge>
                </TableCell>
                <TableCell>
                  {canEditUser(u) && (
                    <div className="flex items-center gap-2">
                      <Select
                        value={u.roleId}
                        onValueChange={(roleId) => roleId && changeRole(u.id, roleId)}
                        disabled={loadingId === u.id + 'role'}
                        items={availableRoles(u).map((r) => ({ value: r.id, label: r.name }))}
                      >
                        <SelectTrigger className="h-8 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableRoles(u).map((r) => (
                            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-destructive h-8 w-8 p-0 shrink-0"
                        onClick={() => deleteUser(u)}
                        disabled={loadingId === u.id + 'delete'}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollableTableRegion>
    </div>
  )
}
