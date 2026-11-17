CREATE TABLE "GradeComponent" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "key" TEXT,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "GradeComponent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GradeScheme" (
    "id" SERIAL NOT NULL,
    "schoolId" INTEGER NOT NULL,
    "teacherId" TEXT NOT NULL,
    "classId" INTEGER NOT NULL,
    "subjectId" INTEGER NOT NULL,
    "academicYearId" INTEGER NOT NULL,
    "semester" "AcademicSemester" NOT NULL,

    CONSTRAINT "GradeScheme_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GradeSchemeComponent" (
    "id" SERIAL NOT NULL,
    "schemeId" INTEGER NOT NULL,
    "componentId" INTEGER NOT NULL,
    "weight" DECIMAL(5,2) NOT NULL,

    CONSTRAINT "GradeSchemeComponent_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Exam" ADD COLUMN "gradeSchemeComponentId" INTEGER;
ALTER TABLE "Assignment" ADD COLUMN "gradeSchemeComponentId" INTEGER;

CREATE UNIQUE INDEX "GradeComponent_schoolId_name_key"
ON "GradeComponent"("schoolId", "name");
CREATE UNIQUE INDEX "GradeComponent_schoolId_key_key"
ON "GradeComponent"("schoolId", "key");
CREATE INDEX "GradeComponent_schoolId_idx"
ON "GradeComponent"("schoolId");
CREATE UNIQUE INDEX "GradeScheme_schoolId_teacherId_classId_subjectId_academicYearId_semester_key"
ON "GradeScheme"("schoolId", "teacherId", "classId", "subjectId", "academicYearId", "semester");
CREATE INDEX "GradeScheme_schoolId_academicYearId_semester_idx"
ON "GradeScheme"("schoolId", "academicYearId", "semester");
CREATE INDEX "GradeScheme_teacherId_classId_idx"
ON "GradeScheme"("teacherId", "classId");
CREATE UNIQUE INDEX "GradeSchemeComponent_schemeId_componentId_key"
ON "GradeSchemeComponent"("schemeId", "componentId");
CREATE INDEX "GradeSchemeComponent_componentId_idx"
ON "GradeSchemeComponent"("componentId");
CREATE INDEX "Exam_gradeSchemeComponentId_idx"
ON "Exam"("gradeSchemeComponentId");
CREATE INDEX "Assignment_gradeSchemeComponentId_idx"
ON "Assignment"("gradeSchemeComponentId");

ALTER TABLE "GradeComponent"
ADD CONSTRAINT "GradeComponent_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeScheme"
ADD CONSTRAINT "GradeScheme_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeScheme"
ADD CONSTRAINT "GradeScheme_teacherId_fkey"
FOREIGN KEY ("teacherId") REFERENCES "Teacher"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeScheme"
ADD CONSTRAINT "GradeScheme_classId_fkey"
FOREIGN KEY ("classId") REFERENCES "Class"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeScheme"
ADD CONSTRAINT "GradeScheme_subjectId_fkey"
FOREIGN KEY ("subjectId") REFERENCES "Subject"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeScheme"
ADD CONSTRAINT "GradeScheme_academicYearId_fkey"
FOREIGN KEY ("academicYearId") REFERENCES "AcademicYear"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeSchemeComponent"
ADD CONSTRAINT "GradeSchemeComponent_schemeId_fkey"
FOREIGN KEY ("schemeId") REFERENCES "GradeScheme"("id")
ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GradeSchemeComponent"
ADD CONSTRAINT "GradeSchemeComponent_componentId_fkey"
FOREIGN KEY ("componentId") REFERENCES "GradeComponent"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Exam"
ADD CONSTRAINT "Exam_gradeSchemeComponentId_fkey"
FOREIGN KEY ("gradeSchemeComponentId") REFERENCES "GradeSchemeComponent"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Assignment"
ADD CONSTRAINT "Assignment_gradeSchemeComponentId_fkey"
FOREIGN KEY ("gradeSchemeComponentId") REFERENCES "GradeSchemeComponent"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
