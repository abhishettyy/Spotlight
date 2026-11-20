-- One-time database update: events can be saved as drafts and published later.
-- Run once against the production database (phpMyAdmin > SQL) before deploying the new backend.
-- Matches schema.prisma (Event.isDraft). Every existing event stays published (0).
ALTER TABLE `Event` ADD COLUMN `is_draft` TINYINT(1) NOT NULL DEFAULT 0;
