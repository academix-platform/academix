CREATE TYPE "AcademicSemester" AS ENUM ('FIRST', 'SECOND');
CREATE TYPE "FinalResultPeriod" AS ENUM ('ANNUAL', 'FIRST', 'SECOND');

ALTER TABLE "AcademicYear"
ADD COLUMN "firstSemesterStartDate" DATE,
ADD COLUMN "firstSemesterEndDate" DATE,
ADD COLUMN "secondSemesterStartDate" DATE,
ADD COLUMN "secondSemesterEndDate" DATE,
ADD COLUMN "currentSemester" "AcademicSemester" NOT NULL DEFAULT 'FIRST';

ALTER TABLE "Lesson" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "Exam" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "Assignment" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "AssignmentSubmission" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "StudyMaterial" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "Result" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "Attendance" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "Event" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "Announcement" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "Message" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "Submission" ADD COLUMN "semester" "AcademicSemester";
ALTER TABLE "EntrySheet" ADD COLUMN "semester" "AcademicSemester";

ALTER TABLE "StudentFinalResult"
ADD COLUMN "period" "FinalResultPeriod" NOT NULL DEFAULT 'ANNUAL';

DROP INDEX "StudentFinalResult_schoolId_studentId_academicYearId_key";
CREATE UNIQUE INDEX "StudentFinalResult_schoolId_studentId_academicYearId_period_key"
ON "StudentFinalResult"("schoolId", "studentId", "academicYearId", "period");
