-- Exams created together for several classes used to be matched by
-- title + start/end time + subject + year. Give each such group a real id.
ALTER TABLE "Exam" ADD COLUMN "groupId" TEXT;

-- Backfill with the same rule the app used, so existing groups keep working.
UPDATE "Exam"
SET "groupId" = md5(
  concat_ws('|',
    "schoolId"::text,
    "academicYearId"::text,
    coalesce("subjectId"::text, ''),
    "title",
    "startTime"::text,
    "endTime"::text
  )
);

ALTER TABLE "Exam" ALTER COLUMN "groupId" SET NOT NULL;

CREATE INDEX "Exam_groupId_idx" ON "Exam"("groupId");
