-- Migration: Adicionar campos específicos de leads do Site
-- Created: 2026-02-04

-- Adiciona novos campos à tabela de leads para suportar leads vindos do site
-- Os campos são opcionais (null) para manter compatibilidade com leads existentes

-- Campo para e-mail do lead
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS email TEXT;

-- Campo para nome da hospedagem/espaço
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS nome_hospedagem TEXT;

-- Campo para investimento em marketing mensal
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS investimento_mkt TEXT;

-- Atualiza o campo fonte para permitir 'site' como valor
-- Nota: Se a coluna fonte tiver uma constraint CHECK, ela precisa ser atualizada.
-- Exemplo de como atualizar uma constraint:
-- ALTER TABLE public.leads DROP CONSTRAINT IF EXISTS leads_fonte_check;
-- ALTER TABLE public.leads ADD CONSTRAINT leads_fonte_check 
--   CHECK (fonte IN ('geral', 'comunidade', 'site'));

-- Se fonte for um ENUM, você precisaria alterar o tipo:
-- ALTER TYPE fonte_type ADD VALUE 'site' IF NOT EXISTS;

COMMENT ON COLUMN public.leads.email IS 'E-mail do lead (preenchido principalmente por leads do site)';
COMMENT ON COLUMN public.leads.nome_hospedagem IS 'Nome do estabelecimento do lead';
COMMENT ON COLUMN public.leads.investimento_mkt IS 'Valor investido em marketing pelo lead';
