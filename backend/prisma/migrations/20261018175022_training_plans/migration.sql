-- CreateEnum
CREATE TYPE "PlanSource" AS ENUM ('ENGINE', 'AI');

-- CreateTable
CREATE TABLE "training_plans" (
    "id" SERIAL NOT NULL,
    "student_id" INTEGER NOT NULL,
    "placement_id" INTEGER,
    "major_key" TEXT NOT NULL,
    "track_key" TEXT NOT NULL,
    "duration_weeks" INTEGER NOT NULL,
    "hours_per_week" INTEGER NOT NULL,
    "start_date" TIMESTAMP(3),
    "source" "PlanSource" NOT NULL,
    "model" TEXT,
    "content" JSONB NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_plans_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "training_plans_student_id_is_active_idx" ON "training_plans"("student_id", "is_active");

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "students"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "training_plans" ADD CONSTRAINT "training_plans_placement_id_fkey" FOREIGN KEY ("placement_id") REFERENCES "placements"("id") ON DELETE SET NULL ON UPDATE CASCADE;
