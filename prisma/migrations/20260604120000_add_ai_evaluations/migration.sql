CREATE TYPE "AiEvaluationStatus" AS ENUM ('SUGGESTED', 'APPROVED', 'FAILED');

CREATE TABLE "AiEvaluation" (
  "id" SERIAL NOT NULL,
  "schoolId" INTEGER NOT NULL,
  "answerId" INTEGER,
  "assignmentSubmissionId" INTEGER,
  "provider" TEXT NOT NULL DEFAULT 'gemini',
  "model" TEXT NOT NULL,
  "status" "AiEvaluationStatus" NOT NULL DEFAULT 'SUGGESTED',
  "score" DOUBLE PRECISION,
  "maxScore" DOUBLE PRECISION NOT NULL,
  "feedback" TEXT,
  "strengths" JSONB NOT NULL DEFAULT '[]',
  "weaknesses" JSONB NOT NULL DEFAULT '[]',
  "needsReview" BOOLEAN NOT NULL DEFAULT true,
  "error" TEXT,
  "approvedScore" DOUBLE PRECISION,
  "approvedFeedback" TEXT,
  "approvedBy" TEXT,
  "approvedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AiEvaluation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AiEvaluation_answerId_key" ON "AiEvaluation"("answerId");
CREATE UNIQUE INDEX "AiEvaluation_assignmentSubmissionId_key" ON "AiEvaluation"("assignmentSubmissionId");
CREATE INDEX "AiEvaluation_schoolId_idx" ON "AiEvaluation"("schoolId");
CREATE INDEX "AiEvaluation_answerId_idx" ON "AiEvaluation"("answerId");
CREATE INDEX "AiEvaluation_assignmentSubmissionId_idx" ON "AiEvaluation"("assignmentSubmissionId");

ALTER TABLE "AiEvaluation"
ADD CONSTRAINT "AiEvaluation_schoolId_fkey"
FOREIGN KEY ("schoolId") REFERENCES "School"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "AiEvaluation"
ADD CONSTRAINT "AiEvaluation_answerId_fkey"
FOREIGN KEY ("answerId") REFERENCES "Answer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "AiEvaluation"
ADD CONSTRAINT "AiEvaluation_assignmentSubmissionId_fkey"
FOREIGN KEY ("assignmentSubmissionId") REFERENCES "AssignmentSubmission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
