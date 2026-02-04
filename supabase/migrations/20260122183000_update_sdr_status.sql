-- Migration: Update SDR Statuses and Fix Constraint
-- Description: Renames 'EM_ATENDIMENTO' to 'QUALIFICACAO', adds 'PERTO_REUNIAO', and updates the check constraint.

BEGIN;

-- 1. Drop the existing constraint to allow updating the values
-- We use IF EXISTS to avoid errors if the constraint name is slightly different, 
-- though the error log confirmed it is 'leads_status_sdr_check'.
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_sdr_check;

-- 2. Migrate existing data: 'EM_ATENDIMENTO' becomes 'QUALIFICACAO'
UPDATE leads
SET status_sdr = 'QUALIFICACAO'
WHERE status_sdr = 'EM_ATENDIMENTO';

-- 3. Add the new constraint with the updated list of allowed statuses
-- allowed: MEUS_LEADS, QUALIFICACAO, PERTO_REUNIAO, ENCAMINHADO_REUNIAO, VENDEU
ALTER TABLE leads
ADD CONSTRAINT leads_status_sdr_check
CHECK (status_sdr IN ('MEUS_LEADS', 'QUALIFICACAO', 'PERTO_REUNIAO', 'ENCAMINHADO_REUNIAO', 'VENDEU'));

-- 4. Update the column comment
COMMENT ON COLUMN leads.status_sdr IS 'Flow: MEUS_LEADS -> QUALIFICACAO -> PERTO_REUNIAO -> ENCAMINHADO_REUNIAO (or VENDEU)';

COMMIT;
