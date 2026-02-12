-- Migration: Adicionar campo valor_diaria para leads VSL
-- Created: 2026-02-12

ALTER TABLE leads ADD COLUMN IF NOT EXISTS valor_diaria TEXT;
