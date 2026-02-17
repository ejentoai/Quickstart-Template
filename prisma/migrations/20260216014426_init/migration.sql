/*
  Warnings:

  - A unique constraint covering the columns `[externalId]` on the table `Thread` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Thread" ADD COLUMN     "externalId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Thread_externalId_key" ON "Thread"("externalId");
