-- CreateTable
CREATE TABLE "service_point" (
    "id" SERIAL NOT NULL,
    "contract_no" TEXT NOT NULL,
    "contract_type" TEXT,
    "service_name" TEXT NOT NULL,
    "supplier_name" TEXT NOT NULL,
    "use_at" TEXT NOT NULL,
    "use_at2" TEXT,
    "village" TEXT,
    "subdistrict" TEXT,
    "district" TEXT,
    "province" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "region" TEXT,
    "sector" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "service_point_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "asset" (
    "id" SERIAL NOT NULL,
    "asset_id" TEXT NOT NULL,
    "sub_asset_id" INTEGER,
    "e_asset_id" TEXT,
    "o_asset_id" TEXT,
    "rec_code" TEXT,
    "asset_desc" TEXT NOT NULL,
    "item_code" TEXT,
    "item_desc" TEXT,
    "price" DOUBLE PRECISION,
    "serial_number" TEXT,
    "checked_date" TIMESTAMP(3),
    "erp_rec_doc" TEXT,
    "erp_rec_date" TIMESTAMP(3),
    "life_time" TEXT,
    "warranty_date" TIMESTAMP(3),
    "upload_picture_status" INTEGER,
    "service_point_id" INTEGER NOT NULL,

    CONSTRAINT "asset_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "service_point_service_name_idx" ON "service_point"("service_name");

-- CreateIndex
CREATE INDEX "service_point_district_idx" ON "service_point"("district");

-- CreateIndex
CREATE INDEX "service_point_supplier_name_idx" ON "service_point"("supplier_name");

-- CreateIndex
CREATE UNIQUE INDEX "service_point_contract_no_use_at_key" ON "service_point"("contract_no", "use_at");

-- CreateIndex
CREATE INDEX "asset_service_point_id_idx" ON "asset"("service_point_id");

-- CreateIndex
CREATE INDEX "asset_asset_id_idx" ON "asset"("asset_id");

-- AddForeignKey
ALTER TABLE "asset" ADD CONSTRAINT "asset_service_point_id_fkey" FOREIGN KEY ("service_point_id") REFERENCES "service_point"("id") ON DELETE CASCADE ON UPDATE CASCADE;

