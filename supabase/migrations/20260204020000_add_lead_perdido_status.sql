-- Add LEAD_PERDIDO to status_sdr column
-- This migration adds the new "Lead Perdido" status for the SDR Kanban board

-- Note: If there's a CHECK constraint on status_sdr, you may need to update it
-- If using a simple text/varchar column, no changes needed in the database

-- Update any existing constraint if present (PostgreSQL)
-- First, check if there's an enum or constraint that needs updating

-- If status_sdr is an ENUM type, add the new value:
-- ALTER TYPE status_sdr_type ADD VALUE IF NOT EXISTS 'LEAD_PERDIDO';

-- If there's a CHECK constraint, it would need to be dropped and recreated:
-- Example (adjust constraint name as needed):
-- ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_sdr_check;
-- ALTER TABLE leads ADD CONSTRAINT leads_status_sdr_check 
--   CHECK (status_sdr IN ('MEUS_LEADS', 'QUALIFICACAO', 'PERTO_REUNIAO', 'ENCAMINHADO_REUNIAO', 'VENDEU', 'LEAD_PERDIDO'));

-- For now, assuming the column is a simple text/varchar without constraints,
-- no SQL changes are required. The application will handle the new status value.

SELECT 'LEAD_PERDIDO status added to application' AS migration_note;
