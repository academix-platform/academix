-- CreateTable
CREATE TABLE "SubjectPageSettings" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "teacherId" TEXT NOT NULL,
    "announcement" TEXT,
    "description" TEXT,
    "bannerImage" TEXT,
    "sectionsOrder" JSONB NOT NULL DEFAULT '["assignments","lessons","materials"]',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SubjectPageSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "SubjectPageSettings_schoolId_idx" ON "SubjectPageSettings"("schoolId");

-- CreateIndex
CREATE INDEX "SubjectPageSettings_subjectId_idx" ON "SubjectPageSettings"("subjectId");

-- CreateIndex
CREATE INDEX "SubjectPageSettings_teacherId_idx" ON "SubjectPageSettings"("teacherId");

-- CreateIndex
CREATE UNIQUE INDEX "SubjectPageSettings_subjectId_teacherId_key" ON "SubjectPageSettings"("subjectId", "teacherId");

-- AddForeignKey
ALTER TABLE "SubjectPageSettings" ADD CONSTRAINT "SubjectPageSettings_schoolId_fkey" FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectPageSettings" ADD CONSTRAINT "SubjectPageSettings_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SubjectPageSettings" ADD CONSTRAINT "SubjectPageSettings_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
