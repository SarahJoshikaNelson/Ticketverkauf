-- Migration: Add activatedAt timestamp column to ticket table
-- This column stores when a ticket was activated/scanned

ALTER TABLE ticket ADD COLUMN IF NOT EXISTS activatedat TIMESTAMP;
