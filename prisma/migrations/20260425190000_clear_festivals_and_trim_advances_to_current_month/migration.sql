-- Data cleanup: festivals and advances
--
-- 1) Festivals: remove all bonus rows and events (FK: bonuses reference events + monthly_payrolls).
-- 2) Advances: keep only rows tied to a monthly payroll whose calendar month matches
--    the month when this migration runs (server clock). All other advance rows are removed.
--    See follow-up migration retrim_advances_current_month_asia_karachi: UTC "current month"
--    can disagree with the business month (e.g. Asia/Karachi).

-- Festival bonuses must be deleted before festival events (FK from bonuses to events).
DELETE FROM "festival_bonuses";

DELETE FROM "festival_events";

-- Remove advances not belonging to the current calendar month (year + month of linked payroll)
DELETE FROM "advances" a
USING "monthly_payrolls" mp
WHERE a."monthlyPayrollId" = mp."id"
  AND (
    EXTRACT(YEAR FROM mp."month")::int <> EXTRACT(YEAR FROM CURRENT_TIMESTAMP)::int
    OR EXTRACT(MONTH FROM mp."month")::int <> EXTRACT(MONTH FROM CURRENT_TIMESTAMP)::int
  );
