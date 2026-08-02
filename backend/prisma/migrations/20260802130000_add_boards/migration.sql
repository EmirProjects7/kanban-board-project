-- A board now sits between a user and their columns. Written by hand rather
-- than generated, because the generated version drops "Column"."userId" and
-- would take every existing column with it.

-- CreateTable
CREATE TABLE "Board" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "userId" TEXT NOT NULL,

    CONSTRAINT "Board_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Board" ADD CONSTRAINT "Board_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Every existing user gets one board to hold what they already have, so nobody
-- opens the app to an empty screen after this runs.
INSERT INTO "Board" ("id", "title", "order", "userId")
SELECT gen_random_uuid(), 'My Board', 0, "id" FROM "User";

-- Added nullable so the backfill can run before the constraint applies.
ALTER TABLE "Column" ADD COLUMN "boardId" TEXT;

UPDATE "Column" AS c
SET "boardId" = b."id"
FROM "Board" AS b
WHERE b."userId" = c."userId";

ALTER TABLE "Column" ALTER COLUMN "boardId" SET NOT NULL;

-- DropForeignKey
ALTER TABLE "Column" DROP CONSTRAINT "Column_userId_fkey";

-- DropColumn
ALTER TABLE "Column" DROP COLUMN "userId";

-- AddForeignKey
ALTER TABLE "Column" ADD CONSTRAINT "Column_boardId_fkey" FOREIGN KEY ("boardId") REFERENCES "Board"("id") ON DELETE CASCADE ON UPDATE CASCADE;
