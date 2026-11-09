-- Additive flag for Cafe ledger–sourced monthly payrolls.
-- Backfills from existing note/name markers; does not change amounts.

ALTER TABLE "monthly_payrolls"
  ADD COLUMN IF NOT EXISTS "isLedgerBackfill" BOOLEAN NOT NULL DEFAULT false;

-- Mark payrolls that already carry Cafe ledger migration markers.
UPDATE "monthly_payrolls" mp
SET "isLedgerBackfill" = true
WHERE mp."isLedgerBackfill" = false
  AND (
    EXISTS (
      SELECT 1 FROM "disbursements" d
      WHERE d."monthlyPayrollId" = mp.id
        AND d.notes ILIKE '%Cafe ledger historical%'
    )
    OR EXISTS (
      SELECT 1 FROM "advances" a
      WHERE a."monthlyPayrollId" = mp.id
        AND a.notes ILIKE '%Cafe ledger%'
    )
    OR EXISTS (
      SELECT 1
      FROM "festival_bonuses" fb
      JOIN "festival_events" fe ON fe.id = fb."festivalEventId"
      WHERE fb."monthlyPayrollId" = mp.id
        AND fe.name LIKE 'Cafe ledger backfill%'
    )
  );

CREATE INDEX IF NOT EXISTS "monthly_payrolls_restaurantId_month_isLedgerBackfill_idx"
  ON "monthly_payrolls" ("restaurantId", month, "isLedgerBackfill");
