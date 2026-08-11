-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('UserBlocked', 'UserUnblocked', 'UserRoleGranted', 'UserRoleRevoked', 'UserDeleted', 'OrganizationDeactivated', 'OrganizationReactivated', 'OrganizationVerified', 'OrganizationUnverified', 'EventPublished', 'EventUnpublished', 'EventArchived', 'EventDeleted', 'CategoryCreated', 'CategoryUpdated');

-- CreateEnum
CREATE TYPE "AuditTargetType" AS ENUM ('User', 'Organization', 'Event', 'Category');

-- CreateTable
CREATE TABLE "audit_log" (
    "id" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" "AuditAction" NOT NULL,
    "targetType" "AuditTargetType" NOT NULL,
    "targetId" TEXT NOT NULL,
    "targetLabel" TEXT NOT NULL,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_log_createdAt_idx" ON "audit_log"("createdAt");

-- CreateIndex
CREATE INDEX "audit_log_actorId_idx" ON "audit_log"("actorId");

-- CreateIndex
CREATE INDEX "audit_log_targetType_targetId_idx" ON "audit_log"("targetType", "targetId");

-- CreateIndex
CREATE INDEX "audit_log_action_idx" ON "audit_log"("action");

-- CreateIndex
CREATE INDEX "event_status_idx" ON "event"("status");

-- CreateIndex
CREATE INDEX "event_createdAt_idx" ON "event"("createdAt");

-- CreateIndex
CREATE INDEX "order_createdAt_idx" ON "order"("createdAt");

-- CreateIndex
CREATE INDEX "order_orderStatus_idx" ON "order"("orderStatus");

-- CreateIndex
CREATE INDEX "order_paymentStatus_idx" ON "order"("paymentStatus");

-- CreateIndex
CREATE INDEX "payment_state_idx" ON "payment"("state");

-- CreateIndex
CREATE INDEX "ticket_status_idx" ON "ticket"("status");

-- CreateIndex
CREATE INDEX "ticket_checkedInAt_idx" ON "ticket"("checkedInAt");

-- CreateIndex
CREATE INDEX "user_createdAt_idx" ON "user"("createdAt");

-- CreateIndex
CREATE INDEX "user_isPlatformAdmin_idx" ON "user"("isPlatformAdmin");

-- AddForeignKey
ALTER TABLE "audit_log" ADD CONSTRAINT "audit_log_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Zoekindexen voor het admin-workspace.
--
-- De beheerderslijsten zoeken met `contains` (ILIKE '%term%') op namen,
-- e-mailadressen en titels. Een gewone btree-index doet daar niets voor: die
-- kan alleen prefixen. Zonder trigram-index wordt elke zoekopdracht een
-- sequential scan, wat bij honderdduizenden gebruikers of tickets onwerkbaar
-- is. GIN + pg_trgm maakt ILIKE '%...%' wél index-gedreven.
--
-- Identifiers (order.orderNumber, ticket.ticketNumber) staan hier bewust niet
-- tussen: die worden exact opgezocht via hun bestaande unique-index.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX "user_name_trgm_idx" ON "user" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "user_email_trgm_idx" ON "user" USING GIN ("email" gin_trgm_ops);
CREATE INDEX "organization_name_trgm_idx" ON "organization" USING GIN ("name" gin_trgm_ops);
CREATE INDEX "event_title_trgm_idx" ON "event" USING GIN ("title" gin_trgm_ops);
CREATE INDEX "customer_email_trgm_idx" ON "customer" USING GIN ("email" gin_trgm_ops);
