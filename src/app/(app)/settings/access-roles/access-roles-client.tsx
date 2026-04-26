'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Shield, Users, Trash2, Plus } from 'lucide-react'
import type { Role, RolePermission } from '@prisma/client'
import { PERMISSIONS } from '@/lib/permissions'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

type RoleWithPerms = Role & { permissions: RolePermission[]; _count: { users: number } }

const PERMISSION_GROUPS = [
  {
    label: 'Employees',
    perms: [
      { key: PERMISSIONS.EMPLOYEES_VIEW, label: 'View employees' },
      { key: PERMISSIONS.EMPLOYEES_VIEW_ALL, label: 'View restricted types (partners)' },
      { key: PERMISSIONS.EMPLOYEES_MANAGE, label: 'Add / edit / deactivate employees' },
    ],
  },
  {
    label: 'Payroll',
    perms: [
      { key: PERMISSIONS.PAYROLL_VIEW, label: 'View payroll' },
      { key: PERMISSIONS.PAYROLL_RECORD_PAYMENT, label: 'Record payments' },
      { key: PERMISSIONS.PAYROLL_EXPORT, label: 'Export PDF' },
    ],
  },
  {
    label: 'Leaves',
    perms: [
      { key: PERMISSIONS.LEAVES_VIEW, label: 'View leaves' },
      { key: PERMISSIONS.LEAVES_MANAGE, label: 'Add / delete leaves' },
    ],
  },
  {
    label: 'Advances',
    perms: [
      { key: PERMISSIONS.ADVANCES_VIEW, label: 'View advances' },
      { key: PERMISSIONS.ADVANCES_MANAGE, label: 'Add / delete advances' },
    ],
  },
  {
    label: 'Coverage',
    perms: [
      { key: PERMISSIONS.COVERAGE_VIEW, label: 'View shift coverage' },
      { key: PERMISSIONS.COVERAGE_MANAGE, label: 'Add / delete coverage' },
    ],
  },
  {
    label: 'Festivals',
    perms: [
      { key: PERMISSIONS.FESTIVALS_VIEW, label: 'View festivals' },
      { key: PERMISSIONS.FESTIVALS_MANAGE, label: 'Create / delete festivals' },
    ],
  },
  {
    label: 'Settings',
    perms: [
      { key: PERMISSIONS.SETTINGS_VIEW, label: 'View settings' },
      { key: PERMISSIONS.SETTINGS_MANAGE, label: 'Manage settings + users + roles' },
    ],
  },
]

interface Props {
  roles: RoleWithPerms[]
  isProtectedRole: boolean
}

export function AccessRolesClient({ roles, isProtectedRole }: Props) {
  const router = useRouter()
  const [createOpen, setCreateOpen] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createDesc, setCreateDesc] = useState('')
  const [createPerms, setCreatePerms] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [togglingId, setTogglingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  function rolePermSet(role: RoleWithPerms) {
    return new Set(role.permissions.map((p) => `${p.resource}.${p.action}`))
  }

  async function togglePermission(role: RoleWithPerms, perm: string) {
    if (role.isProtected && !isProtectedRole) return
    const current = rolePermSet(role)
    const next = new Set(current)
    if (next.has(perm)) next.delete(perm)
    else next.add(perm)

    setTogglingId(role.id + perm)
    try {
      const res = await fetch(`/api/settings/access-roles/${role.id}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ permissions: Array.from(next) }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to update permissions')
        return
      }
      router.refresh()
    } finally {
      setTogglingId(null)
    }
  }

  async function deleteRole(role: RoleWithPerms) {
    if (role._count.users > 0) {
      toast.error(`Cannot delete — ${role._count.users} user(s) assigned to this role`)
      return
    }
    if (!confirm(`Delete role "${role.name}"? This cannot be undone.`)) return
    setDeletingId(role.id)
    try {
      const res = await fetch(`/api/settings/access-roles/${role.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to delete role')
        return
      }
      toast.success(`Role "${role.name}" deleted`)
      router.refresh()
    } finally {
      setDeletingId(null)
    }
  }

  async function createRole() {
    if (!createName.trim()) { toast.error('Name is required'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/settings/access-roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName.trim(),
          description: createDesc.trim() || undefined,
          permissions: Array.from(createPerms),
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to create role')
        return
      }
      toast.success(`Role "${createName}" created`)
      setCreateOpen(false)
      setCreateName('')
      setCreateDesc('')
      setCreatePerms(new Set())
      router.refresh()
    } finally {
      setSaving(false)
    }
  }

  function toggleCreatePerm(perm: string) {
    setCreatePerms((prev) => {
      const next = new Set(prev)
      if (next.has(perm)) next.delete(perm)
      else next.add(perm)
      return next
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger>
            <Button size="sm">
              <Plus className="h-4 w-4 mr-2" />
              New Role
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create Role</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 mt-2">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={createName} onChange={(e) => setCreateName(e.target.value)} placeholder="e.g. Cashier" />
              </div>
              <div className="space-y-2">
                <Label>Description <span className="text-muted-foreground">(optional)</span></Label>
                <Input value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} placeholder="What this role can do" />
              </div>
              <div className="space-y-3">
                <Label>Permissions</Label>
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">{group.label}</p>
                    <div className="space-y-1">
                      {group.perms.map((p) => (
                        <label key={p.key} className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={createPerms.has(p.key)}
                            onChange={() => toggleCreatePerm(p.key)}
                            className="rounded"
                          />
                          <span className="text-sm">{p.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              <Button onClick={createRole} disabled={saving} className="w-full">
                {saving ? 'Creating…' : 'Create Role'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {roles.map((role) => {
        const permSet = rolePermSet(role)
        const canEdit = !role.isProtected || isProtectedRole

        return (
          <Card key={role.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {role.isProtected && <Shield className="h-4 w-4 text-primary" />}
                  <CardTitle className="text-base">{role.name}</CardTitle>
                  {role.isProtected && (
                    <Badge variant="default" className="text-xs">Protected</Badge>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {role._count.users} user{role._count.users !== 1 ? 's' : ''}
                  </span>
                  {!role.isProtected && isProtectedRole && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive h-7 w-7 p-0"
                      onClick={() => deleteRole(role)}
                      disabled={deletingId === role.id}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              {role.description && (
                <CardDescription>{role.description}</CardDescription>
              )}
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
                {PERMISSION_GROUPS.map((group) => (
                  <div key={group.label}>
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1.5">{group.label}</p>
                    <div className="space-y-1">
                      {group.perms.map((p) => {
                        const active = permSet.has(p.key)
                        const toggling = togglingId === role.id + p.key
                        return (
                          <label
                            key={p.key}
                            className={`flex items-center gap-2 ${canEdit ? 'cursor-pointer' : 'cursor-default opacity-70'}`}
                          >
                            <input
                              type="checkbox"
                              checked={active}
                              onChange={() => canEdit && togglePermission(role, p.key)}
                              disabled={!canEdit || toggling}
                              className="rounded"
                            />
                            <span className="text-sm">{p.label}</span>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )
      })}
    </div>
  )
}
