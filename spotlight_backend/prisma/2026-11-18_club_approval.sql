-- One-time database update for club sign-up approval (replaces registration keys).
-- Run once against the production MySQL database (phpMyAdmin > SQL) BEFORE deploying the new backend:
-- the new API reads these columns, and without the UPDATE below no existing club could sign in.
-- Matches schema.prisma.

-- New sign-up details and the approval state. Existing clubs are added as APPROVED (the column
-- default during the ALTER), then the default switches to PENDING for every club that signs up later.
ALTER TABLE `Club`
  ADD COLUMN `description` TEXT NULL,
  ADD COLUMN `department` VARCHAR(191) NULL,
  ADD COLUMN `coordinator_name` VARCHAR(191) NULL,
  ADD COLUMN `coordinator_phone` VARCHAR(191) NULL,
  ADD COLUMN `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'APPROVED',
  ADD COLUMN `rejection_reason` TEXT NULL,
  ADD COLUMN `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  ADD COLUMN `reviewed_at` DATETIME(3) NULL;

ALTER TABLE `Club` ALTER COLUMN `status` SET DEFAULT 'PENDING';

CREATE INDEX `idx_club_status` ON `Club` (`status`);

-- Registration keys are no longer used
DROP TABLE IF EXISTS `RegistrationKey`;

-- The admin signs in with an email address. The password is unchanged.
UPDATE `Profile` SET `email` = 'spotlightapp.help@gmail.com' WHERE `id` = 'admin';
