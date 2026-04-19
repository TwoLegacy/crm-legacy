-- Migration 008: Adiciona coluna agendou_direto aos leads
-- Usado para identificar leads que agendaram diretamente pelo Cal.com via webhook

ALTER TABLE leads
ADD COLUMN IF NOT EXISTS agendou_direto BOOLEAN DEFAULT false;

-- Opcional: Para consultar rápido para testar
-- SELECT id, nome, email, agendou_direto FROM leads WHERE agendou_direto = true;
