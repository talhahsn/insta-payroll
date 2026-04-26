-- Migration: add restaurantId to all child tables for strict multi-tenancy
-- Tables: salary_history, leaves, advances, shift_coverages,
--         security_deposits, festival_bonuses, disbursements, audit_logs
--
-- Strategy per table:
--   1. Add column as nullable
--   2. Backfill from nearest related table (salary_history has existing rows;
--      the rest are expected to be empty at this point in the project)
--   3. Set NOT NULL
--   4. Add FK constraint + index

-- ── salary_history ────────────────────────────────────────────────────────────
ALTER TABLE "salary_history" ADD COLUMN "restaurantId" TEXT;

UPDATE "salary_history"
SET "restaurantId" = (
  SELECT "restaurantId" FROM "employees"
  WHERE "employees"."id" = "salary_history"."employeeId"
);

ALTER TABLE "salary_history" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "salary_history"
  ADD CONSTRAINT "salary_history_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "salary_history_restaurantId_idx" ON "salary_history"("restaurantId");

-- ── leaves ────────────────────────────────────────────────────────────────────
ALTER TABLE "leaves" ADD COLUMN "restaurantId" TEXT;

UPDATE "leaves"
SET "restaurantId" = (
  SELECT "restaurantId" FROM "monthly_payrolls"
  WHERE "monthly_payrolls"."id" = "leaves"."monthlyPayrollId"
);

ALTER TABLE "leaves" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "leaves"
  ADD CONSTRAINT "leaves_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "leaves_restaurantId_idx" ON "leaves"("restaurantId");

-- ── advances ──────────────────────────────────────────────────────────────────
ALTER TABLE "advances" ADD COLUMN "restaurantId" TEXT;

UPDATE "advances"
SET "restaurantId" = (
  SELECT "restaurantId" FROM "monthly_payrolls"
  WHERE "monthly_payrolls"."id" = "advances"."monthlyPayrollId"
);

ALTER TABLE "advances" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "advances"
  ADD CONSTRAINT "advances_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "advances_restaurantId_idx" ON "advances"("restaurantId");

-- ── shift_coverages ───────────────────────────────────────────────────────────
ALTER TABLE "shift_coverages" ADD COLUMN "restaurantId" TEXT;

UPDATE "shift_coverages"
SET "restaurantId" = (
  SELECT "restaurantId" FROM "monthly_payrolls"
  WHERE "monthly_payrolls"."id" = "shift_coverages"."payrollIdAbsent"
);

ALTER TABLE "shift_coverages" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "shift_coverages"
  ADD CONSTRAINT "shift_coverages_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "shift_coverages_restaurantId_idx" ON "shift_coverages"("restaurantId");

-- ── security_deposits ─────────────────────────────────────────────────────────
ALTER TABLE "security_deposits" ADD COLUMN "restaurantId" TEXT;

UPDATE "security_deposits"
SET "restaurantId" = (
  SELECT "restaurantId" FROM "employees"
  WHERE "employees"."id" = "security_deposits"."employeeId"
);

ALTER TABLE "security_deposits" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "security_deposits"
  ADD CONSTRAINT "security_deposits_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "security_deposits_restaurantId_idx" ON "security_deposits"("restaurantId");

-- ── festival_bonuses ──────────────────────────────────────────────────────────
ALTER TABLE "festival_bonuses" ADD COLUMN "restaurantId" TEXT;

UPDATE "festival_bonuses"
SET "restaurantId" = (
  SELECT "restaurantId" FROM "festival_events"
  WHERE "festival_events"."id" = "festival_bonuses"."festivalEventId"
);

ALTER TABLE "festival_bonuses" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "festival_bonuses"
  ADD CONSTRAINT "festival_bonuses_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "festival_bonuses_restaurantId_idx" ON "festival_bonuses"("restaurantId");

-- ── disbursements ─────────────────────────────────────────────────────────────
ALTER TABLE "disbursements" ADD COLUMN "restaurantId" TEXT;

UPDATE "disbursements"
SET "restaurantId" = (
  SELECT "restaurantId" FROM "monthly_payrolls"
  WHERE "monthly_payrolls"."id" = "disbursements"."monthlyPayrollId"
);

ALTER TABLE "disbursements" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "disbursements"
  ADD CONSTRAINT "disbursements_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "disbursements_restaurantId_idx" ON "disbursements"("restaurantId");

-- ── audit_logs ────────────────────────────────────────────────────────────────
ALTER TABLE "audit_logs" ADD COLUMN "restaurantId" TEXT;

UPDATE "audit_logs"
SET "restaurantId" = (
  SELECT "restaurantId" FROM "users"
  WHERE "users"."id" = "audit_logs"."userId"
);

ALTER TABLE "audit_logs" ALTER COLUMN "restaurantId" SET NOT NULL;

ALTER TABLE "audit_logs"
  ADD CONSTRAINT "audit_logs_restaurantId_fkey"
  FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE INDEX "audit_logs_restaurantId_idx" ON "audit_logs"("restaurantId");
