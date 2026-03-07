-- AlterTable
ALTER TABLE "uso_service_point" ADD COLUMN "upload_status" TEXT;
ALTER TABLE "uso_service_point" ADD COLUMN "uploaded_at" TIMESTAMPTZ;

-- CreateIndex
CREATE INDEX "uso_service_point_upload_status_idx" ON "uso_service_point"("upload_status");
