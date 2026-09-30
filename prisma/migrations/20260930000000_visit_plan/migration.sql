-- DropForeignKey
ALTER TABLE "asset" DROP CONSTRAINT "asset_service_point_id_fkey";

-- DropTable
DROP TABLE "asset";

-- DropTable
DROP TABLE "service_point";

-- CreateTable
CREATE TABLE "visit_plan" (
    "id" SERIAL NOT NULL,
    "round" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "dept_seq" INTEGER,
    "service_type" TEXT,
    "service_name" TEXT NOT NULL,
    "village_code" TEXT,
    "village" TEXT,
    "subdistrict" TEXT,
    "district" TEXT,
    "province" TEXT,
    "install_location" TEXT,
    "provider" TEXT,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "project" TEXT,
    "phone" TEXT,
    "phone_source" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "visit_plan_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visit_plan_department_idx" ON "visit_plan"("department");

-- CreateIndex
CREATE INDEX "visit_plan_round_idx" ON "visit_plan"("round");

-- CreateIndex
CREATE INDEX "visit_plan_district_idx" ON "visit_plan"("district");

-- CreateIndex
CREATE UNIQUE INDEX "visit_plan_round_department_service_name_village_code_key" ON "visit_plan"("round", "department", "service_name", "village_code");

