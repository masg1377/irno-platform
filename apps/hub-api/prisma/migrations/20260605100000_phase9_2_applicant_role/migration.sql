-- Phase 9.2: Add APPLICANT role to UserRole enum
-- This role is assigned to users who register publicly via Irno ID.
-- It represents a self-registered account not yet reviewed by staff.
-- Staff can later promote to STUDENT, LEAD, or other roles.

ALTER TYPE "UserRole" ADD VALUE IF NOT EXISTS 'APPLICANT';
