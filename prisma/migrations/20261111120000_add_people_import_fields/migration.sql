-- Students get a national ID, unique in their school. It stays empty for
-- students added before it was required, and PostgreSQL lets many rows share
-- an empty (NULL) ID. Blood type, address and birthday become optional, and a
-- page read no longer needs a printed sheet, so people imports share the limit.
-- Nothing is dropped or rewritten, so no existing row changes.

-- AlterTable
ALTER TABLE "Student" ADD COLUMN     "nationalId" TEXT,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "bloodType" DROP NOT NULL,
ALTER COLUMN "birthday" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Teacher" ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "bloodType" DROP NOT NULL,
ALTER COLUMN "birthday" DROP NOT NULL;

-- AlterTable
ALTER TABLE "Parent" ALTER COLUMN "address" DROP NOT NULL;

-- AlterTable
ALTER TABLE "EntrySheetRead" ALTER COLUMN "sheetId" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Student_schoolId_nationalId_key" ON "Student"("schoolId", "nationalId");

