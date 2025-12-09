/*
  Warnings:

  - You are about to drop the column `transactionId` on the `Booking` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[paymentId]` on the table `Booking` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "Booking" DROP CONSTRAINT "Booking_transactionId_fkey";

-- AlterTable
ALTER TABLE "Booking" DROP COLUMN "transactionId",
ADD COLUMN     "paymentId" TEXT,
ADD COLUMN     "transaction" TEXT;

-- AlterTable
ALTER TABLE "Payment" ADD COLUMN     "bookingId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Booking_paymentId_key" ON "Booking"("paymentId");

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Recommendation" ADD CONSTRAINT "Recommendation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
