import { NextRequest, NextResponse } from 'next/server'
import { getAuthUser } from '@/lib/auth'
import { toApiError } from '@/lib/errors'
import { can } from '@/lib/permissions'
import type { EmployeeSortField } from '@/repositories/employee.repository'
import * as service from '@/services/employee.service'
import { z } from 'zod'

const createSchema = z.object({
  name: z.string().min(1),
  phone: z.string().optional(),
  employeeTypeId: z.string(),
  jobRoleIds: z.array(z.string()).optional(),
  joinedAt: z.string().transform((v) => new Date(v)),
  currentSalary: z.number().positive(),
  depositDaysM1: z.number().int().min(0).optional(),
  depositDaysM2: z.number().int().min(0).optional(),
  billingCycleDay: z.number().int().min(1).max(31).optional(),
  notes: z.string().optional(),
})

const sortSchema = z.enum(['name', 'salary', 'joined'])

export async function GET(req: NextRequest) {
  try {
    const user = await getAuthUser()
    if (!can(user, 'employees', 'view')) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const sp = req.nextUrl.searchParams
    const paged = sp.get('paged') === '1' || sp.get('paged') === 'true'

    if (paged) {
      const statusParam = sp.get('status') ?? 'active'
      const statusFilter =
        statusParam === 'inactive' ? false : statusParam === 'all' ? undefined : true
      const sort = (sortSchema.safeParse(sp.get('sort')).data ?? 'name') as EmployeeSortField
      const order = sp.get('order') === 'desc' ? 'desc' : 'asc'
      const page = Math.max(1, parseInt(sp.get('page') ?? '1', 10) || 1)
      const pageSize = Math.min(100, Math.max(1, parseInt(sp.get('pageSize') ?? '25', 10) || 25))
      const q = sp.get('q') ?? undefined

      const { rows, total } = await service.getEmployeesPage(user, statusFilter, {
        q,
        sort,
        order,
        page,
        pageSize,
      })
      return NextResponse.json({ employees: rows, total, page, pageSize })
    }

    const includeInactive = sp.get('includeInactive') === 'true'
    const employees = await service.getEmployees(user, includeInactive)
    return NextResponse.json(employees)
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getAuthUser()
    const body = createSchema.parse(await req.json())
    const employee = await service.createEmployee(
      { ...body, restaurantId: user.restaurantId },
      user
    )
    return NextResponse.json(employee, { status: 201 })
  } catch (err) {
    const { status, body } = toApiError(err)
    return NextResponse.json(body, { status })
  }
}
