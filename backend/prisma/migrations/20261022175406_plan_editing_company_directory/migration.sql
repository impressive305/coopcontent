-- AlterEnum
ALTER TYPE "PlanSource" ADD VALUE 'MANUAL';

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "address" TEXT,
ADD COLUMN     "contact_email" TEXT,
ADD COLUMN     "coop_open" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "description" TEXT,
ADD COLUMN     "majors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "website" TEXT,
ALTER COLUMN "user_id" DROP NOT NULL,
ALTER COLUMN "cr_number" DROP NOT NULL;

-- AlterTable
ALTER TABLE "training_plans" ALTER COLUMN "major_key" DROP NOT NULL,
ALTER COLUMN "track_key" DROP NOT NULL;
