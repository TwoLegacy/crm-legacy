-- Tenta remover a constraint pelo nome padrão
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_sdr_check;

-- Recria a constraint incluindo 'PROSPECTADOS'
ALTER TABLE leads ADD CONSTRAINT leads_status_sdr_check 
CHECK (status_sdr IS NULL OR status_sdr IN ('MEUS_LEADS', 'PROSPECTADOS', 'QUALIFICACAO', 'PERTO_REUNIAO', 'ENCAMINHADO_REUNIAO', 'VENDEU', 'LEAD_PERDIDO', 'NAO_RESPONDEU', 'NO_SHOW'));
