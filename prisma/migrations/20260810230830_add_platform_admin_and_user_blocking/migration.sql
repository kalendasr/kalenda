-- AlterTable
ALTER TABLE "user" ADD COLUMN     "blockedAt" TIMESTAMP(3),
ADD COLUMN     "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
