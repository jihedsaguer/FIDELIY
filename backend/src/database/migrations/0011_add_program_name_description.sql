-- Migration: Add name and description columns to programs table
-- Purpose: Support programme metadata for enhanced programme creation and updates
-- Created: 2026-11-15
-- Author: FIDELIY Stabilization Task

ALTER TABLE "programs" 
  ADD COLUMN "name" VARCHAR(255);

ALTER TABLE "programs" 
  ADD COLUMN "description" VARCHAR(1000);

-- Add RLS policies for new columns (inherited from table-level policies)
-- The existing policies on the programs table will automatically apply to these new columns

-- Note: Existing programmes will have NULL values for name and description
-- This is acceptable as the enhanced DTOs and update methods will handle NULL values
