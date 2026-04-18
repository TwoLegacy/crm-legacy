-- =====================================================
-- MIGRAÇÃO: Módulo Remarketing - Etapa 1
-- Two Legacy CRM · Abril 2025
-- =====================================================

-- 1. Criar ENUM para status do remarketing
CREATE TYPE status_remarketing AS ENUM ('PARA_PROSPECTAR', 'PROSPECTADO');

-- 2. Criar tabela remarketing_leads
CREATE TABLE remarketing_leads (
  id            BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome          TEXT NOT NULL,
  whatsapp      TEXT NOT NULL,
  cidade_estado TEXT NOT NULL,
  email         TEXT,
  instagram     TEXT,
  nome_empresa  TEXT,
  faturamento_estimado TEXT,
  fonte_remarketing TEXT NOT NULL DEFAULT 'outros'
    CHECK (fonte_remarketing IN ('google_maps', 'indicacao', 'linkedin', 'outros')),
  status_remarketing status_remarketing NOT NULL DEFAULT 'PARA_PROSPECTAR',
  sdr_id        UUID REFERENCES profiles(id),
  prospectado_at TIMESTAMPTZ,
  transferido_at TIMESTAMPTZ,
  lead_id_principal BIGINT REFERENCES leads(id),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by    UUID NOT NULL REFERENCES profiles(id)
);

-- 3. Índices de performance
CREATE INDEX idx_remarketing_status ON remarketing_leads(status_remarketing);
CREATE INDEX idx_remarketing_sdr ON remarketing_leads(sdr_id);
CREATE INDEX idx_remarketing_created ON remarketing_leads(created_at ASC);
CREATE INDEX idx_remarketing_prospectado
  ON remarketing_leads(prospectado_at DESC)
  WHERE status_remarketing = 'PROSPECTADO';

-- 4. Row Level Security
ALTER TABLE remarketing_leads ENABLE ROW LEVEL SECURITY;

-- Admin e Marketing: acesso total
-- SDR: vê apenas seus leads ou leads ainda não atribuídos
CREATE POLICY "remarketing_select_policy" ON remarketing_leads
  FOR SELECT USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'marketing'))
    OR sdr_id = auth.uid()
    OR sdr_id IS NULL
  );

CREATE POLICY "remarketing_insert_policy" ON remarketing_leads
  FOR INSERT WITH CHECK (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'marketing'))
    OR created_by = auth.uid()
  );

CREATE POLICY "remarketing_update_policy" ON remarketing_leads
  FOR UPDATE USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role IN ('admin', 'marketing'))
    OR sdr_id = auth.uid()
    OR sdr_id IS NULL
  );

-- 5. Função RPC para transferência atômica
CREATE OR REPLACE FUNCTION transfer_remarketing_to_sdr(
  p_remarketing_id BIGINT,
  p_sdr_id UUID,
  p_fonte TEXT DEFAULT 'remarketing'
) RETURNS BIGINT AS $$
DECLARE
  v_lead_id BIGINT;
  v_remarketing remarketing_leads%ROWTYPE;
BEGIN
  -- Busca o lead remarketing
  SELECT * INTO v_remarketing FROM remarketing_leads WHERE id = p_remarketing_id;

  IF v_remarketing IS NULL THEN
    RAISE EXCEPTION 'Lead de remarketing não encontrado';
  END IF;

  IF v_remarketing.transferido_at IS NOT NULL THEN
    RAISE EXCEPTION 'Lead já foi transferido para o funil';
  END IF;

  -- Insere na tabela principal de leads
  -- Nota: canal_origem foi criado pela migração de outbound
  INSERT INTO leads (
    nome, whatsapp, cidade_estado, email, instagram,
    nome_empresa, status_sdr, owner_sdr_id, fonte, canal_origem, created_at
  ) VALUES (
    v_remarketing.nome, v_remarketing.whatsapp, v_remarketing.cidade_estado,
    v_remarketing.email, v_remarketing.instagram, v_remarketing.nome_empresa,
    'MEUS_LEADS', p_sdr_id, p_fonte, 'remarketing', now()
  ) RETURNING id INTO v_lead_id;

  -- Marca o remarketing como transferido
  UPDATE remarketing_leads
  SET transferido_at = now(), lead_id_principal = v_lead_id
  WHERE id = p_remarketing_id;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Função para reverter transferência
CREATE OR REPLACE FUNCTION revert_remarketing_from_sdr(
  p_lead_id BIGINT
) RETURNS VOID AS $$
DECLARE
  v_remarketing_id BIGINT;
BEGIN
  -- Busca o remarketing original
  SELECT id INTO v_remarketing_id
  FROM remarketing_leads
  WHERE lead_id_principal = p_lead_id;

  IF v_remarketing_id IS NULL THEN
    RAISE EXCEPTION 'Link com remarketing não encontrado para este lead';
  END IF;

  -- Remove o link do remarketing
  UPDATE remarketing_leads
  SET transferido_at = NULL, lead_id_principal = NULL, status_remarketing = 'PROSPECTADO'
  WHERE id = v_remarketing_id;

  -- Deleta o lead do funil principal
  DELETE FROM leads WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
