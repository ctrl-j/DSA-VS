/*
  Warnings:

  - The `solution` column on the `Problem` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "AchievementType" AS ENUM ('FIRST_BLOOD', 'WIN_STREAK_X3', 'UNDERDOG', 'SPEED_CODER', 'PERFECT_RUN', 'COMEBACK_KING', 'POLYGLOT', 'DAILY_GRINDER', 'TOP_100', 'LEGEND');

-- AlterTable
ALTER TABLE "Problem" DROP COLUMN "solution",
ADD COLUMN     "solution" JSONB;

-- CreateTable
CREATE TABLE "UserAchievement" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AchievementType" NOT NULL,
    "earnedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserAchievement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "UserAchievement_userId_idx" ON "UserAchievement"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "UserAchievement_userId_type_key" ON "UserAchievement"("userId", "type");

-- AddForeignKey
ALTER TABLE "UserAchievement" ADD CONSTRAINT "UserAchievement_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
