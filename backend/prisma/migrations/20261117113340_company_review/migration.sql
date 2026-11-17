-- CreateEnum
CREATE TYPE "CompanyReview" AS ENUM ('PENDING', 'CONTACTED', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "companies" ADD COLUMN     "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "review_status" "CompanyReview" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "reviewed_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "company_notes" (
    "id" SERIAL NOT NULL,
    "company_id" INTEGER NOT NULL,
    "author_id" INTEGER,
    "body" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_notes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "company_notes_company_id_idx" ON "company_notes"("company_id");

-- AddForeignKey
ALTER TABLE "company_notes" ADD CONSTRAINT "company_notes_company_id_fkey" FOREIGN KEY ("company_id") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "company_notes" ADD CONSTRAINT "company_notes_author_id_fkey" FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Companies approved before this workflow existed are approved requests.
UPDATE "companies" SET "review_status" = 'APPROVED', "reviewed_at" = CURRENT_TIMESTAMP WHERE "verified" = true;
