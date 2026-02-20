/*
  Warnings:

  - You are about to drop the column `accessToken` on the `EjentoConfig` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "EjentoConfig" DROP COLUMN "accessToken",
ADD COLUMN     "ejentoAccessToken" TEXT;
