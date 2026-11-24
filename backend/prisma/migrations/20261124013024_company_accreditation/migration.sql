-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "accredited" BOOLEAN NOT NULL DEFAULT false;

-- Companies that registered themselves (they have an account) carry the badge;
-- companies the admin added to the directory start without it.
UPDATE "companies" SET "accredited" = true WHERE "user_id" IS NOT NULL;
