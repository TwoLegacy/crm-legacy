# 🚀 Two Legacy CRM — PRD Módulo Outbound
> **Versão 1.0 · Junho 2025**

---

## 💡 Princípio Central

> O Outbound é a **antessala do funil**. Ele não cria um novo funil — ele alimenta o topo do funil existente. Um lead só entra no painel SDR quando o prospector decide que há interesse real.

---

## 1. Visão Geral e Objetivo

O Two Legacy CRM opera hoje 100% em modo **Inbound** — leads chegam via integrações externas (Typeform, n8n, etc.) e percorrem o funil SDR → Closer.

O **Módulo Outbound** adiciona uma camada de prospecção ativa ao sistema, permitindo que SDRs cacem e organizem leads frios antes de introduzi-los no funil existente.

---

## 2. Escopo da Funcionalidade

### ✅ Incluído neste PRD

- Painel de Prospecção com duas colunas: **Para Prospectar** e **Prospectados**
- Importação de leads via **CSV/XLSX** (somente Admin)
- **Cadastro manual** de leads Outbound
- **Paginação e indexação** de consultas para suportar 2.000+ leads
- Transferência de lead Outbound → Funil SDR (`MEUS_LEADS` do SDR que prospectou)
- **Tag visual "Outbound"** nos cards do Kanban SDR e Closer
- Campo `canal_origem` para rastreamento e métricas futuras

### ❌ Fora do escopo

- Criação de um novo funil/kanban para Outbound
- Sistema de cadência automática de mensagens
- Scoring/classificação de leads Outbound (pulam essa etapa)
- Integração com ferramentas de automação nesta fase

---

## 3. Fluxo Completo do Usuário

### 3.1 Jornada Principal

```
[Admin] Importa CSV/XLSX
        ↓
[Sistema] Cria registros em outbound_leads (sem SDR vinculado)
        ↓
[SDR] Acessa Painel Outbound → vê coluna "Para Prospectar" (ordem FIFO)
        ↓
[SDR] Contata o lead externamente (WhatsApp, Instagram etc.)
        ↓
[SDR] Clica em "Marcar como Prospectado"
      → Lead move para coluna "Prospectados" (topo da pilha)
      → sdr_id = ID do SDR logado
        ↓
[SDR] Lead demonstra interesse?
      ├─ NÃO → Lead permanece em "Prospectados" (sem ação)
      └─ SIM → Clica em "Enviar para Funil SDR"
                ↓
               [Sistema] Transação atômica:
               → INSERT em leads: status_sdr = MEUS_LEADS
                                  sdr_id = ID do SDR
                                  canal_origem = 'outbound'
               → UPDATE em outbound_leads: transferido_at, lead_id_principal
                ↓
               [SDR] Atende o lead normalmente no funil existente
```

### 3.2 Cadastro Manual de Lead Outbound

Disponível para **Admin** e **SDR**.

| Campo | Obrigatoriedade |
|---|---|
| Nome | ✅ Obrigatório |
| Telefone / WhatsApp | ✅ Obrigatório |
| Cidade / Estado | ✅ Obrigatório |
| E-mail | Opcional |
| Instagram | Opcional |
| Faturamento Estimado | Opcional |
| Nome da Empresa | Opcional |
| Fonte Outbound | ✅ Obrigatório (seleção) |

**Ao salvar:** lead entra no final da fila "Para Prospectar" do SDR logado.

---

## 4. Plano de Banco de Dados (Supabase / PostgreSQL)

### 4.1 Nova Tabela: `outbound_leads`

> Tabela separada para não inflar a tabela `leads` principal e manter índices de performance específicos para listas grandes.

| Coluna | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `id` | `BIGINT` PK | ✅ | Auto-incremento |
| `nome` | `TEXT` | ✅ | Nome do contato ou empresa |
| `whatsapp` | `TEXT` | ✅ | Telefone principal |
| `cidade_estado` | `TEXT` | ✅ | Ex: Cuiabá, MT |
| `email` | `TEXT` | — | E-mail opcional |
| `instagram` | `TEXT` | — | Perfil Instagram opcional |
| `nome_empresa` | `TEXT` | — | Empresa (B2B) |
| `faturamento_estimado` | `TEXT` | — | Campo livre, sem scoring automático |
| `fonte_outbound` | `TEXT` | ✅ | `google_maps` \| `indicacao` \| `linkedin` \| `outros` |
| `status_outbound` | `ENUM` | ✅ | `PARA_PROSPECTAR` \| `PROSPECTADO` |
| `sdr_id` | `UUID` FK | — | SDR que prospectou |
| `prospectado_at` | `TIMESTAMP` | — | Momento em que foi movido para Prospectado |
| `transferido_at` | `TIMESTAMP` | — | Momento em que foi enviado ao funil |
| `lead_id_principal` | `BIGINT` FK | — | Referência ao ID na tabela `leads` após transferência |
| `created_at` | `TIMESTAMP` | ✅ | Data de importação/cadastro |
| `created_by` | `UUID` FK | ✅ | Admin ou SDR que criou/importou |

### 4.2 Alterações na Tabela `leads`

Apenas **uma nova coluna** para identificar a origem do lead no funil:

| Coluna | Tipo | Default | Descrição |
|---|---|---|---|
| `canal_origem` | `TEXT` | `'inbound'` | `inbound` \| `outbound` — usado para tag visual nos cards e métricas futuras |

### 4.3 Índices de Performance

```sql
-- Filtrar por status (consulta mais frequente)
CREATE INDEX idx_outbound_status ON outbound_leads(status_outbound);

-- Filtrar por SDR
CREATE INDEX idx_outbound_sdr ON outbound_leads(sdr_id);

-- Ordenação FIFO na coluna Para Prospectar
CREATE INDEX idx_outbound_created ON outbound_leads(created_at ASC);

-- Ordenação stack na coluna Prospectados
CREATE INDEX idx_outbound_prospectado
  ON outbound_leads(prospectado_at DESC)
  WHERE status_outbound = 'PROSPECTADO';

-- Filtro de tag no Kanban
CREATE INDEX idx_leads_canal ON leads(canal_origem);
```

### 4.4 Row Level Security (RLS)

```sql
-- Admin: acesso total
-- SDR: vê apenas seus leads ou leads ainda não atribuídos
CREATE POLICY "sdr_outbound_policy" ON outbound_leads
  FOR ALL USING (
    auth.uid() IN (SELECT id FROM profiles WHERE role = 'admin')
    OR sdr_id = auth.uid()
    OR sdr_id IS NULL
  );
```

---

## 5. Etapas de Desenvolvimento

> ⚠️ **Instrução:** Executar as etapas em ordem. Cada etapa deve ser commitada separadamente e validada antes de avançar. Não misturar alterações de banco de dados com alterações de UI na mesma etapa.

---

### Etapa 1 — Banco de Dados e Tipos

**Escopo:** Toda a infraestrutura de dados antes de qualquer UI.

- [ ] Criar o ENUM `status_outbound` com valores `PARA_PROSPECTAR` e `PROSPECTADO`
- [ ] Criar a tabela `outbound_leads` com todas as colunas da seção 4.1
- [ ] Criar todos os índices de performance da seção 4.3
- [ ] Adicionar a coluna `canal_origem` (`TEXT`, default `'inbound'`) na tabela `leads`
- [ ] Configurar RLS na tabela `outbound_leads` conforme seção 4.4
- [ ] Atualizar os tipos TypeScript para incluir `OutboundLead` e o novo campo `canal_origem` em `Lead`

---

### Etapa 2 — Importação CSV/XLSX (Admin)

**Escopo:** Funcionalidade de importação em massa, exclusiva do painel Admin.

- [ ] Criar `ImportOutboundModal` com upload de arquivo CSV ou XLSX
- [ ] Implementar parser client-side: **PapaParse** para CSV e **SheetJS** para XLSX
- [ ] Mapear colunas esperadas (ver seção 7 para spec completa)
- [ ] Adicionar tela de **preview** antes de confirmar: quantidade de leads detectados + primeiras 5 linhas como amostra
- [ ] Implementar inserção em batch com `upsert` para evitar duplicatas por `whatsapp`
- [ ] Exibir feedback de progresso e resultado: *"X leads importados, Y duplicatas ignoradas"*
- [ ] Tratar erros por linha: linhas inválidas são puladas e listadas em relatório de erro

---

### Etapa 3 — Painel de Prospecção (UI Principal)

**Escopo:** A página principal do módulo Outbound com as duas colunas.

- [ ] Criar rota `/outbound` no App Router do Next.js
- [ ] Layout de **duas colunas** lado a lado com scroll independente
  - **Para Prospectar:** ordenação FIFO por `created_at ASC`
  - **Prospectados:** ordenação stack por `prospectado_at DESC` (mais recente no topo)
- [ ] Implementar **paginação com scroll infinito** (Intersection Observer): 30 leads por vez por coluna
- [ ] Usar React Query ou SWR para cache e revalidação
- [ ] Card do lead deve exibir: nome, cidade/estado, link WhatsApp, badge de `fonte_outbound`, botão de ação
- [ ] Botões de ação:
  - Para Prospectar → **"Marcar como Prospectado"** (azul)
  - Prospectados → **"Enviar para Funil SDR"** (verde)
- [ ] Ao clicar em "Marcar como Prospectado": atualizar `status_outbound`, `sdr_id`, `prospectado_at` com **optimistic update**
- [ ] Botão **"Adicionar Lead Manual"** fixo no topo da coluna Para Prospectar
- [ ] Contador de leads visível no cabeçalho de cada coluna
- [ ] Busca global no topo: filtra por nome ou telefone em tempo real

---

### Etapa 4 — Cadastro Manual e Modal de Lead

**Escopo:** Formulário de cadastro manual e modal de detalhes.

- [ ] Criar `AddOutboundLeadModal` com todos os campos da seção 3.2
- [ ] Validação client-side: nome e whatsapp obrigatórios; máscara de telefone brasileira
- [ ] Ao salvar: inserir em `outbound_leads` com `sdr_id = auth.uid()` e `status = PARA_PROSPECTAR`
- [ ] Criar `LeadOutboundDetailModal` (ao clicar no card):
  - Exibir todos os campos do lead
  - Editar campos opcionais (instagram, faturamento, observações)
  - Histórico: data de importação, data de prospecção

---

### Etapa 5 — Transferência para o Funil SDR

**Escopo:** Lógica de migração do lead Outbound para o funil principal.

- [ ] Criar **Supabase Database Function (RPC)** para garantir atomicidade:

```sql
CREATE OR REPLACE FUNCTION transfer_outbound_to_sdr(
  p_outbound_id BIGINT,
  p_sdr_id UUID
) RETURNS BIGINT AS $$
DECLARE
  v_lead_id BIGINT;
  v_outbound outbound_leads%ROWTYPE;
BEGIN
  SELECT * INTO v_outbound FROM outbound_leads WHERE id = p_outbound_id;

  INSERT INTO leads (
    nome, whatsapp, cidade_estado, email, instagram,
    nome_empresa, status_sdr, sdr_id, fonte, canal_origem, created_at
  ) VALUES (
    v_outbound.nome, v_outbound.whatsapp, v_outbound.cidade_estado,
    v_outbound.email, v_outbound.instagram, v_outbound.nome_empresa,
    'MEUS_LEADS', p_sdr_id, 'outbound', 'outbound', now()
  ) RETURNING id INTO v_lead_id;

  UPDATE outbound_leads
  SET transferido_at = now(), lead_id_principal = v_lead_id
  WHERE id = p_outbound_id;

  RETURN v_lead_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] Após transferência: card mostra estado **"Enviado ao Funil"** com link para o lead no painel SDR
- [ ] Lead transferido **não pode mais ser editado** no Painel Outbound

---

### Etapa 6 — Tag Visual nos Cards do Kanban

**Escopo:** Modificações visuais no Kanban SDR e Closer.

- [ ] Atualizar as queries do Kanban SDR e Closer para incluir `canal_origem`
- [ ] No componente de card, adicionar lógica condicional:
  - `canal_origem === 'outbound'` → renderizar badge **"Outbound"**
  - `canal_origem === 'inbound'` ou nulo → sem badge (comportamento atual preservado)
- [ ] Estilo da tag:
  - Fundo: `#F97316` (laranja) | Texto: branco | `border-radius: 4px` | tamanho `text-xs`
  - Em cards escuros (leads IA): usar `#EA6C0A` para garantir contraste
  - Posição: canto superior direito, ao lado dos badges existentes
- [ ] Garantir que a lógica de cor do card continue intacta: a tag é **aditiva**, não substitui o estilo base

---

## 6. Controle de Acesso (RBAC)

| Ação | Admin | Marketing | SDR | Closer | Observação |
|---|:---:|:---:|:---:|:---:|---|
| Ver Painel Outbound | ✅ | ❌ | ✅ | ❌ | Marketing sem acesso nessa fase |
| Importar CSV/XLSX | ✅ | ❌ | ❌ | ❌ | Exclusivo Admin |
| Cadastrar manualmente | ✅ | ❌ | ✅ | ❌ | SDR adiciona seus próprios leads |
| Ver todos os leads | ✅ | ❌ | Só os seus | ❌ | RLS via `sdr_id = auth.uid()` ou `IS NULL` |
| Marcar como Prospectado | ✅ | ❌ | ✅ | ❌ | Vincula automaticamente ao SDR logado |
| Enviar para Funil | ✅ | ❌ | ✅ | ❌ | Apenas quem prospectou pode enviar |
| Ver tag Outbound no card | ✅ | ✅ | ✅ | ✅ | Visível para todos os papéis |

---

## 7. Especificação da Importação CSV/XLSX

### 7.1 Mapeamento de Colunas

| Coluna na Planilha | Obrigatório | Mapeamento no Sistema |
|---|:---:|---|
| `nome` | ✅ | `outbound_leads.nome` |
| `telefone` ou `whatsapp` | ✅ | `outbound_leads.whatsapp` |
| `cidade_estado` | ✅ | `outbound_leads.cidade_estado` |
| `email` | — | `outbound_leads.email` |
| `instagram` | — | `outbound_leads.instagram` |
| `faturamento` | — | `outbound_leads.faturamento_estimado` |
| `nome_empresa` | — | `outbound_leads.nome_empresa` |

### 7.2 Regras de Importação

- Nomes de coluna são **case-insensitive** (`Telefone`, `telefone` e `TELEFONE` são aceitos)
- Linhas sem `nome` ou `telefone` são ignoradas e listadas no relatório de erro
- **Deduplicação por `whatsapp`:** linhas com número já existente na tabela são puladas
- **Limite:** máximo de 5.000 linhas por arquivo
- A `fonte_outbound` de todos os leads de uma importação é definida pelo Admin no momento do upload

---

## 8. Especificação Visual e de Layout

### 8.1 Painel Outbound

- Layout: duas colunas de largura igual com **scroll independente**
- Header de cada coluna: título + contador de leads em badge
- **Coluna Para Prospectar:** borda superior `#2563EB` (azul)
- **Coluna Prospectados:** borda superior `#16A34A` (verde)
- Estado vazio: ilustração simples + texto explicativo
- Busca global no topo: filtra nome ou telefone em tempo real

### 8.2 Card do Lead Outbound

```
┌─────────────────────────────────┐
│ Nome da Empresa / Pessoa        │
│ Cuiabá, MT                      │
│                                 │
│ 📱 (65) 99999-9999              │
│                          [Maps] │
│                                 │
│  [ Marcar como Prospectado ]    │
└─────────────────────────────────┘
```

### 8.3 Tag Outbound nos Cards do Kanban

```
┌──────────────────────────────────────┐
│ [A] Nome do Lead          [OUTBOUND] │  ← badge laranja
│ Empresa XYZ                          │
│ ...                                  │
└──────────────────────────────────────┘
```

| Propriedade | Valor |
|---|---|
| Cor de fundo (card claro) | `#F97316` |
| Cor de fundo (card escuro/IA) | `#EA6C0A` |
| Cor do texto | `#FFFFFF` |
| Border radius | `4px` |
| Tamanho do texto | `text-xs uppercase` |
| Posição | Canto superior direito, após badges existentes |

---

## 9. Checklist de Entrega

### Etapa 1 — Banco de Dados
- [ ] Tabela `outbound_leads` criada com todos os campos e índices
- [ ] Coluna `canal_origem` adicionada à tabela `leads`
- [ ] RLS configurado corretamente
- [ ] Tipos TypeScript atualizados

### Etapa 2 — Importação
- [ ] Upload de CSV e XLSX funcionando
- [ ] Preview antes de confirmar importação
- [ ] Relatório de erros por linha
- [ ] Deduplicação por `whatsapp` funcionando

### Etapa 3 — Painel Outbound
- [ ] Duas colunas com ordenações corretas (FIFO / Stack)
- [ ] Scroll infinito com 30 itens por página
- [ ] Busca em tempo real funcionando
- [ ] Contadores no cabeçalho

### Etapa 4 — Cadastro Manual
- [ ] Formulário com validação e máscara de telefone
- [ ] Modal de detalhes com edição de campos opcionais

### Etapa 5 — Transferência para Funil
- [ ] RPC atômica criada e testada
- [ ] Lead aparece em `MEUS_LEADS` do SDR correto
- [ ] Card mostra estado "Enviado ao Funil" após transferência

### Etapa 6 — Tag Visual
- [ ] Tag "Outbound" visível nos cards do Kanban SDR e Closer
- [ ] Estilo correto em cards claros e escuros (IA)
- [ ] Lógica de cor base do card intacta

### Segurança
- [ ] SDR não vê leads de outros SDRs (RLS validado)
- [ ] Importação bloqueada para não-Admin no frontend e backend

---

## 10. Prompt de Referência para o Antigravity

> Copie, substitua `[NÚMERO]` pelo número da etapa e cole no Antigravity.

---

```
Você está desenvolvendo o Módulo Outbound do Two Legacy CRM.
Stack: Next.js 15 (App Router), Supabase (Auth + DB), Tailwind CSS.

=== CONTEXTO DO PROJETO ===

O CRM tem dois papéis principais: SDR (qualificação) e Closer (fechamento).
A tabela principal é `leads`, com campos de status_sdr e status_closer.
O sistema usa @dnd-kit para o Kanban e controle de acesso por RBAC (admin, marketing, sdr, closer).

=== REGRAS DE NEGÓCIO CRÍTICAS ===

1. Outbound NÃO cria novo funil — alimenta o funil existente (tabela leads)
2. Nova tabela separada: outbound_leads (não inflar a tabela leads)
3. Coluna "Para Prospectar": ordem FIFO (created_at ASC)
4. Coluna "Prospectados": stack — mais recente no topo (prospectado_at DESC)
5. Transferência para funil é uma transação atômica via Supabase RPC
6. Ao transferir: status_sdr = 'MEUS_LEADS', sdr_id = ID do SDR logado, canal_origem = 'outbound'
7. Importação CSV/XLSX é exclusiva para Admin
8. Tag "Outbound" nos cards do Kanban é ADITIVA — não altera estilo base (branco/escuro para IA)
9. Leads transferidos não podem mais ser editados no Painel Outbound
10. Paginação obrigatória: 30 leads por vez (scroll infinito ou paginação)

=== EXECUTE A ETAPA [NÚMERO] ===

Consulte o PRD antes de escrever qualquer código.
Commite apenas o que pertence a essa etapa.
```

---

*Two Legacy CRM · PRD Módulo Outbound v1.0*
