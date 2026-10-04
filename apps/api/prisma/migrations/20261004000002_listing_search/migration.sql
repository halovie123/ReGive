-- Discovery search and filtering.
--
-- search_text is written by the API (toSearchText: lower case, accent-free),
-- so "sach" finds "sách" without Postgres's unaccent extension, which hosts
-- install into different schemas. Rows that existed before this migration
-- keep an empty search_text until their next edit; production had no
-- listings when it was written.

-- AlterTable
ALTER TABLE "listings" ADD COLUMN     "search_text" TEXT NOT NULL DEFAULT '';

-- CreateIndex
CREATE INDEX "listings_status_area_code_published_at_idx" ON "listings"("status", "area_code", "published_at");

-- CreateIndex
CREATE INDEX "listings_status_category_published_at_idx" ON "listings"("status", "category", "published_at");

-- Full-text index for the discovery query, which must use exactly this
-- expression to hit it. Prisma cannot model expression indexes, so it lives
-- only here.
CREATE INDEX "listings_search_text_fts_idx" ON "listings"
    USING GIN (to_tsvector('simple', "search_text"));
