-- AlterTable
ALTER TABLE "order" ADD COLUMN     "userId" TEXT;

-- CreateIndex
CREATE INDEX "order_userId_idx" ON "order"("userId");

-- AddForeignKey
ALTER TABLE "order" ADD CONSTRAINT "order_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
