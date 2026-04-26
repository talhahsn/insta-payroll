import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { toApiError } from '@/lib/errors'
import * as service from '@/services/employee.service'
import { z } from 'zod'

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  employeeTypeId: z.string().optional(),
  jobRoleIds: z.array(z.string()).optional(),
  currentSalary: z.number().positive().optional(),
  depositDaysM1: z.number().int().min(0).optional(),
  depositDaysM2: z.number().int().min(0).optional(),
  billingCycleDay: z.number().int().min(1).max(31).nullable().optional(),
  notes: z.string().optional(),
})

const salarySchema = z.object({
  action: z.literal('update-salary'),
  newSalary: z.number().positive(),
  effectiveFrom: z.string().transform((v) => new Date(v)),
})

const leftSchema = z.object({
  action: z.literal('mark-left'),
  leftAt: z.string().transform((v) => new Date(v)),
})

const toggleStatusSchema = z.object({
  action: z.literal('toggle-status'),
})

const actionSchema = z.discriminatedUnion('action', [salarySchema, leftSchema, toggleStatusSchema])

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    const { id } = await params
    const employee = await service.getEmployee(id, user)
    return NextResponse.json(employee)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const user = await getAuthUser()
    const { id } = await params
    const rawBody = await req.json()

    // Check if this is an action call
    const actionResult = actionSchema.safeParse(rawBody)
    if (actionResult.success) {
      const data = actionResult.data
      if (data.action === 'update-salary') {
        const employee = await service.updateSalary(id, data.newSalary, data.effectiveFrom, user)
        return NextResponse.json(employee)
      }
      if (data.action === 'mark-left') {
        const employee = await service.markEmployeeLeft(id, data.leftAt, user)
        return NextResponse.json(employee)
      }
      if (data.action === 'toggle-status') {
        const employee = await service.toggleEmployeeStatus(id, user)
        return NextResponse.json(employee)
      }
    }

    // Regular update
    const body = updateSchema.parse(rawBody)
    const employee = await service.updateEmployee(id, body, user)
    return NextResponse.json(employee)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
