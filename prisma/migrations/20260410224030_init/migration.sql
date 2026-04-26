-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('PARTNER', 'MANAGER');

-- CreateEnum
CREATE TYPE "EmployeeStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "PayrollStatus" AS ENUM ('PENDING', 'PARTIALLY_PAID', 'DONE');

-- CreateEnum
CREATE TYPE "AdvanceType" AS ENUM ('CASH', 'FOOD');

-- CreateEnum
CREATE TYPE "BonusType" AS ENUM ('FIXED', 'DAYS_SALARY');

-- CreateTable
CREATE TABLE "restaurants" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "restaurants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "supabaseUid" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'MANAGER',
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employee_types" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isDailyRate" BOOLEAN NOT NULL DEFAULT true,
    "isLeaveEligible" BOOLEAN NOT NULL DEFAULT true,
    "isDepositEligible" BOOLEAN NOT NULL DEFAULT true,
    "isHiddenFromManager" BOOLEAN NOT NULL DEFAULT false,
    "hasBillingCycle" BOOLEAN NOT NULL DEFAULT false,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "job_roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "job_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "counters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "counters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "employees" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "employeeTypeId" TEXT NOT NULL,
    "jobRoleId" TEXT,
    "status" "EmployeeStatus" NOT NULL DEFAULT 'ACTIVE',
    "joinedAt" TIMESTAMP(3) NOT NULL,
    "leftAt" TIMESTAMP(3),
    "currentSalary" DOUBLE PRECISION NOT NULL,
    "leaveBalance" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "depositDaysM1" INTEGER NOT NULL DEFAULT 7,
    "depositDaysM2" INTEGER NOT NULL DEFAULT 7,
    "billingCycleDay" INTEGER,
    "notes" TEXT,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employees_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "salary_history" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "effectiveFrom" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "salary_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "monthly_payrolls" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "baseSalary" DOUBLE PRECISION NOT NULL,
    "status" "PayrollStatus" NOT NULL DEFAULT 'PENDING',
    "amountPaid" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "lockedAt" TIMESTAMP(3),
    "lockedById" TEXT,
    "unlockReason" TEXT,
    "unlockedAt" TIMESTAMP(3),
    "unlockedById" TEXT,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "monthly_payrolls_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "leaves" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "monthlyPayrollId" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "isHalfDay" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leaves_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "advances" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "monthlyPayrollId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "type" "AdvanceType" NOT NULL DEFAULT 'CASH',
    "date" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "advances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shift_coverages" (
    "id" TEXT NOT NULL,
    "absentEmployeeId" TEXT NOT NULL,
    "coveringEmployeeId" TEXT NOT NULL,
    "counterId" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "ratePerDay" DOUBLE PRECISION NOT NULL,
    "payrollIdAbsent" TEXT NOT NULL,
    "payrollIdCovering" TEXT NOT NULL,
    "createdById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shift_coverages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "security_deposits" (
    "id" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "month1PayrollId" TEXT,
    "month1Withheld" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "month2PayrollId" TEXT,
    "month2Withheld" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalWithheld" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "releasedAt" TIMESTAMP(3),
    "releasedInPayrollId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "security_deposits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festival_events" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "eventDate" TIMESTAMP(3) NOT NULL,
    "bonusType" "BonusType" NOT NULL,
    "bonusValue" DOUBLE PRECISION NOT NULL,
    "appliesToMonth" TIMESTAMP(3) NOT NULL,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "festival_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "festival_bonuses" (
    "id" TEXT NOT NULL,
    "festivalEventId" TEXT NOT NULL,
    "monthlyPayrollId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "festival_bonuses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disbursements" (
    "id" TEXT NOT NULL,
    "monthlyPayrollId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "paidAt" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "recordedById" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "disbursements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "oldValue" JSONB,
    "newValue" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "restaurants_slug_key" ON "restaurants"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "users_supabaseUid_key" ON "users"("supabaseUid");

-- CreateIndex
CREATE UNIQUE INDEX "employee_types_name_restaurantId_key" ON "employee_types"("name", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "job_roles_name_restaurantId_key" ON "job_roles"("name", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "counters_name_restaurantId_key" ON "counters"("name", "restaurantId");

-- CreateIndex
CREATE UNIQUE INDEX "monthly_payrolls_employeeId_month_key" ON "monthly_payrolls"("employeeId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "security_deposits_employeeId_key" ON "security_deposits"("employeeId");

-- CreateIndex
CREATE UNIQUE INDEX "security_deposits_month1PayrollId_key" ON "security_deposits"("month1PayrollId");

-- CreateIndex
CREATE UNIQUE INDEX "security_deposits_month2PayrollId_key" ON "security_deposits"("month2PayrollId");

-- CreateIndex
CREATE UNIQUE INDEX "security_deposits_releasedInPayrollId_key" ON "security_deposits"("releasedInPayrollId");

-- CreateIndex
CREATE UNIQUE INDEX "festival_bonuses_festivalEventId_monthlyPayrollId_key" ON "festival_bonuses"("festivalEventId", "monthlyPayrollId");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employee_types" ADD CONSTRAINT "employee_types_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "job_roles" ADD CONSTRAINT "job_roles_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "counters" ADD CONSTRAINT "counters_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_employeeTypeId_fkey" FOREIGN KEY ("employeeTypeId") REFERENCES "employee_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_jobRoleId_fkey" FOREIGN KEY ("jobRoleId") REFERENCES "job_roles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "employees" ADD CONSTRAINT "employees_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "salary_history" ADD CONSTRAINT "salary_history_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_lockedById_fkey" FOREIGN KEY ("lockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_unlockedById_fkey" FOREIGN KEY ("unlockedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "monthly_payrolls" ADD CONSTRAINT "monthly_payrolls_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_monthlyPayrollId_fkey" FOREIGN KEY ("monthlyPayrollId") REFERENCES "monthly_payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "leaves" ADD CONSTRAINT "leaves_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_monthlyPayrollId_fkey" FOREIGN KEY ("monthlyPayrollId") REFERENCES "monthly_payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "advances" ADD CONSTRAINT "advances_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_coverages" ADD CONSTRAINT "shift_coverages_absentEmployeeId_fkey" FOREIGN KEY ("absentEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_coverages" ADD CONSTRAINT "shift_coverages_coveringEmployeeId_fkey" FOREIGN KEY ("coveringEmployeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_coverages" ADD CONSTRAINT "shift_coverages_counterId_fkey" FOREIGN KEY ("counterId") REFERENCES "counters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_coverages" ADD CONSTRAINT "shift_coverages_payrollIdAbsent_fkey" FOREIGN KEY ("payrollIdAbsent") REFERENCES "monthly_payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_coverages" ADD CONSTRAINT "shift_coverages_payrollIdCovering_fkey" FOREIGN KEY ("payrollIdCovering") REFERENCES "monthly_payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shift_coverages" ADD CONSTRAINT "shift_coverages_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_month1PayrollId_fkey" FOREIGN KEY ("month1PayrollId") REFERENCES "monthly_payrolls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_month2PayrollId_fkey" FOREIGN KEY ("month2PayrollId") REFERENCES "monthly_payrolls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "security_deposits" ADD CONSTRAINT "security_deposits_releasedInPayrollId_fkey" FOREIGN KEY ("releasedInPayrollId") REFERENCES "monthly_payrolls"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festival_events" ADD CONSTRAINT "festival_events_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festival_bonuses" ADD CONSTRAINT "festival_bonuses_festivalEventId_fkey" FOREIGN KEY ("festivalEventId") REFERENCES "festival_events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "festival_bonuses" ADD CONSTRAINT "festival_bonuses_monthlyPayrollId_fkey" FOREIGN KEY ("monthlyPayrollId") REFERENCES "monthly_payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_monthlyPayrollId_fkey" FOREIGN KEY ("monthlyPayrollId") REFERENCES "monthly_payrolls"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disbursements" ADD CONSTRAINT "disbursements_recordedById_fkey" FOREIGN KEY ("recordedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
