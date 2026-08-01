-- AlterTable
ALTER TABLE "Column" ADD COLUMN     "order" INTEGER NOT NULL DEFAULT 0;

-- Backfill so existing boards keep the order their owner already sees.
-- Columns were previously selected without an ORDER BY, which in practice
-- returned them in physical (insertion) order, so number them that way per
-- user rather than leaving every row on 0 and letting them shuffle.
UPDATE "Column" AS c
SET "order" = numbered.position
FROM (
    SELECT id, row_number() OVER (PARTITION BY "userId" ORDER BY ctid) - 1 AS position
    FROM "Column"
) AS numbered
WHERE c.id = numbered.id;
