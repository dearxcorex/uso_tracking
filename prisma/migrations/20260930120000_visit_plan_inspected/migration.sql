-- AlterTable
ALTER TABLE "visit_plan" ADD COLUMN     "inspected" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "inspected_at" TIMESTAMP(3);

