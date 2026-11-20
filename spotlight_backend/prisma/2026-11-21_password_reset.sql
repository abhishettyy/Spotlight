-- One-time database update: forgot-password codes.
-- Run once against the production database (phpMyAdmin > SQL) before deploying the new backend.
-- Matches schema.prisma (model PasswordReset). Adds a new table only; no existing data changes.
CREATE TABLE IF NOT EXISTS `PasswordReset` (
  `email` VARCHAR(191) NOT NULL,
  `code_hash` VARCHAR(191) NOT NULL,
  `expires_at` DATETIME(3) NOT NULL,
  `attempts` INT NOT NULL DEFAULT 0,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  PRIMARY KEY (`email`)
) DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
