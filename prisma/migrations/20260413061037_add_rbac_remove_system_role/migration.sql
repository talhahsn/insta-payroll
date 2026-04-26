-- DropIndex (indexes dropped by Prisma diff)
DROP INDEX IF EXISTS "advances_restaurantId_idx";
DROP INDEX IF EXISTS "audit_logs_restaurantId_idx";
DROP INDEX IF EXISTS "disbursements_restaurantId_idx";
DROP INDEX IF EXISTS "festival_bonuses_restaurantId_idx";
DROP INDEX IF EXISTS "leaves_restaurantId_idx";
DROP INDEX IF EXISTS "salary_history_restaurantId_idx";
DROP INDEX IF EXISTS "security_deposits_restaurantId_idx";
DROP INDEX IF EXISTS "shift_coverages_restaurantId_idx";

-- CreateTable: roles
CREATE TABLE "roles" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "isProtected" BOOLEAN NOT NULL DEFAULT false,
    "restaurantId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable: role_permissions
CREATE TABLE "role_permissions" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "resource" TEXT NOT NULL,
    "action" TEXT NOT NULL,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "roles_name_restaurantId_key" ON "roles"("name", "restaurantId");
CREATE UNIQUE INDEX "role_permissions_roleId_resource_action_key" ON "role_permissions"("roleId", "resource", "action");

-- AddForeignKey
ALTER TABLE "roles" ADD CONSTRAINT "roles_restaurantId_fkey" FOREIGN KEY ("restaurantId") REFERENCES "restaurants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── Data migration ────────────────────────────────────────────────────────────
DO $$
DECLARE
  r RECORD;
  super_admin_id TEXT;
  admin_id TEXT;
  perm TEXT;
BEGIN
  FOR r IN SELECT id FROM restaurants LOOP
    -- Create Super Admin role (isProtected = true)
    super_admin_id := gen_random_uuid()::TEXT;
    INSERT INTO roles (id, name, description, "isProtected", "restaurantId", "createdAt", "updatedAt")
    VALUES (super_admin_id, 'Super Admin', 'Full access to all features', true, r.id, NOW(), NOW());

    -- Grant all 16 permissions to Super Admin
    FOREACH perm IN ARRAY ARRAY[
      'employees.view', 'employees.view_all', 'employees.manage',
      'payroll.view', 'payroll.record_payment', 'payroll.export',
      'leaves.view', 'leaves.manage',
      'advances.view', 'advances.manage',
      'coverage.view', 'coverage.manage',
      'festivals.view', 'festivals.manage',
      'settings.view', 'settings.manage'
    ] LOOP
      INSERT INTO role_permissions (id, "roleId", resource, action)
      VALUES (
        gen_random_uuid()::TEXT,
        super_admin_id,
        split_part(perm, '.', 1),
        split_part(perm, '.', 2)
      );
    END LOOP;

    -- Create Admin role
    admin_id := gen_random_uuid()::TEXT;
    INSERT INTO roles (id, name, description, "isProtected", "restaurantId", "createdAt", "updatedAt")
    VALUES (admin_id, 'Admin', 'Manage daily operations', false, r.id, NOW(), NOW());

    -- Grant limited permissions to Admin
    FOREACH perm IN ARRAY ARRAY[
      'employees.view', 'employees.manage',
      'payroll.view',
      'leaves.view', 'leaves.manage',
      'advances.view', 'advances.manage',
      'coverage.view', 'coverage.manage',
      'festivals.view'
    ] LOOP
      INSERT INTO role_permissions (id, "roleId", resource, action)
      VALUES (
        gen_random_uuid()::TEXT,
        admin_id,
        split_part(perm, '.', 1),
        split_part(perm, '.', 2)
      );
    END LOOP;

    -- Migrate existing users: PARTNER → Super Admin, MANAGER → Admin
    UPDATE users SET "roleId" = super_admin_id
    WHERE "restaurantId" = r.id AND "systemRole" = 'PARTNER';

    UPDATE users SET "roleId" = admin_id
    WHERE "restaurantId" = r.id AND "systemRole" = 'MANAGER';
  END LOOP;
END $$;

-- Add roleId column (users already have values from DO block above via systemRole)
-- We add it nullable then enforce NOT NULL after data is set
ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "roleId" TEXT;

-- Safety net: any user without a roleId gets Super Admin of their restaurant
UPDATE "users" u
SET "roleId" = (
  SELECT ro.id FROM roles ro
  WHERE ro."restaurantId" = u."restaurantId" AND ro."isProtected" = true
  LIMIT 1
)
WHERE u."roleId" IS NULL;

-- Enforce NOT NULL
ALTER TABLE "users" ALTER COLUMN "roleId" SET NOT NULL;

-- Drop old column and enum
ALTER TABLE "users" DROP COLUMN IF EXISTS "systemRole";
DROP TYPE IF EXISTS "SystemRole";

-- AddForeignKey for users.roleId
ALTER TABLE "users" ADD CONSTRAINT "users_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
