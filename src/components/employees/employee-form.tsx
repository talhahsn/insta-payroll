'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Employee, EmployeeType, JobRole, EmployeeJobRole } from '@prisma/client'

interface Props {
  employee?: Employee & {
    employeeType: EmployeeType
    jobRoles: Array<EmployeeJobRole & { jobRole: JobRole }>
  }
  employeeTypes: EmployeeType[]
  jobRoles: JobRole[]
  canUpdateSalary?: boolean
}

export function EmployeeForm({ employee, employeeTypes, jobRoles, canUpdateSalary = false }: Props) {
  const router = useRouter()
  const isEdit = !!employee

  const [loading, setLoading] = useState(false)
  const [name, setName] = useState(employee?.name ?? '')
  const [phone, setPhone] = useState(employee?.phone ?? '')
  const [employeeTypeId, setEmployeeTypeId] = useState(employee?.employeeTypeId ?? '')
  const [jobRoleIds, setJobRoleIds] = useState<string[]>(
    employee?.jobRoles.map((jr) => jr.jobRoleId) ?? []
  )

  function toggleJobRole(id: string) {
    setJobRoleIds((prev) => (prev.includes(id) ? prev.filter((r) => r !== id) : [...prev, id]))
  }
  const [joinedAt, setJoinedAt] = useState(
    employee ? employee.joinedAt.toISOString().split('T')[0] : ''
  )
  const [currentSalary, setCurrentSalary] = useState(String(employee?.currentSalary ?? ''))
  const [depositDaysM1, setDepositDaysM1] = useState(String(employee?.depositDaysM1 ?? 7))
  const [depositDaysM2, setDepositDaysM2] = useState(String(employee?.depositDaysM2 ?? 7))
  const [billingCycleDay, setBillingCycleDay] = useState(
    String(employee?.billingCycleDay ?? '')
  )
  const [notes, setNotes] = useState(employee?.notes ?? '')

  const selectedType = employeeTypes.find((t) => t.id === employeeTypeId)
  const isVendor = selectedType?.hasBillingCycle ?? false
  const hasDeposit = selectedType?.isDepositEligible ?? false

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const payload = {
        name,
        phone: phone || undefined,
        employeeTypeId,
        jobRoleIds,
        joinedAt,
        currentSalary: parseFloat(currentSalary),
        depositDaysM1: parseInt(depositDaysM1),
        depositDaysM2: parseInt(depositDaysM2),
        billingCycleDay: billingCycleDay ? parseInt(billingCycleDay) : undefined,
        notes: notes || undefined,
      }

      const url = isEdit ? `/api/employees/${employee.id}` : '/api/employees'
      const method = isEdit ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const err = await res.json()
        toast.error(err.error ?? 'Failed to save employee')
        return
      }

      toast.success(isEdit ? 'Employee updated' : 'Employee added')
      router.push('/employees')
      router.refresh()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card>
        <CardContent className="pt-6 space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Bilawal Ahmed"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. 0300-1234567"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="employeeType">Employee Type *</Label>
              <Select
                value={employeeTypeId}
                onValueChange={(v) => setEmployeeTypeId(v ?? '')}
                required
                items={employeeTypes.map((t) => ({ value: t.id, label: t.name }))}
              >
                <SelectTrigger id="employeeType">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {employeeTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2 sm:col-span-2">
              <Label>Job Roles</Label>
              <div className="grid grid-cols-2 gap-1 rounded-lg border p-3 sm:grid-cols-3">
                {jobRoles.map((r) => (
                  <label
                    key={r.id}
                    className="flex cursor-pointer items-center gap-2 rounded px-2 py-1.5 text-sm hover:bg-muted/50"
                  >
                    <input
                      type="checkbox"
                      checked={jobRoleIds.includes(r.id)}
                      onChange={() => toggleJobRole(r.id)}
                      className="h-4 w-4 accent-primary"
                    />
                    {r.name}
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="joinedAt">Joining Date *</Label>
              <Input
                id="joinedAt"
                type="date"
                value={joinedAt}
                onChange={(e) => setJoinedAt(e.target.value)}
                required
                disabled={isEdit}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="salary">Monthly Salary (PKR) *</Label>
              <Input
                id="salary"
                type="number"
                value={currentSalary}
                onChange={(e) => setCurrentSalary(e.target.value)}
                placeholder="e.g. 30000"
                min={1}
                required
                disabled={isEdit && !canUpdateSalary}
              />
              {isEdit && !canUpdateSalary && (
                <p className="text-xs text-muted-foreground">
                  Only Super Admin can update salary.
                </p>
              )}
            </div>

            {isVendor && (
              <div className="space-y-2">
                <Label htmlFor="billingDay">Billing Cycle Start Day</Label>
                <Input
                  id="billingDay"
                  type="number"
                  value={billingCycleDay}
                  onChange={(e) => setBillingCycleDay(e.target.value)}
                  placeholder="e.g. 10"
                  min={1}
                  max={31}
                />
              </div>
            )}
          </div>

          {hasDeposit && !isEdit && (
            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <Label htmlFor="depositM1">Security Deposit — Month 1 (days)</Label>
                <Input
                  id="depositM1"
                  type="number"
                  value={depositDaysM1}
                  onChange={(e) => setDepositDaysM1(e.target.value)}
                  min={0}
                  max={30}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="depositM2">Security Deposit — Month 2 (days)</Label>
                <Input
                  id="depositM2"
                  type="number"
                  value={depositDaysM2}
                  onChange={(e) => setDepositDaysM2(e.target.value)}
                  min={0}
                  max={30}
                />
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any additional notes..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={loading}>
          {loading ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Employee'}
        </Button>
      </div>
    </form>
  )
}
