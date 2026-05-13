/*
  Warnings:

  - The values [FRIDAY] on the enum `Day` will be removed. If these variants are still used in the database, this will fail.
  - You are about to drop the column `classId` on the `Announcement` table. All the data in the column will be lost.
  - You are about to drop the column `lessonId` on the `Attendance` table. All the data in the column will be lost.
  - You are about to drop the column `classId` on the `Event` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[schoolId,username]` on the table `Admin` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[studentId,academicYearId,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[teacherId,academicYearId,date]` on the table `Attendance` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,name]` on the table `Class` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,level]` on the table `Grade` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,username]` on the table `Parent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,email]` on the table `Parent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,phone]` on the table `Parent` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,username]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,email]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,phone]` on the table `Student` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,name]` on the table `Subject` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,username]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,email]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[schoolId,phone]` on the table `Teacher` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `schoolId` to the `Admin` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academicYearId` to the `Announcement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Announcement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academicYearId` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Assignment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academicYearId` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Attendance` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Class` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academicYearId` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Event` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academicYearId` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Exam` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Grade` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academicYearId` to the `Lesson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Lesson` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Parent` table without a default value. This is not possible if the table is not empty.
  - Added the required column `academicYearId` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Result` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthday` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Student` table without a default value. This is not possible if the table is not empty.
  - Added the required column `gradeId` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Subject` table without a default value. This is not possible if the table is not empty.
  - Added the required column `birthday` to the `Teacher` table without a default value. This is not possible if the table is not empty.
  - Added the required column `schoolId` to the `Teacher` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('TRUE_FALSE', 'MCQ', 'TEXT', 'FILE');

-- CreateEnum
CREATE TYPE "SubmissionStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'GRADED');

-- CreateEnum
CREATE TYPE "StudentStatus" AS ENUM ('ACTIVE', 'REPEATED', 'GRADUATED', 'LEFT');

-- CreateEnum
CREATE TYPE "PassFailStatus" AS ENUM ('PASS', 'FAIL');

-- AlterEnum
BEGIN;
CREATE TYPE "Day_new" AS ENUM ('SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY');
ALTER TABLE "Lesson" ALTER COLUMN "day" TYPE "Day_new" USING ("day"::text::"Day_new");
ALTER TYPE "Day" RENAME TO "Day_old";
ALTER TYPE "Day_new" RENAME TO "Day";
DROP TYPE "public"."Day_old";
COMMIT;

-- DropForeignKey
ALTER TABLE "Announcement" DROP CONSTRAINT "Announcement_classId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_lessonId_fkey";

-- DropForeignKey
ALTER TABLE "Attendance" DROP CONSTRAINT "Attendance_studentId_fkey";

-- DropForeignKey
ALTER TABLE "Class" DROP CONSTRAINT "Class_supervisorId_fkey";

-- DropForeignKey
ALTER TABLE "Event" DROP CONSTRAINT "Event_classId_fkey";

-- DropForeignKey
ALTER TABLE "Student" DROP CONSTRAINT "Student_parentId_fkey";

-- DropIndex
DROP INDEX "Admin_username_key";

-- DropIndex
DROP INDEX "Class_name_key";

-- DropIndex
DROP INDEX "Grade_level_key";

-- DropIndex
DROP INDEX "Parent_email_key";

-- DropIndex
DROP INDEX "Parent_phone_key";

-- DropIndex
DROP INDEX "Parent_username_key";

-- DropIndex
DROP INDEX "Student_email_key";

-- DropIndex
DROP INDEX "Student_phone_key";

-- DropIndex
DROP INDEX "Student_username_key";

-- DropIndex
DROP INDEX "Subject_name_key";

-- DropIndex
DROP INDEX "Teacher_email_key";

-- DropIndex
DROP INDEX "Teacher_phone_key";

-- DropIndex
DROP INDEX "Teacher_username_key";

-- AlterTable
ALTER TABLE "Admin" ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Announcement" DROP COLUMN "classId",
ADD COLUMN     "academicYearId" INTEGER NOT NULL,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Assignment" ADD COLUMN     "academicYearId" INTEGER NOT NULL,
ADD COLUMN     "classId" INTEGER,
ADD COLUMN     "schoolId" INTEGER NOT NULL,
ADD COLUMN     "subjectId" INTEGER;

-- AlterTable
ALTER TABLE "Attendance" DROP COLUMN "lessonId",
ADD COLUMN     "academicYearId" INTEGER NOT NULL,
ADD COLUMN     "schoolId" INTEGER NOT NULL,
ADD COLUMN     "teacherId" TEXT,
ALTER COLUMN "studentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Class" ADD COLUMN     "schoolId" INTEGER NOT NULL,
ALTER COLUMN "supervisorId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Event" DROP COLUMN "classId",
ADD COLUMN     "academicYearId" INTEGER NOT NULL,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Exam" ADD COLUMN     "academicYearId" INTEGER NOT NULL,
ADD COLUMN     "autoSaveInterval" INTEGER NOT NULL DEFAULT 30,
ADD COLUMN     "classId" INTEGER,
ADD COLUMN     "duration" INTEGER,
ADD COLUMN     "enableAutoSave" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableAutoSubmit" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableNavigation" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "enableTimer" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "questionsPerPage" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "schoolId" INTEGER NOT NULL,
ADD COLUMN     "subjectId" INTEGER;

-- AlterTable
ALTER TABLE "Grade" ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Lesson" ADD COLUMN     "academicYearId" INTEGER NOT NULL,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Parent" ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Result" ADD COLUMN     "academicYearId" INTEGER NOT NULL,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "birthday" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "repeatCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "schoolId" INTEGER NOT NULL,
ADD COLUMN     "status" "StudentStatus" NOT NULL DEFAULT 'ACTIVE',
ALTER COLUMN "parentId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Subject" ADD COLUMN     "gradeId" INTEGER NOT NULL,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" ADD COLUMN     "birthday" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "schoolId" INTEGER NOT NULL;

-- CreateTable
CREATE TABLE "School" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "School_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SchoolSettings" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "workDayStart" TIME NOT NULL,
    "workDayEnd" TIME NOT NULL,
    "lessonDuration" INTEGER NOT NULL,
    "lessonsPerDay" INTEGER NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SchoolSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AcademicYear" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "isCurrent" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StudentAcademicYear" (
    "id" SERIAL NOT NULL,
    "studentId" TEXT NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "gradeId" INTEGER NOT NULL,
    "classId" INTEGER,
    "performanceStatus" "PassFailStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StudentAcademicYear_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Message" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "academicYearId" INTEGER NOT NULL,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Question" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "examId" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "order" INTEGER NOT NULL,
    "options" JSONB,
    "correctAnswer" TEXT[],
    "allowMultiple" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Submission" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "examId" INTEGER NOT NULL,
    "studentId" TEXT NOT NULL,
    "status" "SubmissionStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "currentPage" INTEGER NOT NULL DEFAULT 1,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submittedAt" TIMESTAMP(3),
    "autoSubmitted" BOOLEAN NOT NULL DEFAULT false,
    "lastSyncedAt" TIMESTAMP(3),
    "totalScore" DOUBLE PRECISION,
    "extraTime" INTEGER,
    "extendedBy" TEXT,
    "extendedAt" TIMESTAMP(3),
    "disconnectedAt" TIMESTAMP(3),
    "reconnectedAt" TIMESTAMP(3),
    "totalOfflineTime" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Submission_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "submissionId" INTEGER NOT NULL,
    "questionId" INTEGER NOT NULL,
    "textAnswer" TEXT,
    "fileUrl" TEXT,
    "isDraft" BOOLEAN NOT NULL DEFAULT true,
    "savedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "score" DOUBLE PRECISION,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_TeacherClasses" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_TeacherClasses_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ClassToEvent" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ClassToEvent_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ClassToMessage" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_ClassToMessage_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_AnnouncementToClass" (
    "A" INTEGER NOT NULL,
    "B" INTEGER NOT NULL,

    CONSTRAINT "_AnnouncementToClass_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MessageToStudent" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MessageToStudent_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MessageToParent" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MessageToParent_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_MessageToTeacher" (
    "A" INTEGER NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_MessageToTeacher_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "School_name_key" ON "School"("name");

-- CreateIndex
CREATE UNIQUE INDEX "SchoolSettings_schoolId_key" ON "SchoolSettings"("schoolId");

-- CreateIndex
CREATE INDEX "SchoolSettings_schoolId_idx" ON "SchoolSettings"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "AcademicYear_schoolId_name_key" ON "AcademicYear"("schoolId", "name");

-- CreateIndex
CREATE INDEX "StudentAcademicYear_academicYearId_idx" ON "StudentAcademicYear"("academicYearId");

-- CreateIndex
CREATE INDEX "StudentAcademicYear_gradeId_idx" ON "StudentAcademicYear"("gradeId");

-- CreateIndex
CREATE INDEX "StudentAcademicYear_classId_idx" ON "StudentAcademicYear"("classId");

-- CreateIndex
CREATE INDEX "StudentAcademicYear_schoolId_idx" ON "StudentAcademicYear"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "StudentAcademicYear_schoolId_studentId_academicYearId_key" ON "StudentAcademicYear"("schoolId", "studentId", "academicYearId");

-- CreateIndex
CREATE INDEX "Message_schoolId_idx" ON "Message"("schoolId");

-- CreateIndex
CREATE INDEX "Question_schoolId_idx" ON "Question"("schoolId");

-- CreateIndex
CREATE INDEX "Question_examId_idx" ON "Question"("examId");

-- CreateIndex
CREATE INDEX "Submission_schoolId_idx" ON "Submission"("schoolId");

-- CreateIndex
CREATE INDEX "Submission_examId_idx" ON "Submission"("examId");

-- CreateIndex
CREATE INDEX "Submission_studentId_idx" ON "Submission"("studentId");

-- CreateIndex
CREATE UNIQUE INDEX "Submission_examId_studentId_key" ON "Submission"("examId", "studentId");

-- CreateIndex
CREATE INDEX "Answer_schoolId_idx" ON "Answer"("schoolId");

-- CreateIndex
CREATE INDEX "Answer_submissionId_idx" ON "Answer"("submissionId");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_submissionId_questionId_key" ON "Answer"("submissionId", "questionId");

-- CreateIndex
CREATE INDEX "_TeacherClasses_B_index" ON "_TeacherClasses"("B");

-- CreateIndex
CREATE INDEX "_ClassToEvent_B_index" ON "_ClassToEvent"("B");

-- CreateIndex
CREATE INDEX "_ClassToMessage_B_index" ON "_ClassToMessage"("B");

-- CreateIndex
CREATE INDEX "_AnnouncementToClass_B_index" ON "_AnnouncementToClass"("B");

-- CreateIndex
CREATE INDEX "_MessageToStudent_B_index" ON "_MessageToStudent"("B");

-- CreateIndex
CREATE INDEX "_MessageToParent_B_index" ON "_MessageToParent"("B");

-- CreateIndex
CREATE INDEX "_MessageToTeacher_B_index" ON "_MessageToTeacher"("B");

-- CreateIndex
CREATE INDEX "Admin_schoolId_idx" ON "Admin"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Admin_schoolId_username_key" ON "Admin"("schoolId", "username");

-- CreateIndex
CREATE INDEX "Announcement_schoolId_idx" ON "Announcement"("schoolId");

-- CreateIndex
CREATE INDEX "Assignment_schoolId_idx" ON "Assignment"("schoolId");

-- CreateIndex
CREATE INDEX "Attendance_academicYearId_idx" ON "Attendance"("academicYearId");

-- CreateIndex
CREATE INDEX "Attendance_date_idx" ON "Attendance"("date");

-- CreateIndex
CREATE INDEX "Attendance_studentId_idx" ON "Attendance"("studentId");

-- CreateIndex
CREATE INDEX "Attendance_teacherId_idx" ON "Attendance"("teacherId");

-- CreateIndex
CREATE INDEX "Attendance_schoolId_idx" ON "Attendance"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_studentId_academicYearId_date_key" ON "Attendance"("studentId", "academicYearId", "date");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_teacherId_academicYearId_date_key" ON "Attendance"("teacherId", "academicYearId", "date");

-- CreateIndex
CREATE INDEX "Class_schoolId_idx" ON "Class"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Class_schoolId_name_key" ON "Class"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Event_schoolId_idx" ON "Event"("schoolId");

-- CreateIndex
CREATE INDEX "Exam_schoolId_idx" ON "Exam"("schoolId");

-- CreateIndex
CREATE INDEX "Grade_schoolId_idx" ON "Grade"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Grade_schoolId_level_key" ON "Grade"("schoolId", "level");

-- CreateIndex
CREATE INDEX "Lesson_schoolId_idx" ON "Lesson"("schoolId");

-- CreateIndex
CREATE INDEX "Parent_schoolId_idx" ON "Parent"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_schoolId_username_key" ON "Parent"("schoolId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_schoolId_email_key" ON "Parent"("schoolId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Parent_schoolId_phone_key" ON "Parent"("schoolId", "phone");

-- CreateIndex
CREATE INDEX "Result_schoolId_idx" ON "Result"("schoolId");

-- CreateIndex
CREATE INDEX "Student_schoolId_idx" ON "Student"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_username_key" ON "Student"("schoolId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_email_key" ON "Student"("schoolId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_phone_key" ON "Student"("schoolId", "phone");

-- CreateIndex
CREATE INDEX "Subject_schoolId_idx" ON "Subject"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_name_key" ON "Subject"("schoolId", "name");

-- CreateIndex
CREATE INDEX "Teacher_schoolId_idx" ON "Teacher"("schoolId");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_schoolId_username_key" ON "Teacher"("schoolId", "username");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_schoolId_email_key" ON "Teacher"("schoolId", "email");

-- CreateIndex
CREATE UNIQUE INDEX "Teacher_schoolId_phone_key" ON "Teacher"("schoolId", "phone");

-- AddForeignKey
ALTER TABLE "Admin" ADD CONSTRAINT "Admin_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SchoolSettings" ADD CONSTRAINT "SchoolSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AcademicYear" ADD CONSTRAINT "AcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Student" ADD CONSTRAINT "Student_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Parent"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Teacher" ADD CONSTRAINT "Teacher_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Parent" ADD CONSTRAINT "Parent_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Grade" ADD CONSTRAINT "Grade_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_supervisorId_fkey" FOREIGN KEY ("supervisorId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicYear" ADD CONSTRAINT "StudentAcademicYear_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicYear" ADD CONSTRAINT "StudentAcademicYear_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicYear" ADD CONSTRAINT "StudentAcademicYear_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicYear" ADD CONSTRAINT "StudentAcademicYear_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StudentAcademicYear" ADD CONSTRAINT "StudentAcademicYear_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Subject" ADD CONSTRAINT "Subject_gradeId_fkey" FOREIGN KEY ("gradeId") REFERENCES "Grade"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Lesson" ADD CONSTRAINT "Lesson_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Exam" ADD CONSTRAINT "Exam_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Assignment" ADD CONSTRAINT "Assignment_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Result" ADD CONSTRAINT "Result_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Event" ADD CONSTRAINT "Event_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Announcement" ADD CONSTRAINT "Announcement_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_academicYearId_fkey" FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_examId_fkey" FOREIGN KEY ("examId") REFERENCES "Exam"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Submission" ADD CONSTRAINT "Submission_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_submissionId_fkey" FOREIGN KEY ("submissionId") REFERENCES "Submission"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_questionId_fkey" FOREIGN KEY ("questionId") REFERENCES "Question"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeacherClasses" ADD CONSTRAINT "_TeacherClasses_A_fkey" FOREIGN KEY ("A") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_TeacherClasses" ADD CONSTRAINT "_TeacherClasses_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassToEvent" ADD CONSTRAINT "_ClassToEvent_A_fkey" FOREIGN KEY ("A") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassToEvent" ADD CONSTRAINT "_ClassToEvent_B_fkey" FOREIGN KEY ("B") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassToMessage" ADD CONSTRAINT "_ClassToMessage_A_fkey" FOREIGN KEY ("A") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ClassToMessage" ADD CONSTRAINT "_ClassToMessage_B_fkey" FOREIGN KEY ("B") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnnouncementToClass" ADD CONSTRAINT "_AnnouncementToClass_A_fkey" FOREIGN KEY ("A") REFERENCES "Announcement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_AnnouncementToClass" ADD CONSTRAINT "_AnnouncementToClass_B_fkey" FOREIGN KEY ("B") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToStudent" ADD CONSTRAINT "_MessageToStudent_A_fkey" FOREIGN KEY ("A") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToStudent" ADD CONSTRAINT "_MessageToStudent_B_fkey" FOREIGN KEY ("B") REFERENCES "Student"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToParent" ADD CONSTRAINT "_MessageToParent_A_fkey" FOREIGN KEY ("A") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToParent" ADD CONSTRAINT "_MessageToParent_B_fkey" FOREIGN KEY ("B") REFERENCES "Parent"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToTeacher" ADD CONSTRAINT "_MessageToTeacher_A_fkey" FOREIGN KEY ("A") REFERENCES "Message"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_MessageToTeacher" ADD CONSTRAINT "_MessageToTeacher_B_fkey" FOREIGN KEY ("B") REFERENCES "Teacher"("id") ON DELETE CASCADE ON UPDATE CASCADE;
