-- CreateTable
CREATE TABLE "project" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "progress" INTEGER NOT NULL DEFAULT 0,
    "deadline" TIMESTAMP(3),
    "tags" TEXT[],
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "task" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" TEXT NOT NULL DEFAULT 'todo',
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "assignee" TEXT,
    "due_date" TIMESTAMP(3),
    "project_id" INTEGER NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "task_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "uso_service_point" (
    "id" SERIAL NOT NULL,
    "row_number" INTEGER,
    "village_code" TEXT,
    "service_type" TEXT NOT NULL,
    "service_name" TEXT NOT NULL,
    "network_type" TEXT,
    "electric_type" TEXT,
    "village" TEXT,
    "subdistrict" TEXT,
    "district" TEXT NOT NULL,
    "province" TEXT NOT NULL,
    "install_location" TEXT,
    "contract_area" TEXT,
    "contract_number" TEXT,
    "provider" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "service_category" TEXT,
    "zone" TEXT NOT NULL,
    "inspected" BOOLEAN NOT NULL DEFAULT false,
    "inspected_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "uso_service_point_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "uso_service_point_district_idx" ON "uso_service_point"("district");

-- CreateIndex
CREATE INDEX "uso_service_point_zone_idx" ON "uso_service_point"("zone");

-- CreateIndex
CREATE INDEX "uso_service_point_service_name_idx" ON "uso_service_point"("service_name");

-- CreateIndex
CREATE INDEX "uso_service_point_provider_idx" ON "uso_service_point"("provider");

-- CreateIndex
CREATE INDEX "uso_service_point_inspected_idx" ON "uso_service_point"("inspected");

-- AddForeignKey
ALTER TABLE "task" ADD CONSTRAINT "task_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
