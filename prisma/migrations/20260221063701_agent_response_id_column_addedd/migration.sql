/*
  Warnings:

  - A unique constraint covering the columns `[agent_response_id]` on the table `Message` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "Message" ADD COLUMN     "agent_response_id" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "Message_agent_response_id_key" ON "Message"("agent_response_id");
