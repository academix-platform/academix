-- A subject name is now unique per grade instead of per school.
-- Existing rows already satisfy the stricter old rule, so no data changes.

-- DropIndex
DROP INDEX "Subject_schoolId_name_key";

-- CreateIndex
CREATE UNIQUE INDEX "Subject_schoolId_gradeId_name_key" ON "Subject"("schoolId", "gradeId", "name");
