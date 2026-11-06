-- Scores can be fractional (partial credit, decimal grades); stop truncating them.
ALTER TABLE "Result" ALTER COLUMN "score" SET DATA TYPE DOUBLE PRECISION;
