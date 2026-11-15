-- Add device-based logo upload support to businesses table
-- Maintains backward compatibility with existing logo_url URLs
-- New columns store processed image metadata and storage key

ALTER TABLE "businesses" ADD COLUMN "logo_storage_key" varchar(255);
ALTER TABLE "businesses" ADD COLUMN "logo_filename" varchar(255);
ALTER TABLE "businesses" ADD COLUMN "logo_width" integer;
ALTER TABLE "businesses" ADD COLUMN "logo_height" integer;
ALTER TABLE "businesses" ADD COLUMN "logo_mime_type" varchar(50);
ALTER TABLE "businesses" ADD COLUMN "logo_uploaded_at" timestamp;

-- Create index for logo_storage_key to support retrieval lookups
CREATE INDEX IF NOT EXISTS "businesses_logo_storage_key_idx" ON "businesses" USING btree ("logo_storage_key");
