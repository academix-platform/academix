-- Mark final grades edited by hand so promotion doesn't overwrite them.
ALTER TABLE "StudentFinalResult" ADD COLUMN "isManual" BOOLEAN NOT NULL DEFAULT false;

-- Manual edits were saved with assessmentCount = 0; computed ones always have > 0.
UPDATE "StudentFinalResult" SET "isManual" = true WHERE "assessmentCount" = 0;
