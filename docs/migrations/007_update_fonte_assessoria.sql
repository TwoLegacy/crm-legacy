-- Atualiza a fonte de todos os leads antigos para 'assessoria'.
-- Exclui explicitamente os leads que já são 'ia' ou 'site' e garante case-insensitivity.
UPDATE leads
SET fonte = 'assessoria'
WHERE LOWER(fonte) NOT IN ('ia', 'site') 
   OR fonte IS NULL;
