-- Spotlight MySQL Database Schema for GoDaddy cPanel
-- Compatible with MySQL 5.7+ / 8.0+ / MariaDB 10.3+
-- To run: Go to cPanel -> phpMyAdmin -> Select your database -> Import (or SQL tab and paste)

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS `Notification`;
DROP TABLE IF EXISTS `Registration`;
DROP TABLE IF EXISTS `Team`;
DROP TABLE IF EXISTS `Event`;
DROP TABLE IF EXISTS `RegistrationKey`;
DROP TABLE IF EXISTS `Profile`;
DROP TABLE IF EXISTS `Club`;

CREATE TABLE `Club` (
  `id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `logo_url` TEXT NULL,
  `password` VARCHAR(191) NULL,
  `qr_url` TEXT NULL,
  `upi_id` VARCHAR(191) NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Profile` (
  `id` VARCHAR(191) NOT NULL,
  `full_name` VARCHAR(191) NOT NULL,
  `email` VARCHAR(191) NOT NULL UNIQUE,
  `password` VARCHAR(191) NULL,
  `usn` VARCHAR(191) NULL UNIQUE,
  `branch` VARCHAR(191) NULL,
  `phone` VARCHAR(191) NULL,
  `year` INT NULL,
  `sem` INT NULL,
  `club_id` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_profile_club` FOREIGN KEY (`club_id`) REFERENCES `Club` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Event` (
  `id` VARCHAR(191) NOT NULL,
  `club_id` VARCHAR(191) NOT NULL,
  `name` VARCHAR(191) NOT NULL,
  `description` TEXT NOT NULL,
  `event_type` VARCHAR(191) NOT NULL,
  `fee` DOUBLE NOT NULL DEFAULT 0,
  `registration_limit` INT NOT NULL,
  `registration_deadline` DATETIME(3) NOT NULL,
  `event_date` DATETIME(3) NOT NULL,
  `qr_url` TEXT NULL,
  `banner_url` TEXT NULL,
  `venue` VARCHAR(191) NULL,
  `team_size_limit` INT NULL,
  `min_team_size` INT NULL,
  `event_end_date` DATETIME(3) NULL,
  `upi_id` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_event_club` FOREIGN KEY (`club_id`) REFERENCES `Club` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Team` (
  `id` VARCHAR(191) NOT NULL,
  `event_id` VARCHAR(191) NOT NULL,
  `team_name` VARCHAR(191) NOT NULL,
  `passkey` VARCHAR(191) NULL UNIQUE,
  `leader_id` VARCHAR(191) NOT NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_team_event` FOREIGN KEY (`event_id`) REFERENCES `Event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Registration` (
  `id` VARCHAR(191) NOT NULL,
  `event_id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `team_id` VARCHAR(191) NULL,
  `payment_proof_url` TEXT NULL,
  `status` ENUM('PENDING', 'CONFIRMED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `transaction_id` VARCHAR(191) NULL,
  `checked_in_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_registration_event` FOREIGN KEY (`event_id`) REFERENCES `Event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_registration_team` FOREIGN KEY (`team_id`) REFERENCES `Team` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_registration_profile` FOREIGN KEY (`user_id`) REFERENCES `Profile` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `Notification` (
  `id` VARCHAR(191) NOT NULL,
  `user_id` VARCHAR(191) NOT NULL,
  `type` VARCHAR(191) NOT NULL,
  `title` VARCHAR(191) NOT NULL,
  `body` TEXT NOT NULL,
  `is_read` BOOLEAN NOT NULL DEFAULT FALSE,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `event_id` VARCHAR(191) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_notification_event` FOREIGN KEY (`event_id`) REFERENCES `Event` (`id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE `RegistrationKey` (
  `id` VARCHAR(191) NOT NULL,
  `code` VARCHAR(191) NOT NULL UNIQUE,
  `is_used` BOOLEAN NOT NULL DEFAULT FALSE,
  `used_by_club_id` VARCHAR(191) NULL,
  `created_at` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `used_at` DATETIME(3) NULL,
  PRIMARY KEY (`id`),
  CONSTRAINT `fk_registrationkey_club` FOREIGN KEY (`used_by_club_id`) REFERENCES `Club` (`id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
