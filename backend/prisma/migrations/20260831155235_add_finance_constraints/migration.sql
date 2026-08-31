-- Database-level protections for values Prisma cannot express as CHECK
-- constraints, mirroring the existing 20260729123000_database_constraints
-- migration's approach.
ALTER TABLE "Provider"
  ADD CONSTRAINT "Provider_commissionRate_check" CHECK ("commissionRate" BETWEEN 0 AND 100);

ALTER TABLE "FinancialTransaction"
  ADD CONSTRAINT "FinancialTransaction_grossAmount_check" CHECK ("grossAmount" >= 0),
  ADD CONSTRAINT "FinancialTransaction_commissionRate_check" CHECK ("commissionRate" BETWEEN 0 AND 100),
  ADD CONSTRAINT "FinancialTransaction_commissionAmount_check" CHECK ("commissionAmount" >= 0),
  ADD CONSTRAINT "FinancialTransaction_providerNetAmount_check" CHECK ("providerNetAmount" >= 0),
  ADD CONSTRAINT "FinancialTransaction_settled_consistency_check" CHECK (
    ("settlementStatus" = 'SETTLED' AND "settledAt" IS NOT NULL)
    OR ("settlementStatus" = 'PENDING' AND "settledAt" IS NULL AND "settledByAdminId" IS NULL)
  );
