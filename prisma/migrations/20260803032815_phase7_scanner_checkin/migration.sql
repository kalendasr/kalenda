-- CreateEnum
CREATE TYPE "CheckInResult" AS ENUM ('Valid', 'AlreadyCheckedIn', 'Invalid', 'NotFound');

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "checkedInAt" TIMESTAMP(3),
ADD COLUMN     "checkedInBy" TEXT;

-- CreateTable
CREATE TABLE "check_in" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "ticketId" TEXT,
    "ticketNumber" TEXT NOT NULL,
    "scannedById" TEXT NOT NULL,
    "result" "CheckInResult" NOT NULL,
    "scannedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "check_in_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "check_in_eventId_scannedAt_idx" ON "check_in"("eventId", "scannedAt");

-- CreateIndex
CREATE INDEX "check_in_ticketId_idx" ON "check_in"("ticketId");

-- CreateIndex
CREATE INDEX "ticket_ticketNumber_idx" ON "ticket"("ticketNumber");

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_checkedInBy_fkey" FOREIGN KEY ("checkedInBy") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "ticket"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "check_in" ADD CONSTRAINT "check_in_scannedById_fkey" FOREIGN KEY ("scannedById") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;
