/**
 * One row in the paged employees API (`/api/employees?paged=1`) and the employees data table.
 */
export type PagedEmployeeRow = {
  id: string
  name: string
  employeeCode: string | null
  joinedAt: string
  currentSalary: number
  status: 'ACTIVE' | 'INACTIVE'
  employeeType: { name: string }
  jobRoles: { jobRole: { name: string } }[]
}
