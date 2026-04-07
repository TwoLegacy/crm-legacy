-- =====================================================
-- FIX: Corrige coluna sdr_id → owner_sdr_id
-- Remove cidade_estado (não existe na tabela leads)
-- Roda DEPOIS da migração 001
-- =====================================================

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
  -- Nota: leads NÃO tem cidade_estado, então não incluímos
  INSERT INTO leads (
    nome, whatsapp, whatsapp_formatado, email, instagram,
    nome_empresa, status_sdr, owner_sdr_id, fonte, canal_origem, created_at
  ) VALUES (
    v_outbound.nome,
    v_outbound.whatsapp,
    regexp_replace(v_outbound.whatsapp, '\D', '', 'g'),
    v_outbound.email,
    v_outbound.instagram,
    v_outbound.nome_empresa,
    'MEUS_LEADS',
    p_sdr_id,
    'outbound',
    'outbound',
    now()
  ) RETURNING id INTO v_lead_id;

  -- Marca o outbound como transferido
  UPDATE outbound_leads
  SET transferido_at = now(),
      lead_id_principal = v_lead_id
  WHERE id = p_outbound_id;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
