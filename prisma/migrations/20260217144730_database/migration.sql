-- CreateTable
CREATE TABLE "EjentoConfig" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "baseUrl" TEXT NOT NULL,
    "apiKey" TEXT NOT NULL,
    "accessToken" TEXT,
    "agentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EjentoConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "EjentoConfig_userId_key" ON "EjentoConfig"("userId");

-- AddForeignKey
ALTER TABLE "EjentoConfig" ADD CONSTRAINT "EjentoConfig_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
