// =====================================================
// TIPOS E FUNÇÕES DE QUALIFICAÇÃO DE LEADS
// =====================================================

export type Qualificacao = 'RUIM' | 'MEDIO' | 'QUALIFICADO' | 'ULTRA' | 'COMUNIDADE';

export type ColunaGlobal =
  | 'Nível 1'
  | 'Nível 2'
  | 'Nível 3'
  | 'Nível 4'
  | 'Comunidade';

// Mapeamento de qualificação para coluna do Kanban
export const QUALIFICACAO_PARA_COLUNA: Record<Qualificacao, ColunaGlobal> = {
  'RUIM': 'Nível 1',
  'MEDIO': 'Nível 2',
  'QUALIFICADO': 'Nível 3',
  'ULTRA': 'Nível 4',
  'COMUNIDADE': 'Comunidade',
};

// Ordem das colunas (para renderização)
export const ORDEM_COLUNAS: ColunaGlobal[] = [
  'Nível 1',
  'Nível 2',
  'Nível 3',
  'Nível 4',
  'Comunidade',
];

// Cores para cada coluna
export const CORES_COLUNAS: Record<ColunaGlobal, string> = {
  'Nível 1': '#dc2626', // red-600
  'Nível 2': '#f59e0b', // amber-500
  'Nível 3': '#10b981', // emerald-500
  'Nível 4': '#8b5cf6', // violet-500
  'Comunidade': '#0ea5e9', // sky-500
};

// =====================================================
// MAPEAMENTO DE FATURAMENTO POR TIPO DE HOSPEDAGEM
// =====================================================

// NOVAS REGRAS PADRONIZADAS:
// Menos de R$ 5 mil -> Comunidade
// Menos de R$ 20 mil -> Nível 1
// Entre R$ 20 a R$ 50 mil -> Nível 2
// Entre R$ 50 a R$ 100 mil -> Nível 3
// Entre R$ 100 a R$ 500 mil -> Nível 4
// Mais de R$ 500 mil -> Nível 4

const FATURAMENTO_QUALIFICACAO: Record<string, Qualificacao> = {
  'Menos de R$ 5 mil': 'COMUNIDADE',
  'Entre R$ 5 a R$ 20 mil': 'RUIM', // < 20k -> Nível 1
  'Menos de R$ 20 mil': 'RUIM',     // < 20k -> Nível 1
  
  'Entre R$ 20 a R$ 50 mil': 'MEDIO',      // 20-50k -> Nível 2
  'Entre R$ 50 a R$ 100 mil': 'QUALIFICADO', // 50-100k -> Nível 3
  
  'Entre R$ 100 a R$ 500 mil': 'ULTRA',    // > 100k -> Nível 4
  'Mais de R$ 500 mil': 'ULTRA',           // > 500k -> Nível 4
  'Mais de R$ 100 mil': 'ULTRA'            // Fallback -> Nível 4
};

// =====================================================
// NOVAS REGRAS DE CLASSIFICAÇÃO (Fase 3)
// =====================================================

// 1. Regras para "Cabanas e Chalés" e "Outros"
// Menos de R$ 15k -> Comunidade
// Entre R$ 15k a R$ 30k -> Nível 1
// Entre R$ 30k a R$ 50k -> Nível 2
// Entre R$ 50k a R$ 100k -> Nível 3
// Mais de R$ 100k -> Nível 4
const FATURAMENTO_CABANAS_OUTROS: Record<string, Qualificacao> = {
  'Menos de R$ 5 mil': 'COMUNIDADE',       // < 15k
  'Entre R$ 5 a R$ 20 mil': 'COMUNIDADE',  // < 15k (aprox) - Ajuste fino necessário se houver opção exata 15k
  'Menos de R$ 20 mil': 'RUIM',            // Fallback próximo
  
  'Entre R$ 20 a R$ 50 mil': 'MEDIO',      // 30-50k -> Nível 2 (Interseção 20-50)
  
  'Entre R$ 50 a R$ 100 mil': 'QUALIFICADO', // 50-100k -> Nível 3
  
  'Entre R$ 100 a R$ 500 mil': 'ULTRA',    // > 100k -> Nível 4
  'Mais de R$ 500 mil': 'ULTRA',
  'Mais de R$ 100 mil': 'ULTRA'
};

// 2. Regras para "Hotel, Pousada ou Resort"
// Menos de R$ 50k -> Nível 1
// Entre R$ 50k a R$ 100k -> Nível 2
// Entre R$ 100k a R$ 300k -> Nível 3
// Entre R$ 300k a R$ 800k -> Nível 4
// Entre R$ 800k a R$ 2MM -> Nível 4
// Mais de R$ 2MM -> Nível 4
const FATURAMENTO_HOTEL: Record<string, Qualificacao> = {
  'Menos de R$ 5 mil': 'RUIM',
  'Entre R$ 5 a R$ 20 mil': 'RUIM',
  'Menos de R$ 20 mil': 'RUIM',
  'Entre R$ 20 a R$ 50 mil': 'RUIM',       // < 50k -> Nível 1
  
  'Entre R$ 50 a R$ 100 mil': 'MEDIO',     // 50-100k -> Nível 2
  
  'Entre R$ 100 a R$ 500 mil': 'QUALIFICADO', // 100-300k -> Nível 3 (interseção)
  
  'Mais de R$ 500 mil': 'ULTRA',           // > 300k -> Nível 4
  'Mais de R$ 100 mil': 'ULTRA'
};

// Helper para converter string de faturamento em valor numérico aproximado para comparação
function faturamentoParaValor(faturamento: string): number {
  if (!faturamento) return 0;
  const fat = faturamento.toLowerCase().replace(/\s/g, ''); // remove espaços para facilitar
  
  // Normaliza k/mil para facilitar
  const normalized = fat.replace(/k/g, '000').replace(/mil/g, '000');

  // Menos de X
  if (normalized.includes('menosde')) {
    if (normalized.includes('5000')) return 2500;
    if (normalized.includes('15000')) return 10000;
    if (normalized.includes('20000')) return 10000;
    if (normalized.includes('50000')) return 25000;
  }

  // Entre X e Y
  if (normalized.includes('entre')) {
    if (normalized.includes('5') && normalized.includes('20000')) return 12500;
    if (normalized.includes('15000') && normalized.includes('30000')) return 22500;
    if (normalized.includes('20000') && normalized.includes('50000')) return 35000;
    if (normalized.includes('30000') && normalized.includes('50000')) return 40000;
    if (normalized.includes('50000') && normalized.includes('100000')) return 75000;
    if (normalized.includes('100000') && normalized.includes('300000')) return 200000;
    if (normalized.includes('100000') && normalized.includes('500000')) return 300000;
    if (normalized.includes('300000') && normalized.includes('800000')) return 550000;
    if (normalized.includes('800000') && normalized.includes('2mm')) return 1400000;
  }

  // Mais de X
  if (normalized.includes('maisde')) {
    if (normalized.includes('100000')) return 150000;
    if (normalized.includes('300000')) return 400000;
    if (normalized.includes('500000')) return 600000;
    if (normalized.includes('2mm')) return 3000000;
  }
  
  return 0;
}

// Tipos de hospedagem premium (para bônus de upgrade)
const TIPOS_HOSPEDAGEM_PREMIUM = [
  'Hotel, Pousada ou Resort',
];

/**
 * Determina a qualificação e coluna do Kanban Global para um lead
 * baseado em seu tipo de hospedagem, faturamento médio e fonte.
 */
export function obterQualificacaoEColuna(
  tipoHospedagem: string | null | undefined,
  faturamentoMedio: string | null | undefined,
  fonte: string | null | undefined = 'geral'
): { qualificacao: Qualificacao; coluna: ColunaGlobal } {
  // PRIORIDADE 1: Se fonte é comunidade, vai para coluna Comunidade
  if (fonte && fonte.toLowerCase() === 'comunidade') {
    return { qualificacao: 'COMUNIDADE', coluna: 'Comunidade' };
  }
  
  // Normaliza os inputs
  const faturamento = faturamentoMedio?.trim() || '';
  const tipo = tipoHospedagem?.trim() || '';
  const valorFaturamento = faturamentoParaValor(faturamento);
  
  let qualificacao: Qualificacao = 'RUIM';

  // Lógica Baseada no Tipo de Hospedagem
  if (tipo === 'Cabanas e Chalés' || tipo === 'Outros') {
    // Regras:
    // < 15k: Comunidade
    // 15k-30k: Nível 1 (RUIM)
    // 30k-50k: Nível 2 (MEDIO)
    // 50k-100k: Nível 3 (QUALIFICADO)
    // > 100k: Nível 4 (ULTRA)
    
    if (valorFaturamento < 15000) qualificacao = 'COMUNIDADE';
    else if (valorFaturamento < 30000) qualificacao = 'RUIM';
    else if (valorFaturamento < 50000) qualificacao = 'MEDIO';
    else if (valorFaturamento < 100000) qualificacao = 'QUALIFICADO';
    else qualificacao = 'ULTRA';

  } else if (tipo === 'Hotel, Pousada ou Resort') {
    // Regras:
    // < 50k: Nível 1 (RUIM)
    // 50k-100k: Nível 2 (MEDIO)
    // 100k-300k: Nível 3 (QUALIFICADO)
    // > 300k: Nível 4 (ULTRA)
    
    if (valorFaturamento < 50000) qualificacao = 'RUIM';
    else if (valorFaturamento < 100000) qualificacao = 'MEDIO';
    else if (valorFaturamento < 300000) qualificacao = 'QUALIFICADO';
    else qualificacao = 'ULTRA';
    
  } else {
    // Fallback para tipos desconhecidos ou vazios (Mantém lógica original)
    qualificacao = FATURAMENTO_QUALIFICACAO[faturamento] || 'RUIM';
    
    // Regra original: < 5k -> Comunidade
    if (faturamento === 'Menos de R$ 5 mil') {
      qualificacao = 'COMUNIDADE';
    }
    
    // Bonus original: Hotel/Pousada + Medio -> Qualificado (Mantido apenas no fluxo legado se necessário, mas logicamente 'tipo' cairia no if acima se fosse Hotel)
    // Então aqui é só para tipos realmente estranhos.
  }

  // Override final de fonte Comunidade (mantém prioridade absoluta)
  if (fonte && fonte.toLowerCase() === 'comunidade') {
    return { qualificacao: 'COMUNIDADE', coluna: 'Comunidade' };
  }
  
  const coluna = QUALIFICACAO_PARA_COLUNA[qualificacao];
  
  return { qualificacao, coluna };
}

/**
 * Verifica se um usuário pode ver leads de uma determinada qualificação
 */
export function podeVerQualificacao(
  visibleQualifications: Qualificacao[],
  qualificacao: Qualificacao
): boolean {
  return visibleQualifications.includes(qualificacao);
}

/**
 * Agrupa leads por coluna do Kanban Global
 */
export function agruparLeadsPorColuna<T extends { tipo_hospedagem: string | null; faturamento_medio: string | null; fonte?: string | null }>(
  leads: T[]
): Record<ColunaGlobal, T[]> {
  const grupos: Record<ColunaGlobal, T[]> = {
    'Nível 1': [],
    'Nível 2': [],
    'Nível 3': [],
    'Nível 4': [],
    'Comunidade': [],
  };
  
  for (const lead of leads) {
    const { coluna } = obterQualificacaoEColuna(lead.tipo_hospedagem, lead.faturamento_medio, lead.fonte);
    if (grupos[coluna]) {
      grupos[coluna].push(lead);
    }
  }
  
  return grupos;
}
