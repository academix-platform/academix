-- CreateEnum
CREATE TYPE "SchoolDayExceptionType" AS ENUM ('HOLIDAY', 'OFF_DAY', 'WORKING_OVERRIDE');

-- AlterEnum
ALTER TYPE "Day" ADD VALUE 'FRIDAY';

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "allowLateSubmission" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "AssignmentSubmission" ADD COLUMN     "teacherFeedback" TEXT;

-- CreateTable
CREATE TABLE "SchoolDayException" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "date" DATE NOT NULL,
    "type" "SchoolDayExceptionType" NOT NULL,
    "name" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolDayException_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SchoolDayException_schoolId_idx" ON "SchoolDayException"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolDayException_date_idx" ON "SchoolDayException"("date");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolDayException_schoolId_date_key" ON "SchoolDayException"("schoolId", "date");

-- AddForeignKey
ALTER TABLE "SchoolDayException" ADD CONSTRAINT "SchoolDayException_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;
