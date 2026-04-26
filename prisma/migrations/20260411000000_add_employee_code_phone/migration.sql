-- AlterTable: add phone and employeeCode to employees
ALTER TABLE "employees" ADD COLUMN "phone" TEXT;
ALTER TABLE "employees" ADD COLUMN "employeeCode" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "employees_employeeCode_key" ON "employees"("employeeCode");
