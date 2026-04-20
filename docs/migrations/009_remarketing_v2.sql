-- =====================================================
-- MIGRAÇÃO: Módulo Remarketing - Etapa 2 (V2 Anti-Duplicação CORRIGIDO)
-- Two Legacy CRM · Abril 2025
-- =====================================================

-- 1. Injetar novos Statuses no Remarketing
ALTER TYPE status_remarketing ADD VALUE IF NOT EXISTS 'RESPONDEU';
ALTER TYPE status_remarketing ADD VALUE IF NOT EXISTS 'RECUPERADO';

-- 2. Função RPC para "Reativar" e Roubar Posse de um Lead que JÁ EXISTE no CRM
CREATE OR REPLACE FUNCTION reactivate_lead_from_remarketing(
  p_remarketing_id BIGINT,
  p_lead_id BIGINT,
  p_new_sdr_id UUID,
  p_target_status TEXT,
  p_closer_id UUID DEFAULT NULL
) RETURNS BIGINT AS $function$
BEGIN
  IF EXISTS (SELECT 1 FROM remarketing_leads WHERE id = p_remarketing_id AND transferido_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Este lead de remarketing já foi transferido para o funil principal outrora.';
  END IF;

  -- 2. "Rouba" a posse do lead na tabela principal e define o card para a nova coluna desejada
  UPDATE leads
  SET 
    owner_sdr_id = p_new_sdr_id,
    status_sdr = p_target_status,
    status_closer = CASE WHEN p_target_status = 'ENCAMINHADO_REUNIAO' THEN 'REUNIAO_MARCADA' ELSE status_closer END,
    owner_closer_id = CASE WHEN p_closer_id IS NOT NULL THEN p_closer_id ELSE owner_closer_id END,
    updated_at = now()
  WHERE id = p_lead_id;

  -- 3. Decreta o triunfo no painel do Remarketing
  UPDATE remarketing_leads
  SET 
    status_remarketing = 'RECUPERADO',
    transferido_at = now(),
    lead_id_principal = p_lead_id,
    sdr_id = p_new_sdr_id
  WHERE id = p_remarketing_id;

  RETURN p_lead_id;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Expandir a Função RPC original (Transferência Crua) para habilitar a Rota Dinâmica customizável
CREATE OR REPLACE FUNCTION transfer_remarketing_to_funil_v2(
  p_remarketing_id BIGINT,
  p_sdr_id UUID,
  p_target_status TEXT,
  p_closer_id UUID DEFAULT NULL,
  p_fonte TEXT DEFAULT 'remarketing'
) RETURNS BIGINT AS $function$
DECLARE
  v_lead_id BIGINT;
BEGIN
  IF EXISTS (SELECT 1 FROM remarketing_leads WHERE id = p_remarketing_id AND transferido_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Lead já foi transferido para o funil';
  END IF;

  INSERT INTO leads (
    nome, whatsapp, instagram,
    nome_empresa, observacoes, status_sdr, status_closer, owner_sdr_id, owner_closer_id, fonte, canal_origem, created_at
  )
  SELECT
    nome, whatsapp, instagram,
    nome_empresa, 
    'Cidade/Estado: ' || COALESCE(cidade_estado, 'N/A') || ' | Email: ' || COALESCE(email, 'N/A'),
    p_target_status, 
    CASE WHEN p_target_status = 'ENCAMINHADO_REUNIAO' THEN 'REUNIAO_MARCADA' ELSE NULL END,
    p_sdr_id, p_closer_id, p_fonte, 'remarketing', now()
  FROM remarketing_leads WHERE id = p_remarketing_id
  RETURNING id INTO v_lead_id;

  -- Marca o remarketing como RECUPERADO
  UPDATE remarketing_leads
  SET 
    status_remarketing = 'RECUPERADO',
    transferido_at = now(), 
    lead_id_principal = v_lead_id,
    sdr_id = p_sdr_id
  WHERE id = p_remarketing_id;

  RETURN v_lead_id;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;
