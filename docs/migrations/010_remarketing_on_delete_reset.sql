-- =====================================================
-- MIGRAÇÃO 010: Remarketing - Reset automático ao deletar lead
-- Two Legacy CRM · Abril 2025
-- =====================================================
-- Quando um lead do CRM principal é deletado, o remarketing_lead
-- associado volta a ficar ativo no kanban de remarketing.
-- =====================================================

-- 1. Trocar a FK para ON DELETE SET NULL (permite deletar leads sem erro)
ALTER TABLE remarketing_leads
  DROP CONSTRAINT IF EXISTS remarketing_leads_lead_id_principal_fkey;

ALTER TABLE remarketing_leads
  ADD CONSTRAINT remarketing_leads_lead_id_principal_fkey
  FOREIGN KEY (lead_id_principal) REFERENCES leads(id)
  ON DELETE SET NULL;

-- 2. Trigger que reseta o remarketing_lead quando o lead principal é deletado
CREATE OR REPLACE FUNCTION on_lead_deleted_reset_remarketing()
RETURNS TRIGGER AS $function$
BEGIN
  -- Quando um lead é deletado, reativa o remarketing_lead vinculado
  UPDATE remarketing_leads
  SET 
    transferido_at = NULL,
    lead_id_principal = NULL,
    status_remarketing = 'PROSPECTADO'
  WHERE lead_id_principal = OLD.id;

  RETURN OLD;
END;
$function$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Ativar o trigger ANTES da deleção (para pegar o OLD.id antes do SET NULL)
DROP TRIGGER IF EXISTS trg_lead_deleted_reset_remarketing ON leads;
CREATE TRIGGER trg_lead_deleted_reset_remarketing
  BEFORE DELETE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION on_lead_deleted_reset_remarketing();
