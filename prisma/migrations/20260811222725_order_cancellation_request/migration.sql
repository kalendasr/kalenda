-- DropIndex
DROP INDEX "customer_email_trgm_idx";

-- DropIndex
DROP INDEX "event_title_trgm_idx";

-- DropIndex
DROP INDEX "organization_name_trgm_idx";

-- DropIndex
DROP INDEX "user_email_trgm_idx";

-- DropIndex
DROP INDEX "user_name_trgm_idx";

-- AlterTable
ALTER TABLE "order" ADD COLUMN     "cancellationHandledAt" TIMESTAMP(3),
ADD COLUMN     "cancellationReason" TEXT,
ADD COLUMN     "cancellationRequestedAt" TIMESTAMP(3);
