-- Make lesson linkage optional for exams and store the responsible teacher directly.
ALTER TABLE "Exam" ADD COLUMN "teacherId" TEXT;

ALTER TABLE "Exam" DROP CONSTRAINT IF EXISTS "Exam_lessonId_fkey";

ALTER TABLE "Exam" ALTER COLUMN "lessonId" DROP NOT NULL;

ALTER TABLE "Exam"
ADD CONSTRAINT "Exam_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Exam"
ADD CONSTRAINT "Exam_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Exam_teacherId_idx" ON "Exam"("teacherId");

UPDATE "Exam" AS exam
SET "teacherId" = lesson."teacherId"
FROM "Lesson" AS lesson
WHERE exam."lessonId" = lesson."id"
  AND exam."teacherId" IS NULL;
