-- Keep the existing database column in Prisma's migration history.
ALTER TABLE "Answer" ADD COLUMN IF NOT EXISTS "isOverridden" BOOLEAN NOT NULL DEFAULT false;
