-- Re-apply advance retention using the business calendar month in Asia/Karachi.
-- The previous migration (20260425190000) used the database server's CURRENT_TIMESTAMP
-- for year/month, which is effectively UTC on Supabase. Late on the 31st or on the 1st
-- local time, "current month" in UTC can still be the previous month, so April payroll
-- advances were incorrectly deleted and earlier months were kept.
--
-- This migration deletes all advances except those linked to a monthly_payroll whose
-- month (YYYY-MM) matches the current calendar month in Asia/Karachi. It is safe to
-- re-run: it does not touch festivals. Rows wrongly deleted by the prior migration
-- are not recoverable from SQL alone—re-enter or restore from backup / PITR.
DELETE FROM "advances" a
USING "monthly_payrolls" mp
WHERE a."monthlyPayrollId" = mp."id"
  AND to_char(mp."month", 'YYYY-MM')
    <> to_char(
      (CURRENT_TIMESTAMP AT TIME ZONE 'Asia/Karachi')::date,
      'YYYY-MM'
    );
