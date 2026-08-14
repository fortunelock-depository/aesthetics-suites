-- AlterTable
ALTER TABLE "Booking" ADD COLUMN     "cancelledById" TEXT,
ADD COLUMN     "createdById" TEXT,
ADD COLUMN     "refundFailedAt" TIMESTAMP(3);

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
