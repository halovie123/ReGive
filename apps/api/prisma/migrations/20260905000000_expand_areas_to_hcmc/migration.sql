-- Expand service areas from four Hóc Môn communes to all 22 districts of
-- Ho Chi Minh City.
--
-- BA_DIEM, XUAN_THOI_SON and DONG_THANH are communes *inside* Hóc Môn
-- district, so members who selected them are folded into HOC_MON — nobody
-- loses coverage. Existing members keep every area they chose that still
-- exists (HOC_MON).

-- 1. Fold commune memberships into the district, without creating duplicate
--    (user_id, area_code) rows for members who already had HOC_MON.
INSERT INTO "user_areas" ("id", "user_id", "area_code", "created_at")
SELECT gen_random_uuid(), ua."user_id", 'HOC_MON'::"area_code", CURRENT_TIMESTAMP
FROM (SELECT DISTINCT "user_id" FROM "user_areas"
      WHERE "area_code" IN ('BA_DIEM', 'XUAN_THOI_SON', 'DONG_THANH')) ua
ON CONFLICT ("user_id", "area_code") DO NOTHING;

DELETE FROM "user_areas"
WHERE "area_code" IN ('BA_DIEM', 'XUAN_THOI_SON', 'DONG_THANH');

-- 2. Drop the retired commune rows (user_areas no longer references them,
--    so the ON DELETE RESTRICT foreign key is satisfied).
DELETE FROM "areas"
WHERE "code" IN ('BA_DIEM', 'XUAN_THOI_SON', 'DONG_THANH');

-- 3. Swap the enum type for one covering every district. Postgres cannot
--    remove a value from an enum in place, so the type is rebuilt and both
--    dependent columns are re-typed against it.
--
--    The foreign key must be dropped first: re-typing "areas"."code" while
--    "user_areas"."area_code" still has the old type makes Postgres
--    re-validate the constraint across two different enum types and fail
--    with 42804 (incompatible types).
ALTER TABLE "user_areas" DROP CONSTRAINT "user_areas_area_code_fkey";

ALTER TYPE "area_code" RENAME TO "area_code_old";

CREATE TYPE "area_code" AS ENUM (
    'QUAN_1', 'QUAN_3', 'QUAN_4', 'QUAN_5', 'QUAN_6', 'QUAN_7', 'QUAN_8',
    'QUAN_10', 'QUAN_11', 'QUAN_12', 'THU_DUC', 'BINH_THANH', 'GO_VAP',
    'PHU_NHUAN', 'TAN_BINH', 'TAN_PHU', 'BINH_TAN', 'HOC_MON', 'CU_CHI',
    'BINH_CHANH', 'NHA_BE', 'CAN_GIO'
);

ALTER TABLE "areas"
    ALTER COLUMN "code" TYPE "area_code" USING ("code"::text::"area_code");

ALTER TABLE "user_areas"
    ALTER COLUMN "area_code" TYPE "area_code" USING ("area_code"::text::"area_code");

ALTER TABLE "user_areas"
    ADD CONSTRAINT "user_areas_area_code_fkey"
    FOREIGN KEY ("area_code") REFERENCES "areas"("code") ON DELETE RESTRICT ON UPDATE CASCADE;

DROP TYPE "area_code_old";

-- 4. Seed every district. HOC_MON already exists and is left untouched so
--    existing memberships keep their foreign key.
INSERT INTO "areas" ("code", "name_vi", "active", "updated_at") VALUES
    ('QUAN_1', 'Quận 1', true, CURRENT_TIMESTAMP),
    ('QUAN_3', 'Quận 3', true, CURRENT_TIMESTAMP),
    ('QUAN_4', 'Quận 4', true, CURRENT_TIMESTAMP),
    ('QUAN_5', 'Quận 5', true, CURRENT_TIMESTAMP),
    ('QUAN_6', 'Quận 6', true, CURRENT_TIMESTAMP),
    ('QUAN_7', 'Quận 7', true, CURRENT_TIMESTAMP),
    ('QUAN_8', 'Quận 8', true, CURRENT_TIMESTAMP),
    ('QUAN_10', 'Quận 10', true, CURRENT_TIMESTAMP),
    ('QUAN_11', 'Quận 11', true, CURRENT_TIMESTAMP),
    ('QUAN_12', 'Quận 12', true, CURRENT_TIMESTAMP),
    ('THU_DUC', 'TP. Thủ Đức', true, CURRENT_TIMESTAMP),
    ('BINH_THANH', 'Bình Thạnh', true, CURRENT_TIMESTAMP),
    ('GO_VAP', 'Gò Vấp', true, CURRENT_TIMESTAMP),
    ('PHU_NHUAN', 'Phú Nhuận', true, CURRENT_TIMESTAMP),
    ('TAN_BINH', 'Tân Bình', true, CURRENT_TIMESTAMP),
    ('TAN_PHU', 'Tân Phú', true, CURRENT_TIMESTAMP),
    ('BINH_TAN', 'Bình Tân', true, CURRENT_TIMESTAMP),
    ('HOC_MON', 'Hóc Môn', true, CURRENT_TIMESTAMP),
    ('CU_CHI', 'Củ Chi', true, CURRENT_TIMESTAMP),
    ('BINH_CHANH', 'Bình Chánh', true, CURRENT_TIMESTAMP),
    ('NHA_BE', 'Nhà Bè', true, CURRENT_TIMESTAMP),
    ('CAN_GIO', 'Cần Giờ', true, CURRENT_TIMESTAMP)
ON CONFLICT ("code") DO UPDATE SET
    "name_vi" = EXCLUDED."name_vi",
    "active" = true,
    "updated_at" = CURRENT_TIMESTAMP;
