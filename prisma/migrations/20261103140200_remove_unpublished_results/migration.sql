-- A Result row is what students, parents and final averages read as a
-- published grade. Rows whose online submission was later unpublished (the
-- grade was changed or the work resubmitted) are stale; publishing the grades
-- again recreates them.
DELETE FROM "Result" r
USING "Submission" s
WHERE r."examId" = s."examId"
  AND r."studentId" = s."studentId"
  AND s."gradePublished" = false;

DELETE FROM "Result" r
USING "AssignmentSubmission" s
WHERE r."assignmentId" = s."assignmentId"
  AND r."studentId" = s."studentId"
  AND s."gradePublished" = false;
