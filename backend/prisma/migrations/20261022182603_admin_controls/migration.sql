-- AlterTable
ALTER TABLE "placements" ADD COLUMN     "title" TEXT,
ALTER COLUMN "application_id" DROP NOT NULL;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "is_active" BOOLEAN NOT NULL DEFAULT true;
