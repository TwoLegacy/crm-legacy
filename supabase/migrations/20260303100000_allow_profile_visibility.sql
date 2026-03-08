-- Migration: Feature Closer Profiles Visibility
-- Description: Permite que usuarios autenticados leiam perfis alheios (nomes, cargos) mantendo apenas a edição estrita ao "own profile".

BEGIN;

DROP POLICY IF EXISTS "Users can view own profile" ON profiles;

CREATE POLICY "Authenticated users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

COMMIT;
