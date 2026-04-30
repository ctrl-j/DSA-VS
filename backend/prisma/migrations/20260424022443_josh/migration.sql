-- CreateEnum
CREATE TYPE "ApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'ACTIVE');

-- AlterTable
ALTER TABLE "Match" ADD COLUMN     "passwordHash" TEXT,
ADD COLUMN     "roomName" TEXT;

-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "approvalStatus" "ApprovalStatus" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN     "rejectionFeedback" TEXT,
ADD COLUMN     "submittedById" TEXT;

-- CreateTable
CREATE TABLE "FocusSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "durationMs" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FocusSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InstructorEvaluation" (
    "id" TEXT NOT NULL,
    "instructorId" TEXT NOT NULL,
    "studentId" TEXT NOT NULL,
    "matchId" TEXT,
    "score" INTEGER NOT NULL,
    "feedback" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InstructorEvaluation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FocusSession_userId_date_idx" ON "FocusSession"("userId", "date");

-- CreateIndex
CREATE INDEX "FocusSession_userId_category_idx" ON "FocusSession"("userId", "category");

-- CreateIndex
CREATE INDEX "InstructorEvaluation_studentId_idx" ON "InstructorEvaluation"("studentId");

-- CreateIndex
CREATE INDEX "InstructorEvaluation_instructorId_idx" ON "InstructorEvaluation"("instructorId");

-- CreateIndex
CREATE INDEX "Match_roomName_idx" ON "Match"("roomName");

-- CreateIndex
CREATE INDEX "Problem_submittedById_approvalStatus_idx" ON "Problem"("submittedById", "approvalStatus");

-- AddForeignKey
ALTER TABLE "Problem" ADD CONSTRAINT "Problem_submittedById_fkey" FOREIGN KEY ("submittedById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FocusSession" ADD CONSTRAINT "FocusSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorEvaluation" ADD CONSTRAINT "InstructorEvaluation_instructorId_fkey" FOREIGN KEY ("instructorId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorEvaluation" ADD CONSTRAINT "InstructorEvaluation_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InstructorEvaluation" ADD CONSTRAINT "InstructorEvaluation_matchId_fkey" FOREIGN KEY ("matchId") REFERENCES "Match"("id") ON DELETE SET NULL ON UPDATE CASCADE;
