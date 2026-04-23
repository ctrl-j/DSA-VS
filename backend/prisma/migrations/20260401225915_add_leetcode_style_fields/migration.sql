-- AlterTable
ALTER TABLE "Problem" ADD COLUMN     "drivers" JSONB,
ADD COLUMN     "functionName" TEXT,
ADD COLUMN     "templates" JSONB;
