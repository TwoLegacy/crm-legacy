-- Migration: Add Motivo Exclusao
-- Description: Adiciona coluna para registrar o motivo de exclusao de um lead (ao ir para a lixeira)

BEGIN;

ALTER TABLE leads 
ADD COLUMN IF NOT EXISTS motivo_exclusao TEXT;

COMMIT;
