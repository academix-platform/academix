-- A Result row is what students, parents and final averages read as a
-- published grade. Rows whose online submission was later unpublished (the
-- grade was changed or the work resubmitted) are stale; publishing the grades
-- again recreates them.
--
-- `gradePublished` was added with DEFAULT false, so a Result published before
-- that column existed (or entered by hand next to an online submission) also
-- matches. Every removed row is therefore copied to backup first. It lives in
-- its own schema so Prisma doesn't see it as drift. To restore rows:
--   INSERT INTO "Result" SELECT * FROM backup."Result_removed_20261103140200" WHERE ...;
-- Drop the backup once the data has been checked.

CREATE SCHEMA IF NOT EXISTS backup;

CREATE TABLE backup."Result_removed_20261103140200" AS
SELECT r.*
FROM "Result" r
WHERE EXISTS (
    SELECT 1 FROM "Submission" s
    WHERE s."examId" = r."examId"
      AND s."studentId" = r."studentId"
      AND s."schoolId" = r."schoolId"
      AND s."gradePublished" = false
  )
  OR EXISTS (
    SELECT 1 FROM "AssignmentSubmission" s
    WHERE s."assignmentId" = r."assignmentId"
      AND s."studentId" = r."studentId"
      AND s."schoolId" = r."schoolId"
      AND s."gradePublished" = false
  );

DELETE FROM "Result" r
USING backup."Result_removed_20261103140200" b
WHERE r."id" = b."id";
