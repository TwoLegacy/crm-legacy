-- Migration: Add Marketing Role
-- Description: Adiciona 'marketing' como role válida em profiles.

BEGIN;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('admin', 'sdr', 'closer', 'marketing'));

COMMIT;
