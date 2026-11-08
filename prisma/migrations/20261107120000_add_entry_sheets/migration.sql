-- CreateEnum
CREATE TYPE "EntrySheetKind" AS ENUM ('RESULT', 'ATTENDANCE');

-- CreateTable
CREATE TABLE "EntrySheet" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "kind" "EntrySheetKind" NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "classId" INTEGER NOT NULL,
    "examId" INTEGER,
    "assignmentId" INTEGER,
    "date" DATE,
    "createdById" TEXT NOT NULL,
    "rows" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntrySheet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EntrySheetRead" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "sheetId" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "succeeded" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EntrySheetRead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "EntrySheet_schoolId_idx" ON "EntrySheet"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "EntrySheet_schoolId_code_key" ON "EntrySheet"("schoolId", "code");

-- CreateIndex
CREATE INDEX "EntrySheetRead_schoolId_createdAt_idx" ON "EntrySheetRead"("schoolId", "createdAt");

-- AddForeignKey
ALTER TABLE "EntrySheet" ADD CONSTRAINT "EntrySheet_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrySheet" ADD CONSTRAINT "EntrySheet_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrySheet" ADD CONSTRAINT "EntrySheet_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrySheet" ADD CONSTRAINT "EntrySheet_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrySheet" ADD CONSTRAINT "EntrySheet_assignmentId_fkey" FOREIGN KEY ("assignmentId") REFERENCES "Assignment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrySheetRead" ADD CONSTRAINT "EntrySheetRead_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EntrySheetRead" ADD CONSTRAINT "EntrySheetRead_sheetId_fkey" FOREIGN KEY ("sheetId") REFERENCES "EntrySheet"("id") ON DELETE CASCADE ON UPDATE CASCADE;

