-- CreateEnum
CREATE TYPE "FuelType" AS ENUM ('GASOLINE_95', 'GASOLINE_98', 'DIESEL');

-- CreateTable
CREATE TABLE "ProviderFuelInventory" (
    "id" SERIAL NOT NULL,
    "providerId" INTEGER NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "capacityLiters" DECIMAL(12,2) NOT NULL,
    "currentLiters" DECIMAL(12,2) NOT NULL,
    "pricePerLiter" DECIMAL(10,2),
    "updatedByAdminId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ProviderFuelInventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelInventoryHistory" (
    "id" SERIAL NOT NULL,
    "inventoryId" INTEGER NOT NULL,
    "providerId" INTEGER NOT NULL,
    "fuelType" "FuelType" NOT NULL,
    "previousLiters" DECIMAL(12,2) NOT NULL,
    "newLiters" DECIMAL(12,2) NOT NULL,
    "previousCapacityLiters" DECIMAL(12,2),
    "newCapacityLiters" DECIMAL(12,2),
    "previousPricePerLiter" DECIMAL(10,2),
    "newPricePerLiter" DECIMAL(10,2),
    "changedByAdminId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FuelInventoryHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ProviderFuelInventory_providerId_idx" ON "ProviderFuelInventory"("providerId");

-- CreateIndex
CREATE UNIQUE INDEX "ProviderFuelInventory_providerId_fuelType_key" ON "ProviderFuelInventory"("providerId", "fuelType");

-- CreateIndex
CREATE INDEX "FuelInventoryHistory_inventoryId_createdAt_idx" ON "FuelInventoryHistory"("inventoryId", "createdAt");

-- CreateIndex
CREATE INDEX "FuelInventoryHistory_providerId_fuelType_createdAt_idx" ON "FuelInventoryHistory"("providerId", "fuelType", "createdAt");

-- AddForeignKey
ALTER TABLE "ProviderFuelInventory" ADD CONSTRAINT "ProviderFuelInventory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProviderFuelInventory" ADD CONSTRAINT "ProviderFuelInventory_updatedByAdminId_fkey" FOREIGN KEY ("updatedByAdminId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelInventoryHistory" ADD CONSTRAINT "FuelInventoryHistory_inventoryId_fkey" FOREIGN KEY ("inventoryId") REFERENCES "ProviderFuelInventory"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelInventoryHistory" ADD CONSTRAINT "FuelInventoryHistory_providerId_fkey" FOREIGN KEY ("providerId") REFERENCES "Provider"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelInventoryHistory" ADD CONSTRAINT "FuelInventoryHistory_changedByAdminId_fkey" FOREIGN KEY ("changedByAdminId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
