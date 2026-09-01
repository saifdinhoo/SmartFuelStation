-- CreateEnum
CREATE TYPE "SettlementStatus" AS ENUM ('PENDING', 'SETTLED');

-- AlterTable
ALTER TABLE "Provider" ADD COLUMN     "commissionRate" DECIMAL(5,2) NOT NULL DEFAULT 10.00,
ADD COLUMN     "commissionUpdatedAt" TIMESTAMP(3),
ADD COLUMN     "commissionUpdatedByAdminId" INTEGER;

-- CreateTable
CREATE TABLE "FinancialTransaction" (
    "id" SERIAL NOT NULL,
    "bookingId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "grossAmount" DECIMAL(10,2) NOT NULL,
    "commissionRate" DECIMAL(5,2) NOT NULL,
    "commissionAmount" DECIMAL(10,2) NOT NULL,
    "providerNetAmount" DECIMAL(10,2) NOT NULL,
    "settlementStatus" "SettlementStatus" NOT NULL DEFAULT 'PENDING',
    "settledAt" TIMESTAMP(3),
    "settledByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FinancialTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "FinancialTransaction_bookingId_key" ON "FinancialTransaction"("bookingId");

-- CreateIndex
CREATE INDEX "FinancialTransaction_providerId_settlementStatus_idx" ON "FinancialTransaction"("providerId", "settlementStatus");

-- CreateIndex
CREATE INDEX "FinancialTransaction_providerId_createdAt_idx" ON "FinancialTransaction"("providerId", "createdAt");

-- CreateIndex
CREATE INDEX "FinancialTransaction_settlementStatus_idx" ON "FinancialTransaction"("settlementStatus");

-- AddForeignKey
ALTER TABLE "Provider" ADD CONSTRAINT "Provider_commissionUpdatedByAdminId_fkey" FOREIGN KEY ("commissionUpdatedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FinancialTransaction" ADD CONSTRAINT "FinancialTransaction_settledByAdminId_fkey" FOREIGN KEY ("settledByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
