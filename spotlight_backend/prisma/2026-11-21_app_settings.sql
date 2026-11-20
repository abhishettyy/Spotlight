-- One-time database update: settings the admin can change in the admin console.
-- Run once against the production database (phpMyAdmin > SQL) before deploying the new backend.
-- Matches schema.prisma (model AppSetting). Adds a new table only; no existing data changes.
--
-- Key 'club_signup_alert_emails' holds a JSON array of the emails told about each new club sign-up.
-- Set it from the admin console (Settings > Sign-up alerts).
CREATE TABLE IF NOT EXISTS `AppSetting` (
  `key` VARCHAR(191) NOT NULL,
  `value` TEXT NOT NULL,
  `updated_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`key`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
