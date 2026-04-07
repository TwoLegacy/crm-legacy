import { createClient } from './supabaseClient'

// =====================================================
// TIPOS
// =====================================================

export type StatusOutbound = 'PARA_PROSPECTAR' | 'PROSPECTADO'
export type FonteOutbound = 'google_maps' | 'indicacao' | 'linkedin' | 'outros'

export interface OutboundLead {
  id: number
  nome: string
  whatsapp: string
  cidade_estado: string
  email: string | null
  instagram: string | null
  nome_empresa: string | null
  faturamento_estimado: string | null
  link_perfil: string | null
  fonte_outbound: FonteOutbound
  status_outbound: StatusOutbound
  sdr_id: string | null
  prospectado_at: string | null
  transferido_at: string | null
  lead_id_principal: number | null
  created_at: string
  created_by: string
}

// =====================================================
// CACHE
// =====================================================

const CACHE_TTL = 15000 // 15 segundos (mais curto que leads por ser lista dinâmica)

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const outboundCache = new Map<string, CacheEntry<any>>()

function getCached<T>(key: string): T | null {
  const entry = outboundCache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }
  outboundCache.delete(key)
  return null
}

function setCache<T>(key: string, data: T): void {
  outboundCache.set(key, { data, timestamp: Date.now() })
}

export function invalidateOutboundCache(pattern?: string): void {
  if (pattern) {
    for (const key of outboundCache.keys()) {
      if (key.includes(pattern)) {
        outboundCache.delete(key)
      }
    }
  } else {
    outboundCache.clear()
  }
}

// =====================================================
// FUNÇÕES DE CONSULTA
// =====================================================

/**
 * Busca leads outbound paginados por status.
 * Para Prospectar: FIFO (created_at ASC)
 * Prospectados: Stack (prospectado_at DESC)
 */
export async function getOutboundLeads(params: {
  status: StatusOutbound
  sdrId?: string
  isAdmin?: boolean
  page?: number
  pageSize?: number
  search?: string
}): Promise<{ data: OutboundLead[]; count: number }> {
  const { status, sdrId, isAdmin = false, page = 0, pageSize = 30, search } = params
  const supabase = createClient()

  let query = supabase
    .from('outbound_leads')
    .select('*', { count: 'exact' })
    .eq('status_outbound', status)
    .is('transferido_at', null) // Não mostra os já transferidos

  // SDR vê: seus leads + leads sem SDR atribuído
  if (!isAdmin && sdrId) {
    query = query.or(`sdr_id.eq.${sdrId},sdr_id.is.null`)
  }

  // Busca por nome ou telefone
  if (search && search.trim()) {
    const term = `%${search.trim()}%`
    query = query.or(`nome.ilike.${term},whatsapp.ilike.${term}`)
  }

  // Ordenação: FIFO para prospectar, Stack para prospectados
  if (status === 'PARA_PROSPECTAR') {
    query = query.order('created_at', { ascending: true })
  } else {
    query = query.order('prospectado_at', { ascending: false })
  }

  // Paginação
  const from = page * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Erro ao buscar outbound leads:', error)
    throw error
  }

  return { data: data || [], count: count || 0 }
}

/**
 * Marca um lead como prospectado pelo SDR logado.
 */
export async function markAsProspected(
  outboundId: number,
  sdrId: string
): Promise<OutboundLead> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('outbound_leads')
    .update({
      status_outbound: 'PROSPECTADO',
      sdr_id: sdrId,
      prospectado_at: new Date().toISOString(),
    })
    .eq('id', outboundId)
    .select()
    .single()

  if (error) {
    console.error('Erro ao marcar como prospectado:', error)
    throw error
  }

  invalidateOutboundCache()
  return data
}

/**
 * Desfaz a prospecção: volta o lead para PARA_PROSPECTAR.
 */
export async function undoProspected(outboundId: number): Promise<OutboundLead> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('outbound_leads')
    .update({
      status_outbound: 'PARA_PROSPECTAR',
      sdr_id: null,
      prospectado_at: null,
    })
    .eq('id', outboundId)
    .is('transferido_at', null)
    .select()
    .single()

  if (error) {
    console.error('Erro ao desfazer prospecção:', error)
    throw error
  }

  invalidateOutboundCache()
  return data
}

/**
 * Transfere um lead outbound para o funil SDR via RPC atômica.
 * Retorna o ID do novo lead na tabela principal.
 */
export async function transferToFunnel(
  outboundId: number,
  sdrId: string,
  tipoLead: 'assessoria' | 'ia' = 'assessoria'
): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('transfer_outbound_to_sdr', {
      p_outbound_id: outboundId,
      p_sdr_id: sdrId,
      p_fonte: tipoLead === 'ia' ? 'ia' : 'outbound',
    })

  if (error) {
    console.error('Erro ao transferir para funil:', error)
    throw error
  }

  invalidateOutboundCache()
  return data as number
}

/**
 * Cria um lead outbound manualmente.
 */
export async function createOutboundLead(
  leadData: {
    nome: string
    whatsapp: string
    cidade_estado: string
    email?: string
    instagram?: string
    nome_empresa?: string
    faturamento_estimado?: string
    link_perfil?: string
    fonte_outbound: FonteOutbound
  },
  createdBy: string
): Promise<OutboundLead> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('outbound_leads')
    .insert({
      ...leadData,
      status_outbound: 'PARA_PROSPECTAR',
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar lead outbound:', error)
    throw error
  }

  invalidateOutboundCache()
  return data
}

/**
 * Importação em batch de leads outbound (Admin only).
 * Usa upsert para evitar duplicatas por whatsapp.
 * Retorna contagem de inseridos e duplicatas.
 */
export async function importOutboundLeads(
  leads: Array<{
    nome: string
    whatsapp: string
    cidade_estado: string
    email?: string
    instagram?: string
    nome_empresa?: string
    faturamento_estimado?: string
  }>,
  fonteOutbound: FonteOutbound,
  createdBy: string
): Promise<{ inserted: number; duplicates: number; errors: string[] }> {
  const supabase = createClient()
  const errors: string[] = []
  let inserted = 0
  let duplicates = 0

  // Busca todos whatsapps existentes para deduplicação
  const existingNumbers = new Set<string>()
  const { data: existing } = await supabase
    .from('outbound_leads')
    .select('whatsapp')

  if (existing) {
    existing.forEach((e: { whatsapp: string }) => existingNumbers.add(e.whatsapp.replace(/\D/g, '')))
  }

  // Filtra duplicatas e inválidos
  const toInsert: typeof leads = []
  leads.forEach((lead, index) => {
    if (!lead.nome || !lead.whatsapp) {
      errors.push(`Linha ${index + 2}: nome ou telefone ausente`)
      return
    }

    const numbersOnly = lead.whatsapp.replace(/\D/g, '')
    if (existingNumbers.has(numbersOnly)) {
      duplicates++
      return
    }

    existingNumbers.add(numbersOnly) // Evita duplicatas dentro do próprio arquivo
    toInsert.push(lead)
  })

  // Insere em batches de 100
  const BATCH_SIZE = 100
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE).map(lead => ({
      ...lead,
      fonte_outbound: fonteOutbound,
      status_outbound: 'PARA_PROSPECTAR' as StatusOutbound,
      created_by: createdBy,
    }))

    const { error } = await supabase
      .from('outbound_leads')
      .insert(batch)

    if (error) {
      console.error(`Erro no batch ${i}:`, error)
      errors.push(`Erro ao inserir batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }

  invalidateOutboundCache()
  return { inserted, duplicates, errors }
}

/**
 * Atualiza campos editáveis de um lead outbound.
 * Não permite edição se já foi transferido.
 */
export async function updateOutboundLead(
  outboundId: number,
  updates: Partial<Pick<OutboundLead, 'email' | 'instagram' | 'nome_empresa' | 'faturamento_estimado' | 'link_perfil'>>
): Promise<OutboundLead> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('outbound_leads')
    .update(updates)
    .eq('id', outboundId)
    .is('transferido_at', null) // Segurança: não edita transferidos
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar lead outbound:', error)
    throw error
  }

  invalidateOutboundCache()
  return data
}

/**
 * Conta os totais de cada status para exibir nos cabeçalhos.
 */
export async function getOutboundCounts(params: {
  sdrId?: string
  isAdmin?: boolean
}): Promise<{ paraProspectar: number; prospectados: number }> {
  const { sdrId, isAdmin = false } = params
  const supabase = createClient()

  let queryPP = supabase
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .eq('status_outbound', 'PARA_PROSPECTAR')
    .is('transferido_at', null)

  let queryP = supabase
    .from('outbound_leads')
    .select('id', { count: 'exact', head: true })
    .eq('status_outbound', 'PROSPECTADO')
    .is('transferido_at', null)

  if (!isAdmin && sdrId) {
    queryPP = queryPP.or(`sdr_id.eq.${sdrId},sdr_id.is.null`)
    queryP = queryP.or(`sdr_id.eq.${sdrId},sdr_id.is.null`)
  }

  const [resPP, resP] = await Promise.all([queryPP, queryP])

  return {
    paraProspectar: resPP.count || 0,
    prospectados: resP.count || 0,
  }
}

/**
 * Reverte a transferência de um lead outbound.
 * Deleta o lead da tabela principal e volta o outbound para PROSPECTADO.
 */
export async function revertTransferFromFunnel(leadId: number): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.rpc('revert_outbound_from_sdr', {
    p_lead_id: leadId,
  })

  if (error) {
    console.error('Erro ao reverter transferência:', JSON.stringify(error, null, 2))
    throw new Error(error.message || 'Erro desconhecido ao reverter transferência')
  }

  invalidateOutboundCache()
}
