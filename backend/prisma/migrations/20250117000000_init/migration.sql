-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'SURVIVOR', 'NIKITA');

-- CreateEnum
CREATE TYPE "RoundStatus" AS ENUM ('COOLDOWN', 'ACTIVE', 'FINISHED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Round" (
    "id" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "endTime" TIMESTAMP(3) NOT NULL,
    "cooldownEnd" TIMESTAMP(3) NOT NULL,
    "status" "RoundStatus" NOT NULL DEFAULT 'COOLDOWN',
    "totalScore" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Round_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlayerStats" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "roundId" TEXT NOT NULL,
    "taps" INTEGER NOT NULL DEFAULT 0,
    "score" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "PlayerStats_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Round_status_idx" ON "Round"("status");

-- CreateIndex
CREATE INDEX "Round_startTime_idx" ON "Round"("startTime");

-- CreateIndex
CREATE INDEX "PlayerStats_roundId_idx" ON "PlayerStats"("roundId");

-- CreateIndex
CREATE INDEX "PlayerStats_roundId_score_idx" ON "PlayerStats"("roundId", "score");

-- CreateIndex
CREATE UNIQUE INDEX "PlayerStats_userId_roundId_key" ON "PlayerStats"("userId", "roundId");

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlayerStats" ADD CONSTRAINT "PlayerStats_roundId_fkey" FOREIGN KEY ("roundId") REFERENCES "Round"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

