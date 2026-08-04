CREATE TYPE "user_status" AS ENUM ('ACTIVE', 'SUSPENDED', 'DEACTIVATED');
CREATE TYPE "app_role" AS ENUM ('DONOR', 'RECIPIENT', 'VOLUNTEER');
CREATE TYPE "area_code" AS ENUM ('HOC_MON', 'BA_DIEM', 'XUAN_THOI_SON', 'DONG_THANH');

CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "provider_subject" TEXT NOT NULL,
    "encrypted_phone" TEXT,
    "phone_last4" VARCHAR(4),
    "phone_verified_at" TIMESTAMPTZ(3),
    "phone_encryption_key_version" INTEGER,
    "status" "user_status" NOT NULL DEFAULT 'ACTIVE',
    "active_role" "app_role",
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_role_assignments" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "app_role" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_role_assignments_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "areas" (
    "code" "area_code" NOT NULL,
    "name_vi" TEXT NOT NULL,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("code")
);

CREATE UNIQUE INDEX "users_provider_subject_key" ON "users"("provider_subject");
CREATE INDEX "users_status_idx" ON "users"("status");
CREATE UNIQUE INDEX "user_role_assignments_user_id_role_key" ON "user_role_assignments"("user_id", "role");
CREATE INDEX "user_role_assignments_role_idx" ON "user_role_assignments"("role");
CREATE INDEX "areas_active_idx" ON "areas"("active");

ALTER TABLE "user_role_assignments"
ADD CONSTRAINT "user_role_assignments_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

INSERT INTO "areas" ("code", "name_vi", "active", "updated_at") VALUES
    ('HOC_MON', 'Hóc Môn', true, CURRENT_TIMESTAMP),
    ('BA_DIEM', 'Bà Điểm', true, CURRENT_TIMESTAMP),
    ('XUAN_THOI_SON', 'Xuân Thới Sơn', true, CURRENT_TIMESTAMP),
    ('DONG_THANH', 'Đông Thạnh', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
    "name_vi" = EXCLUDED."name_vi",
    "active" = true,
    "updated_at" = CURRENT_TIMESTAMP;
