-- Listings: the item a donor offers. Carries an area, never an address or
-- coordinates. Status follows listing-state.ts; nothing becomes PUBLISHED
-- without passing through PENDING_REVIEW.

-- CreateEnum
CREATE TYPE "listing_status" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'RESERVED', 'COMPLETED', 'WITHDRAWN', 'EXPIRED', 'MODERATION_HIDDEN');

-- CreateEnum
CREATE TYPE "item_category" AS ENUM ('HOUSEHOLD', 'CLOTHING', 'BOOKS', 'CHILDREN', 'DEVICES');

-- CreateEnum
CREATE TYPE "item_condition" AS ENUM ('NEW', 'LIKE_NEW', 'GOOD', 'FAIR');

-- CreateTable
CREATE TABLE "listings" (
    "id" UUID NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" VARCHAR(100) NOT NULL,
    "description" VARCHAR(2000) NOT NULL,
    "defects" VARCHAR(800) NOT NULL DEFAULT '',
    "category" "item_category" NOT NULL,
    "condition" "item_condition" NOT NULL,
    "area_code" "area_code" NOT NULL,
    "status" "listing_status" NOT NULL DEFAULT 'DRAFT',
    "published_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "listings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listings_owner_id_created_at_idx" ON "listings"("owner_id", "created_at");

-- CreateIndex
CREATE INDEX "listings_status_published_at_idx" ON "listings"("status", "published_at");

-- CreateIndex
CREATE INDEX "listings_category_idx" ON "listings"("category");

-- CreateIndex
CREATE INDEX "listings_area_code_idx" ON "listings"("area_code");

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listings" ADD CONSTRAINT "listings_area_code_fkey" FOREIGN KEY ("area_code") REFERENCES "areas"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backstops for rules the API already enforces, so a future write path that
-- skips the contract (admin tool, backfill) cannot store what the product
-- forbids. Prisma does not model CHECK constraints; they live only here.
ALTER TABLE "listings" ADD CONSTRAINT "listings_title_length_check"
    CHECK (char_length(btrim("title")) >= 5);
ALTER TABLE "listings" ADD CONSTRAINT "listings_description_length_check"
    CHECK (char_length(btrim("description")) >= 20);

-- Visibility is computed from published_at/expires_at, and there is no
-- background job to fix a PUBLISHED row missing them, so refuse one outright.
ALTER TABLE "listings" ADD CONSTRAINT "listings_published_dates_check"
    CHECK ("status" <> 'PUBLISHED' OR ("published_at" IS NOT NULL AND "expires_at" IS NOT NULL));

-- Closed to Supabase's Data API from birth, like every other table (see
-- 20260907000000_enable_row_level_security). The API connects as the
-- owner, which RLS does not restrict.
ALTER TABLE "listings" ENABLE ROW LEVEL SECURITY;
