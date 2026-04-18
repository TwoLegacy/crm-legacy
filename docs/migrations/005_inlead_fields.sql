-- Cria nova coluna para quantidade de contatos por dia
ALTER TABLE leads ADD COLUMN qtd_contatos TEXT;

-- Remove coluna antiga de cargo
ALTER TABLE leads DROP COLUMN IF EXISTS cargo_atual;
