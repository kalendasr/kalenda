-- CreateEnum
CREATE TYPE "TicketStatus" AS ENUM ('Issued', 'Sent', 'CheckedIn', 'Cancelled');

-- CreateTable
CREATE TABLE "ticket" (
    "id" TEXT NOT NULL,
    "orderItemId" TEXT NOT NULL,
    "ticketNumber" TEXT NOT NULL,
    "status" "TicketStatus" NOT NULL DEFAULT 'Issued',
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sentAt" TIMESTAMP(3),
    "cancelledAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ticket_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ticket_ticketNumber_key" ON "ticket"("ticketNumber");

-- CreateIndex
CREATE INDEX "ticket_orderItemId_idx" ON "ticket"("orderItemId");

-- AddForeignKey
ALTER TABLE "ticket" ADD CONSTRAINT "ticket_orderItemId_fkey" FOREIGN KEY ("orderItemId") REFERENCES "order_item"("id") ON DELETE CASCADE ON UPDATE CASCADE;
