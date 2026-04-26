-- AlterTable: organization branding and contact
ALTER TABLE "restaurants" ADD COLUMN "logoUrl" TEXT,
ADD COLUMN "phone" TEXT,
ADD COLUMN "address" TEXT;
