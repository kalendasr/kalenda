-- CreateIndex
CREATE INDEX "customer_email_trgm_idx" ON "customer" USING GIN ("email" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "event_title_trgm_idx" ON "event" USING GIN ("title" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "organization_name_trgm_idx" ON "organization" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "user_name_trgm_idx" ON "user" USING GIN ("name" gin_trgm_ops);

-- CreateIndex
CREATE INDEX "user_email_trgm_idx" ON "user" USING GIN ("email" gin_trgm_ops);
