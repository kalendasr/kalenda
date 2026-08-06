-- CreateEnum
CREATE TYPE "TicketDeliveryChannel" AS ENUM ('Email', 'WhatsApp');

-- AlterEnum
ALTER TYPE "PaymentState" ADD VALUE 'Requested';

-- AlterTable
ALTER TABLE "payment" ADD COLUMN     "requestedAt" TIMESTAMP(3),
ADD COLUMN     "requestedBy" TEXT;

-- AlterTable
ALTER TABLE "ticket" ADD COLUMN     "sentVia" "TicketDeliveryChannel";
