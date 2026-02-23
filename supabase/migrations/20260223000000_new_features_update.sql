-- Migration: Add new features fields and statuses (Observacoes, Lixeira, Novos Status)
-- Created: 2026-02-23

-- 1. Adicionar novas colunas se não existirem
ALTER TABLE leads ADD COLUMN IF NOT EXISTS observacoes TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- 2. Atualizar a constraint de status para incluir os novos estágios do Kanban
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_sdr_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_sdr_check CHECK (
  status_sdr IS NULL OR 
  status_sdr IN (
    'MEUS_LEADS', 
    'QUALIFICACAO', 
    'PERTO_REUNIAO', 
    'ENCAMINHADO_REUNIAO', 
    'VENDEU', 
    'LEAD_PERDIDO', 
    'NAO_RESPONDEU'
  )
);
