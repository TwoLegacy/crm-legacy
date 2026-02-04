-- =====================================================
-- ATUALIZAÇÃO DAS POLÍTICAS RLS
-- Execute este SQL no Supabase SQL Editor
-- =====================================================

-- Remove políticas antigas de profiles (se existirem)
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;

-- Nova política: usuários autenticados podem ver todos os profiles
-- (necessário para o modal de atribuição de leads)
CREATE POLICY "Authenticated users can view all profiles" ON profiles
  FOR SELECT TO authenticated USING (true);

-- Nova política: usuários podem atualizar apenas seu próprio perfil
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Adiciona política de INSERT para profiles (service role ou o próprio usuário)
CREATE POLICY "Users can insert own profile" ON profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);

-- Garante que service_role pode fazer tudo
CREATE POLICY "Service role full access profiles" ON profiles
  FOR ALL TO service_role USING (true) WITH CHECK (true);
