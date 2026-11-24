-- CreateEnum
CREATE TYPE "Degree" AS ENUM ('DIPLOMA', 'BACHELOR');

-- AlterTable
ALTER TABLE "students" ADD COLUMN     "degree" "Degree";
