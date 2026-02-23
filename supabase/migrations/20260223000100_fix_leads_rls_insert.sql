-- Permitir que usuários autenticados (Admin e SDR) possam inserir leads
-- Isso é necessário para a criação manual de leads via frontend
CREATE POLICY "Authenticated users can insert leads" ON leads
  FOR INSERT TO authenticated WITH CHECK (true);
