-- Assignments created together for several classes used to be matched by
-- title + start/end date + subject + year. Give each such group a real id.
ALTER TABLE "Assignment" ADD COLUMN "groupId" TEXT;

-- Backfill with the same rule the app used, so existing groups keep working.
UPDATE "Assignment"
SET "groupId" = md5(
  concat_ws('|',
    "schoolId"::text,
    "academicYearId"::text,
    coalesce("subjectId"::text, ''),
    "title",
    "startDate"::text,
    "endDate"::text
  )
);

ALTER TABLE "Assignment" ALTER COLUMN "groupId" SET NOT NULL;

CREATE INDEX "Assignment_groupId_idx" ON "Assignment"("groupId");
