-- One-time database update: events can be limited to selected branches.
-- Run once against the production database (phpMyAdmin > SQL) before deploying the new backend.
-- Matches schema.prisma (Event.allowedBranches).
--
-- NULL means the event is open to all branches (every existing event stays open to all).
-- Otherwise it holds a JSON array of branch names exactly as listed in utils/branches.ts,
-- e.g. ["Computer Science and Engineering (CSE)","Information Science and Engineering (ISE)"].
ALTER TABLE `Event` ADD COLUMN `allowed_branches` TEXT NULL;
