-- Migration: Add NAME and ORDERNUMBER filler options to design_element table
-- This updates the check constraint to allow the new filler values

-- Drop the existing constraint
ALTER TABLE design_element DROP CONSTRAINT IF EXISTS design_element_filler_check;

-- Add the new constraint with NAME and ORDERNUMBER included
ALTER TABLE design_element ADD CONSTRAINT design_element_filler_check 
    CHECK (filler IN ('CODE', 'DATE', 'TIME', 'NAME', 'ORDERNUMBER'));

