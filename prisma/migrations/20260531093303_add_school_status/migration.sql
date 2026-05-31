-- CreateEnum
CREATE TYPE "SchoolStatus" AS ENUM ('PENDING', 'ACTIVE', 'PAUSED');

-- AlterTable
ALTER TABLE "School" ADD COLUMN     "address" TEXT,
ADD COLUMN     "city" TEXT,
ADD COLUMN     "contactEmail" TEXT,
ADD COLUMN     "contactPhone" TEXT,
ADD COLUMN     "country" TEXT,
ADD COLUMN     "pauseReason" TEXT,
ADD COLUMN     "registrationNumber" TEXT,
ADD COLUMN     "status" "SchoolStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "website" TEXT;

-- AlterTable
ALTER TABLE "SchoolSettings" ADD COLUMN     "workingDays" TEXT[] DEFAULT ARRAY[]::TEXT[];
