/*
  Warnings:

  - You are about to drop the column `externalId` on the `Thread` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[externalApiId]` on the table `Thread` will be added. If there are existing duplicate values, this will fail.

*/
-- DropIndex
DROP INDEX "Thread_externalId_key";

-- AlterTable
ALTER TABLE "Thread" DROP COLUMN "externalId",
ADD COLUMN     "externalApiId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Thread_externalApiId_key" ON "Thread"("externalApiId");
