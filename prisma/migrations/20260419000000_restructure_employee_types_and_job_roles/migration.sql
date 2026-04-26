-- ═══════════════════════════════════════════════════════════════════════════
-- Migration: Restructure employee types + job roles for cafe-mantra
--   • Employee types → Staff | Contractor | Working Partner
--   • Job roles → 15 canonical roles
--   • Employee.jobRoleId (single FK) → employee_job_roles (many-to-many)
-- ═══════════════════════════════════════════════════════════════════════════

-- Step 1: Create the many-to-many junction table
CREATE TABLE "employee_job_roles" (
    "id"         TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "jobRoleId"  TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "employee_job_roles_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "employee_job_roles_employeeId_fkey"
        FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
        ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "employee_job_roles_jobRoleId_fkey"
        FOREIGN KEY ("jobRoleId") REFERENCES "job_roles"("id")
        ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "employee_job_roles_employeeId_jobRoleId_key"
    ON "employee_job_roles"("employeeId", "jobRoleId");

-- Step 2: Data migration
DO $$
DECLARE
  r_id          TEXT;
  staff_id      TEXT;
  contractor_id TEXT;
  partner_id    TEXT;
BEGIN
  SELECT id INTO r_id FROM restaurants WHERE slug = 'cafe-mantra';

  -- ── Employee Types ────────────────────────────────────────────────────────
  -- Staff already exists — get its ID
  SELECT id INTO staff_id FROM employee_types
  WHERE name = 'Staff' AND "restaurantId" = r_id;

  -- Create Contractor type
  INSERT INTO employee_types (
    id, name, "isDailyRate", "isLeaveEligible", "isDepositEligible",
    "isHiddenFromManager", "hasBillingCycle", "restaurantId", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid()::TEXT, 'Contractor',
    false, false, false, false, true, r_id, NOW(), NOW()
  ) RETURNING id INTO contractor_id;

  -- Create Working Partner type (hidden from manager — owner payroll stays private)
  INSERT INTO employee_types (
    id, name, "isDailyRate", "isLeaveEligible", "isDepositEligible",
    "isHiddenFromManager", "hasBillingCycle", "restaurantId", "createdAt", "updatedAt"
  ) VALUES (
    gen_random_uuid()::TEXT, 'Working Partner',
    false, false, false, true, false, r_id, NOW(), NOW()
  ) RETURNING id INTO partner_id;

  -- ── Job Roles: upsert all 15 canonical roles ──────────────────────────────
  -- Waiter and Cashier already exist (ON CONFLICT DO NOTHING keeps their IDs)
  INSERT INTO job_roles (id, name, "restaurantId", "createdAt", "updatedAt")
  SELECT gen_random_uuid()::TEXT, r.name, r_id, NOW(), NOW()
  FROM (VALUES
    ('Dishwasher'),
    ('Fast Food Chef'),
    ('Paratha Chef'),
    ('Paratha Helper'),
    ('Chai Chef'),
    ('Chai Helper'),
    ('Cashier'),
    ('Floor Manager'),
    ('Kitchen Manager'),
    ('Waiter'),
    ('Dessert Chef'),
    ('BBQ Chef'),
    ('Kitchen Helper'),
    ('Designer'),
    ('Security Guard')
  ) AS r(name)
  ON CONFLICT (name, "restaurantId") DO NOTHING;

  -- ── Update employee types ─────────────────────────────────────────────────
  -- Set all to Staff first (covers Dishwasher, Guard, Designer, Weekly Paid, Staff)
  UPDATE employees SET "employeeTypeId" = staff_id WHERE "restaurantId" = r_id;

  -- Override: Contractors
  UPDATE employees SET "employeeTypeId" = contractor_id
  WHERE name IN ('Ameer', 'Yusuf', 'Zohaib', 'Security Company', 'Shahzaib', 'Huzaifa')
    AND "restaurantId" = r_id;

  -- Override: Working Partner
  UPDATE employees SET "employeeTypeId" = partner_id
  WHERE name = 'Aaliyan' AND "restaurantId" = r_id;

  -- ── Assign job roles via junction table ───────────────────────────────────
  INSERT INTO employee_job_roles (id, "employeeId", "jobRoleId", "assignedAt")
  SELECT gen_random_uuid()::TEXT, e.id, jr.id, NOW()
  FROM employees e
  JOIN job_roles jr ON jr."restaurantId" = r_id
  WHERE e."restaurantId" = r_id
    AND (
      (e.name = 'Aaliyan'           AND jr.name = 'Kitchen Manager')  OR
      (e.name = 'Abdul Nabi'        AND jr.name = 'Dishwasher')       OR
      (e.name = 'Ahmed (Paratha)'   AND jr.name = 'Paratha Chef')     OR
      (e.name = 'Ameer'             AND jr.name = 'Security Guard')   OR
      (e.name = 'Anees'             AND jr.name = 'Dessert Chef')     OR
      (e.name = 'Arif'              AND jr.name = 'Chai Chef')        OR
      (e.name = 'Arif (Dishwasher)' AND jr.name = 'Dishwasher')       OR
      (e.name = 'Bilawal'           AND jr.name = 'Waiter')           OR
      (e.name = 'Ehtesham'          AND jr.name = 'Waiter')           OR
      (e.name = 'Fatima'            AND jr.name = 'Cashier')          OR
      (e.name = 'Hafeez'            AND jr.name = 'Waiter')           OR
      (e.name = 'Hamza Ahmed'       AND jr.name = 'Dishwasher')       OR
      (e.name = 'Hamza Khan'        AND jr.name = 'Dishwasher')       OR
      (e.name = 'Hanif'             AND jr.name = 'BBQ Chef')         OR
      (e.name = 'Hassan'            AND jr.name = 'Fast Food Chef')   OR
      (e.name = 'Husnain'           AND jr.name = 'Fast Food Chef')   OR
      (e.name = 'Huzaifa'           AND jr.name = 'Designer')         OR
      (e.name = 'Irshad'            AND jr.name = 'Waiter')           OR
      (e.name = 'Kamran'            AND jr.name = 'Dishwasher')       OR
      (e.name = 'Kashif'            AND jr.name = 'Waiter')           OR
      (e.name = 'M. Ali (Paratha)'  AND jr.name = 'Paratha Chef')     OR
      (e.name = 'Mudassir'          AND jr.name = 'Waiter')           OR
      (e.name = 'Mujeeb'            AND jr.name = 'Dishwasher')       OR
      (e.name = 'Nazeer'            AND jr.name = 'Waiter')           OR
      (e.name = 'Raja'              AND jr.name = 'Paratha Chef')     OR
      (e.name = 'Rana'              AND jr.name = 'Paratha Helper')   OR
      (e.name = 'Rizwan'            AND jr.name = 'Dishwasher')       OR
      (e.name = 'Sabir'             AND jr.name = 'Dishwasher')       OR
      (e.name = 'Sajid'             AND jr.name = 'Kitchen Helper')   OR
      (e.name = 'Sanwal'            AND jr.name = 'Dessert Chef')     OR
      (e.name = 'Security Company'  AND jr.name = 'Security Guard')   OR
      (e.name = 'Shahzaib'          AND jr.name = 'Waiter')           OR
      (e.name = 'Sheharyar'         AND jr.name = 'Dishwasher')       OR
      (e.name = 'Sher Muhammad'     AND jr.name = 'Chai Chef')        OR
      (e.name = 'Ubaid'             AND jr.name = 'Dishwasher')       OR
      (e.name = 'Umair'             AND jr.name = 'Floor Manager')    OR
      (e.name = 'Waqas'             AND jr.name = 'Floor Manager')    OR
      (e.name = 'Yusuf'             AND jr.name = 'Security Guard')   OR
      (e.name = 'Zohaib'            AND jr.name = 'Security Guard')
    );

  -- ── Mark inactive employees ───────────────────────────────────────────────
  UPDATE employees SET status = 'INACTIVE'::"EmployeeStatus"
  WHERE name IN ('Hassan', 'Husnain') AND "restaurantId" = r_id;

END $$;

-- Step 3: Drop the single-FK job role column (removes FK constraint too)
ALTER TABLE "employees" DROP COLUMN IF EXISTS "jobRoleId";

-- Step 4: Delete obsolete employee types (all employees already remapped)
DELETE FROM employee_types
WHERE name IN ('Dishwasher', 'Guard', 'Designer', 'Weekly Paid')
  AND "restaurantId" = (SELECT id FROM restaurants WHERE slug = 'cafe-mantra');

-- Step 5: Delete obsolete job roles (Manager, Helper — replaced by specific roles)
DELETE FROM job_roles
WHERE name IN ('Manager', 'Helper')
  AND "restaurantId" = (SELECT id FROM restaurants WHERE slug = 'cafe-mantra');
