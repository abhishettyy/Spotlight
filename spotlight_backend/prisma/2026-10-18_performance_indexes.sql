-- One-time database update for the 2026-10-18 backend optimisation.
-- Run once against the production MySQL database (phpMyAdmin > SQL), before or right after deploying the backend.
-- Matches the @@index entries added to schema.prisma; adding indexes does not change any data.

-- Notifications are always read by user, newest first
CREATE INDEX `idx_notification_user_created` ON `Notification` (`user_id`, `created_at`);

-- Capacity counts (event + status) and "already registered?" checks (event + user + status)
CREATE INDEX `idx_registration_event_status` ON `Registration` (`event_id`, `status`);
CREATE INDEX `idx_registration_event_user_status` ON `Registration` (`event_id`, `user_id`, `status`);

-- Clears stale check-in times on unconfirmed registrations. The ticket scanner used to run this
-- on every scan; nothing sets these any more, so it only needs to run once.
UPDATE `Registration` SET `checked_in_at` = NULL
WHERE `status` IN ('REJECTED', 'PENDING') AND `checked_in_at` IS NOT NULL;
