-- Migration: Feature Closer & Agenda
-- Description: Adiciona colunas para role closer, status_closer, nova tabela de reunioes e atualiza constraints.

BEGIN;

-- 1. Atualizações em PROFILES
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS link_reuniao TEXT;

-- Atualizar CHECK constraint de role para permitir 'closer'
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'sdr', 'closer'));

-- 2. Atualizações em LEADS
ALTER TABLE leads ADD COLUMN IF NOT EXISTS owner_closer_id UUID REFERENCES profiles(id) ON DELETE SET NULL;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS status_closer TEXT CHECK (status_closer IS NULL OR status_closer IN ('REUNIAO_MARCADA', 'NO_SHOW', 'ACOMPANHAMENTO', 'FECHAMENTO', 'GANHOU', 'PERDEU'));
ALTER TABLE leads ADD COLUMN IF NOT EXISTS motivo_perda TEXT;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS valor_venda NUMERIC;

-- Atualizar CHECK constraint de status_sdr para permitir 'NO_SHOW' (adicionado previamente com o patch do CRM)
ALTER TABLE leads DROP CONSTRAINT IF EXISTS leads_status_sdr_check;
ALTER TABLE leads ADD CONSTRAINT leads_status_sdr_check CHECK (status_sdr IS NULL OR status_sdr IN ('MEUS_LEADS', 'QUALIFICACAO', 'PERTO_REUNIAO', 'ENCAMINHADO_REUNIAO', 'VENDEU', 'LEAD_PERDIDO', 'NAO_RESPONDEU', 'NO_SHOW'));

-- 3. Nova tabela REUNIOES
CREATE TABLE IF NOT EXISTS reunioes (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  lead_id BIGINT REFERENCES leads(id) ON DELETE CASCADE,
  sdr_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  closer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  data_hora TIMESTAMPTZ NOT NULL,
  status TEXT CHECK (status IN ('AGENDADA', 'REALIZADA', 'NO_SHOW', 'CANCELADA')) DEFAULT 'AGENDADA',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_reunioes_lead_id ON reunioes(lead_id);
CREATE INDEX IF NOT EXISTS idx_reunioes_closer_id ON reunioes(closer_id);
CREATE INDEX IF NOT EXISTS idx_reunioes_data_hora ON reunioes(data_hora);

-- Trigger de updated_at para reunioes
DROP TRIGGER IF EXISTS update_reunioes_updated_at ON reunioes;
CREATE TRIGGER update_reunioes_updated_at
  BEFORE UPDATE ON reunioes
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 4. RLS - Row Level Security para Reunioes
ALTER TABLE reunioes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select reunioes"
  ON reunioes FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can insert reunioes"
  ON reunioes FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can update reunioes"
  ON reunioes FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can delete reunioes"
  ON reunioes FOR DELETE TO authenticated USING (true);

COMMIT;
