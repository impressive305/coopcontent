-- AlterTable
ALTER TABLE "training_plans" ADD COLUMN     "focus" TEXT,
ADD COLUMN     "major" TEXT,
ADD COLUMN     "sector" TEXT;

-- CreateTable
CREATE TABLE "company_logos" (
    "company_id" INTEGER NOT NULL,
    "data" BYTEA NOT NULL,
    "mime_type" TEXT NOT NULL,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "company_logos_pkey" PRIMARY KEY ("company_id")
);

-- AddForeignKey
ALTER TABLE "company_logos" ADD CONSTRAINT "company_logos_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
