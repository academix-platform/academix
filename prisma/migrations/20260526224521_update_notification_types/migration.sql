-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "NotificationType" ADD VALUE 'ASSIGNMENT_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'GRADE_POSTED';
ALTER TYPE "NotificationType" ADD VALUE 'GRADE_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'NEW_EVENT';
ALTER TYPE "NotificationType" ADD VALUE 'SCHEDULE_UPDATED';
ALTER TYPE "NotificationType" ADD VALUE 'ATTENDANCE_SAVED';
ALTER TYPE "NotificationType" ADD VALUE 'SUPERVISOR_ASSIGNED';
