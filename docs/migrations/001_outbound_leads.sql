-- =====================================================
-- MIGRAÇÃO: Módulo Outbound - Etapa 1
-- Two Legacy CRM · Abril 2025
-- =====================================================

-- 1. Criar ENUM para status do outbound
CREATE TYPE status_outbound AS ENUM ('PARA_PROSPECTAR', 'PROSPECTADO');

-- 2. Criar tabela outbound_leads
CREATE TABLE outbound_leads (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome          TEXT NOT NULL,
  whatsapp      TEXT NOT NULL,
  cidade_estado TEXT NOT NULL,
  email         TEXT,
  instagram     TEXT,
  nome_empresa  TEXT,
  faturamento_estimado TEXT,
  fonte_outbound TEXT NOT NULL DEFAULT 'outros'
    CHECK (fonte_outbound IN ('google_maps', 'indicacao', 'linkedin', 'outros')),
  status_outbound status_outbound NOT NULL DEFAULT 'PARA_PROSPECTAR',
  sdr_id        UUID REFERENCES profiles(id),
  prospectado_at TIMESTAMPTZ,
  transferido_at TIMESTAMPTZ,
  lead_id_principal BIGINT REFERENCES leads(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID NOT NULL REFERENCES profiles(id)
);

-- 3. Índices de performance
CREATE INDEX idx_outbound_status ON outbound_leads(status_outbound);
CREATE INDEX idx_outbound_sdr ON outbound_leads(sdr_id);
CREATE INDEX idx_outbound_created ON outbound_leads(created_at ASC);
CREATE INDEX idx_outbound_prospectado
  ON outbound_leads(prospectado_at DESC)
  WHERE status_outbound = 'PROSPECTADO';

-- 4. Adicionar coluna canal_origem na tabela leads
ALTER TABLE leads ADD COLUMN IF NOT EXISTS canal_origem TEXT DEFAULT 'inbound';
CREATE INDEX idx_leads_canal ON leads(canal_origem);

-- 5. Row Level Security
ALTER TABLE outbound_leads ENABLE ROW LEVEL SECURITY;

-- Admin: acesso total
-- SDR: vê apenas seus leads ou leads ainda não atribuídos
CREATE POLICY "outbound_select_policy" ON outbound_leads
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR sdr_id = auth.uid()
    OR sdr_id IS NULL
  );

CREATE POLICY "outbound_insert_policy" ON outbound_leads
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR created_by = auth.uid()
  );

CREATE POLICY "outbound_update_policy" ON outbound_leads
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR sdr_id = auth.uid()
    OR sdr_id IS NULL
  );

-- 6. Função RPC para transferência atômica (Etapa 5 do PRD, mas criada aqui para ficar pronta)
CREATE OR REPLACE FUNCTION transfer_outbound_to_sdr(
  p_outbound_id BIGINT,
  p_sdr_id UUID
) RETURNS BIGINT AS $$
DECLARE
  v_lead_id BIGINT;
  v_outbound outbound_leads%ROWTYPE;
BEGIN
  -- Busca o lead outbound
  SELECT * INTO v_outbound FROM outbound_leads WHERE id = p_outbound_id;

  IF v_outbound IS NULL THEN
    RAISE EXCEPTION 'Lead outbound não encontrado';
  END IF;

  IF v_outbound.transferido_at IS NOT NULL THEN
    RAISE EXCEPTION 'Lead já foi transferido para o funil';
  END IF;

  -- Insere na tabela principal de leads
  INSERT INTO leads (
    nome, whatsapp, cidade_estado, email, instagram,
    nome_empresa, status_sdr, owner_sdr_id, fonte, canal_origem, created_at
  ) VALUES (
    v_outbound.nome, v_outbound.whatsapp, v_outbound.cidade_estado,
    v_outbound.email, v_outbound.instagram, v_outbound.nome_empresa,
    'MEUS_LEADS', p_sdr_id, 'outbound', 'outbound', now()
  ) RETURNING id INTO v_lead_id;

  -- Marca o outbound como transferido
  UPDATE outbound_leads
  SET transferido_at = now(), lead_id_principal = v_lead_id
  WHERE id = p_outbound_id;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
