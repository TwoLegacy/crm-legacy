-- =====================================================
-- CRM LEGACY - LEADS TWO LEGACY
-- Schema SQL para Supabase
-- =====================================================

-- Tabela de perfis de usuário
-- Vinculada ao auth.users do Supabase
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'sdr')),
  visible_qualifications TEXT[] DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Tabela de leads
-- Recebe dados via n8n webhook
CREATE TABLE leads (
  id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome TEXT NOT NULL,
  whatsapp TEXT,
  whatsapp_formatado TEXT,
  tipo_hospedagem TEXT,
  faturamento_medio TEXT,
  instagram TEXT,
  qtd_quartos_hospedagens TEXT,
  owner_sdr_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  status_sdr TEXT CHECK (status_sdr IS NULL OR status_sdr IN ('MEUS_LEADS', 'EM_ATENDIMENTO', 'ENCAMINHADO_REUNIAO', 'VENDEU')),
  origem TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX idx_leads_owner_sdr_id ON leads(owner_sdr_id);
CREATE INDEX idx_leads_status_sdr ON leads(status_sdr);
CREATE INDEX idx_profiles_role ON profiles(role);

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- RLS (Row Level Security) - Opcional mas recomendado
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Política para profiles: usuários podem ver e editar seu próprio perfil
CREATE POLICY "Users can view own profile" ON profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Política para leads: admins podem ver tudo, SDRs podem ver baseado em permissões
-- Esta política permite leitura para todos os usuários autenticados
-- O filtro por visible_qualifications é feito no frontend
CREATE POLICY "Authenticated users can view leads" ON leads
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Authenticated users can update leads" ON leads
  FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Service role can insert leads" ON leads
  FOR INSERT TO service_role WITH CHECK (true);

-- =====================================================
-- DADOS DE EXEMPLO (Opcional)
-- Descomente para criar usuários e leads de teste
-- =====================================================

/*
-- Após criar usuários no Auth do Supabase, insira os profiles:

-- Admin exemplo
INSERT INTO profiles (id, name, role, visible_qualifications)
VALUES (
  'uuid-do-admin-aqui',
  'Admin Principal',
  'admin',
  ARRAY['RUIM', 'MEDIO', 'QUALIFICADO', 'ULTRA']
);

-- SDR exemplo 1 - vê apenas leads ruins e médios
INSERT INTO profiles (id, name, role, visible_qualifications)
VALUES (
  'uuid-do-sdr1-aqui',
  'Lucas SDR',
  'sdr',
  ARRAY['RUIM', 'MEDIO']
);

-- SDR exemplo 2 - vê todos os leads
INSERT INTO profiles (id, name, role, visible_qualifications)
VALUES (
  'uuid-do-sdr2-aqui',
  'Pedro SDR',
  'sdr',
  ARRAY['RUIM', 'MEDIO', 'QUALIFICADO', 'ULTRA']
);

-- Leads de exemplo (normalmente inseridos via n8n)
INSERT INTO leads (nome, whatsapp, whatsapp_formatado, tipo_hospedagem, faturamento_medio, instagram, qtd_quartos_hospedagens)
VALUES
  ('Hotel Fazenda Sol', '+55 (11) 99999-1111', '5511999991111', 'Hotel', 'Acima de R$ 100 mil', '@hotelfazendasol', '50'),
  ('Chalés Aurora', '+55 (21) 98888-2222', '5521988882222', 'Cabanas e Chalés', 'Entre R$ 50 mil a R$ 100 mil', '@chalesaurora', '12'),
  ('Pousada Mar', '+55 (61) 97777-3333', '5561977773333', 'Pousada', 'Entre R$ 20 mil a R$ 50 mil', '@pousadamar', '8'),
  ('Camping Verde', '+55 (31) 96666-4444', '5531966664444', 'Camping', 'Até R$ 20 mil', '@campingverde', '20');
*/
