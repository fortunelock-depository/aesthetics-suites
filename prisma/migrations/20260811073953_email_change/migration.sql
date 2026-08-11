-- AlterEnum
ALTER TYPE "UserSecurityTokenType" ADD VALUE 'EMAIL_CHANGE';

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "pendingEmail" TEXT;
