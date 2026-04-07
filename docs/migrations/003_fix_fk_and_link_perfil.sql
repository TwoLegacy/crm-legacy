-- =====================================================
-- 003: Fix FK cascade + campo link_perfil + RPC revert
-- =====================================================

-- 1. Corrigir FK constraint para permitir deletar leads
ALTER TABLE outbound_leads
  DROP CONSTRAINT IF EXISTS outbound_leads_lead_id_principal_fkey;

ALTER TABLE outbound_leads
  ADD CONSTRAINT outbound_leads_lead_id_principal_fkey
  FOREIGN KEY (lead_id_principal)
  REFERENCES leads(id)
  ON DELETE SET NULL;

-- 2. Adicionar campo link_perfil para Google Maps / LinkedIn
ALTER TABLE outbound_leads
  ADD COLUMN IF NOT EXISTS link_perfil TEXT DEFAULT NULL;

-- 3. RPC para reverter transferência (devolver do funil → outbound)
CREATE OR REPLACE FUNCTION revert_outbound_from_sdr(
  p_lead_id BIGINT
) RETURNS VOID AS $$
DECLARE
  v_outbound_id BIGINT;
BEGIN
  -- Busca o lead na tabela outbound que aponta para esse lead principal
  SELECT id INTO v_outbound_id
  FROM outbound_leads
  WHERE lead_id_principal = p_lead_id;

  IF v_outbound_id IS NULL THEN
    RAISE EXCEPTION 'Lead outbound não encontrado para lead_id %', p_lead_id;
  END IF;

  -- Reseta o outbound para PROSPECTADO
  UPDATE outbound_leads
  SET transferido_at = NULL,
      lead_id_principal = NULL
  WHERE id = v_outbound_id;

  -- Remove o lead da tabela principal
  DELETE FROM leads WHERE id = p_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
