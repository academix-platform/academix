CREATE TABLE "StudentFinalResult" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "averageScore" DOUBLE PRECISION NOT NULL,
    "assessmentCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentFinalResult_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "StudentFinalResult_schoolId_studentId_academicYearId_key" ON "StudentFinalResult"("schoolId", "studentId", "academicYearId");
CREATE INDEX "StudentFinalResult_schoolId_idx" ON "StudentFinalResult"("schoolId");
CREATE INDEX "StudentFinalResult_studentId_idx" ON "StudentFinalResult"("studentId");
CREATE INDEX "StudentFinalResult_academicYearId_idx" ON "StudentFinalResult"("academicYearId");

ALTER TABLE "StudentFinalResult" ADD CONSTRAINT "StudentFinalResult_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentFinalResult" ADD CONSTRAINT "StudentFinalResult_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "StudentFinalResult" ADD CONSTRAINT "StudentFinalResult_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
