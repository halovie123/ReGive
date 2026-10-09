-- Drop the phone-verification columns.
--
-- Phone/OTP sign-in was removed (no paid SMS gateway), taking with it
-- VerifiedPhoneGuard, POST /v1/identity/sync-phone, the Supabase Admin
-- adapter and the AES-256-GCM encryption service. These four columns were
-- that feature's only storage and were verified empty on production before
-- this migration was written (2 users, 0 non-null values across all four).
--
-- Deploy order matters: ship the application code that no longer SELECTs
-- these columns BEFORE running this. profiles.service.ts read phone_last4
-- and phone_verified_at in its /v1/me projection until the same change set
-- that adds this file.
--
-- There is nothing to preserve, so no backup table is taken. Reversing this
-- is a plain ADD COLUMN of four nullable columns.

ALTER TABLE "users"
  DROP COLUMN "encrypted_phone",
  DROP COLUMN "phone_last4",
  DROP COLUMN "phone_verified_at",
  DROP COLUMN "phone_encryption_key_version";
