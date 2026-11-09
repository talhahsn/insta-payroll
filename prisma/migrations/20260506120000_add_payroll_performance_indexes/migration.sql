-- Performance indexes for payroll roster and related month views.
-- Safe to re-run with IF NOT EXISTS.

CREATE INDEX IF NOT EXISTS monthly_payrolls_restaurant_month_idx
  ON monthly_payrolls ("restaurantId", month);

CREATE INDEX IF NOT EXISTS leaves_monthlyPayrollId_idx
  ON leaves ("monthlyPayrollId");

CREATE INDEX IF NOT EXISTS advances_monthlyPayrollId_idx
  ON advances ("monthlyPayrollId");

CREATE INDEX IF NOT EXISTS shift_coverages_payrollIdCovering_idx
  ON shift_coverages ("payrollIdCovering");

CREATE INDEX IF NOT EXISTS shift_coverages_payrollIdAbsent_idx
  ON shift_coverages ("payrollIdAbsent");

CREATE INDEX IF NOT EXISTS festival_bonuses_monthlyPayrollId_idx
  ON festival_bonuses ("monthlyPayrollId");

CREATE INDEX IF NOT EXISTS salary_holds_employee_heldForMonth_idx
  ON salary_holds ("employeeId", "heldForMonth");

CREATE INDEX IF NOT EXISTS salary_history_employee_effectiveFrom_idx
  ON salary_history ("employeeId", "effectiveFrom" DESC);

CREATE INDEX IF NOT EXISTS employees_restaurant_status_joined_idx
  ON employees ("restaurantId", status, "joinedAt");

CREATE INDEX IF NOT EXISTS employees_restaurant_status_left_idx
  ON employees ("restaurantId", status, "leftAt");
