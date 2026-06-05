-- Make lesson linkage optional for assignments and store the responsible teacher directly.
ALTER TABLE "Assignment" ADD COLUMN "teacherId" TEXT;

ALTER TABLE "Assignment" DROP CONSTRAINT IF EXISTS "Assignment_lessonId_fkey";

ALTER TABLE "Assignment" ALTER COLUMN "lessonId" DROP NOT NULL;

ALTER TABLE "Assignment"
ADD CONSTRAINT "Assignment_lessonId_fkey"
FOREIGN KEY ("lessonId") REFERENCES "Lesson"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Assignment"
ADD CONSTRAINT "Assignment_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Assignment_teacherId_idx" ON "Assignment"("teacherId");

UPDATE "Assignment" AS assignment
SET "teacherId" = lesson."teacherId"
FROM "Lesson" AS lesson
WHERE assignment."lessonId" = lesson."id"
  AND assignment."teacherId" IS NULL;
