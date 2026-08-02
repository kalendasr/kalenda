-- CreateTable
CREATE TABLE "ticket_type" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "priceCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'SRD',
    "quantity" INTEGER NOT NULL,
    "minimumPerOrder" INTEGER NOT NULL DEFAULT 1,
    "maximumPerOrder" INTEGER NOT NULL DEFAULT 10,
    "salesStart" TIMESTAMP(3),
    "salesEnd" TIMESTAMP(3),
    "visible" BOOLEAN NOT NULL DEFAULT true,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "ticket_type_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ticket_type_eventId_idx" ON "ticket_type"("eventId");

-- AddForeignKey
ALTER TABLE "ticket_type" ADD CONSTRAINT "ticket_type_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "event"("id") ON DELETE CASCADE ON UPDATE CASCADE;
