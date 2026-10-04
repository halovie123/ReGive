-- History of automatic screening (listing-risk.ts): one row per screening,
-- kept after edits so the moderation queue can show why a listing was held
-- or hidden. reasons holds RiskReason codes.

-- CreateEnum
CREATE TYPE "risk_level" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateTable
CREATE TABLE "listing_risk_assessments" (
    "id" UUID NOT NULL,
    "listing_id" UUID NOT NULL,
    "level" "risk_level" NOT NULL,
    "reasons" TEXT[],
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listing_risk_assessments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "listing_risk_assessments_listing_id_created_at_idx" ON "listing_risk_assessments"("listing_id", "created_at");

-- AddForeignKey
ALTER TABLE "listing_risk_assessments" ADD CONSTRAINT "listing_risk_assessments_listing_id_fkey" FOREIGN KEY ("listing_id") REFERENCES "listings"("id") ON DELETE CASCADE ON UPDATE CASCADE;
