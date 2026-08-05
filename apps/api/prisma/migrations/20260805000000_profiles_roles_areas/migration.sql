CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "display_name" VARCHAR(80) NOT NULL,
    "bio" VARCHAR(300) NOT NULL DEFAULT '',
    "avatar_key" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "user_areas" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "area_code" "area_code" NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_areas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "profiles_user_id_key" ON "profiles"("user_id");
CREATE UNIQUE INDEX "user_areas_user_id_area_code_key" ON "user_areas"("user_id", "area_code");
CREATE INDEX "user_areas_area_code_idx" ON "user_areas"("area_code");

ALTER TABLE "profiles"
ADD CONSTRAINT "profiles_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_areas"
ADD CONSTRAINT "user_areas_user_id_fkey"
FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "user_areas"
ADD CONSTRAINT "user_areas_area_code_fkey"
FOREIGN KEY ("area_code") REFERENCES "areas"("code") ON DELETE RESTRICT ON UPDATE CASCADE;
