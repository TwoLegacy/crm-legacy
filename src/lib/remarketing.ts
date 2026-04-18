import { createClient } from './supabaseClient'

// =====================================================
// TIPOS
// =====================================================

export type StatusRemarketing = 'PARA_PROSPECTAR' | 'PROSPECTADO'
export type FonteRemarketing = 'google_maps' | 'indicacao' | 'linkedin' | 'outros'

export interface RemarketingLead {
  id: number
  nome: string
  whatsapp: string
  cidade_estado: string
  email: string | null
  instagram: string | null
  nome_empresa: string | null
  faturamento_estimado: string | null
  link_perfil: string | null
  fonte_remarketing: FonteRemarketing
  status_remarketing: StatusRemarketing
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

const CACHE_TTL = 15000

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const remarketingCache = new Map<string, CacheEntry<any>>()

export function invalidateRemarketingCache(pattern?: string): void {
  if (pattern) {
    for (const key of remarketingCache.keys()) {
      if (key.includes(pattern)) {
        remarketingCache.delete(key)
      }
    }
  } else {
    remarketingCache.clear()
  }
}

// =====================================================
// FUNÇÕES DE CONSULTA
// =====================================================

export async function getRemarketingLeads(params: {
  status: StatusRemarketing
  sdrId?: string
  isAdmin?: boolean
  page?: number
  pageSize?: number
  search?: string
}): Promise<{ data: RemarketingLead[]; count: number }> {
  const { status, sdrId, isAdmin = false, page = 0, pageSize = 30, search } = params
  const supabase = createClient()

  let query = supabase
    .from('remarketing_leads')
    .select('*', { count: 'exact' })
    .eq('status_remarketing', status)
    .is('transferido_at', null)

  if (!isAdmin && sdrId) {
    query = query.or(`sdr_id.eq.${sdrId},sdr_id.is.null`)
  }

  if (search && search.trim()) {
    const term = `%${search.trim()}%`
    query = query.or(`nome.ilike.${term},whatsapp.ilike.${term}`)
  }

  if (status === 'PARA_PROSPECTAR') {
    query = query.order('created_at', { ascending: true })
  } else {
    query = query.order('prospectado_at', { ascending: false })
  }

  const from = page * pageSize
  const to = from + pageSize - 1
  query = query.range(from, to)

  const { data, error, count } = await query

  if (error) {
    console.error('Erro ao buscar remarketing leads:', error)
    throw error
  }

  return { data: data || [], count: count || 0 }
}

export async function markAsProspected(
  remarketingId: number,
  sdrId: string
): Promise<RemarketingLead> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('remarketing_leads')
    .update({
      status_remarketing: 'PROSPECTADO',
      sdr_id: sdrId,
      prospectado_at: new Date().toISOString(),
    })
    .eq('id', remarketingId)
    .select()
    .single()

  if (error) {
    console.error('Erro ao marcar como prospectado:', error)
    throw error
  }

  invalidateRemarketingCache()
  return data
}

export async function undoProspected(remarketingId: number): Promise<RemarketingLead> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('remarketing_leads')
    .update({
      status_remarketing: 'PARA_PROSPECTAR',
      sdr_id: null,
      prospectado_at: null,
    })
    .eq('id', remarketingId)
    .is('transferido_at', null)
    .select()
    .single()

  if (error) {
    console.error('Erro ao desfazer prospecção:', error)
    throw error
  }

  invalidateRemarketingCache()
  return data
}

export async function transferToFunnel(
  remarketingId: number,
  sdrId: string,
  tipoLead: 'assessoria' | 'ia' = 'assessoria'
): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .rpc('transfer_remarketing_to_sdr', {
      p_remarketing_id: remarketingId,
      p_sdr_id: sdrId,
      p_fonte: tipoLead === 'ia' ? 'ia' : 'remarketing',
    })

  if (error) {
    console.error('Erro ao transferir para funil:', error)
    throw error
  }

  invalidateRemarketingCache()
  return data as number
}

export async function createRemarketingLead(
  leadData: {
    nome: string
    whatsapp: string
    cidade_estado: string
    email?: string
    instagram?: string
    nome_empresa?: string
    faturamento_estimado?: string
    link_perfil?: string
    fonte_remarketing: FonteRemarketing
  },
  createdBy: string
): Promise<RemarketingLead> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('remarketing_leads')
    .insert({
      ...leadData,
      status_remarketing: 'PARA_PROSPECTAR',
      created_by: createdBy,
    })
    .select()
    .single()

  if (error) {
    console.error('Erro ao criar lead remarketing:', error)
    throw error
  }

  invalidateRemarketingCache()
  return data
}

export async function importRemarketingLeads(
  leads: Array<{
    nome: string
    whatsapp: string
    cidade_estado: string
    email?: string
    instagram?: string
    nome_empresa?: string
    faturamento_estimado?: string
  }>,
  fonteRemarketing: FonteRemarketing,
  createdBy: string
): Promise<{ inserted: number; duplicates: number; errors: string[] }> {
  const supabase = createClient()
  const errors: string[] = []
  let inserted = 0
  let duplicates = 0

  const existingNumbers = new Set<string>()
  const { data: existing } = await supabase
    .from('remarketing_leads')
    .select('whatsapp')

  if (existing) {
    existing.forEach((e: { whatsapp: string }) => existingNumbers.add(e.whatsapp.replace(/\D/g, '')))
  }

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

    existingNumbers.add(numbersOnly)
    toInsert.push(lead)
  })

  const BATCH_SIZE = 100
  for (let i = 0; i < toInsert.length; i += BATCH_SIZE) {
    const batch = toInsert.slice(i, i + BATCH_SIZE).map(lead => ({
      ...lead,
      fonte_remarketing: fonteRemarketing,
      status_remarketing: 'PARA_PROSPECTAR' as StatusRemarketing,
      created_by: createdBy,
    }))

    const { error } = await supabase
      .from('remarketing_leads')
      .insert(batch)

    if (error) {
      console.error(`Erro no batch ${i}:`, error)
      errors.push(`Erro ao inserir batch ${Math.floor(i / BATCH_SIZE) + 1}: ${error.message}`)
    } else {
      inserted += batch.length
    }
  }

  invalidateRemarketingCache()
  return { inserted, duplicates, errors }
}

export async function updateRemarketingLead(
  remarketingId: number,
  updates: Partial<Pick<RemarketingLead, 'email' | 'instagram' | 'nome_empresa' | 'faturamento_estimado' | 'link_perfil'>>
): Promise<RemarketingLead> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('remarketing_leads')
    .update(updates)
    .eq('id', remarketingId)
    .is('transferido_at', null)
    .select()
    .single()

  if (error) {
    console.error('Erro ao atualizar lead remarketing:', error)
    throw error
  }

  invalidateRemarketingCache()
  return data
}

export async function getRemarketingCounts(params: {
  sdrId?: string
  isAdmin?: boolean
}): Promise<{ paraProspectar: number; prospectados: number }> {
  const { sdrId, isAdmin = false } = params
  const supabase = createClient()

  let queryPP = supabase
    .from('remarketing_leads')
    .select('id', { count: 'exact', head: true })
    .eq('status_remarketing', 'PARA_PROSPECTAR')
    .is('transferido_at', null)

  let queryP = supabase
    .from('remarketing_leads')
    .select('id', { count: 'exact', head: true })
    .eq('status_remarketing', 'PROSPECTADO')
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

export async function revertTransferFromFunnel(leadId: number): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.rpc('revert_remarketing_from_sdr', {
    p_lead_id: leadId,
  })

  if (error) {
    console.error('Erro ao reverter transferência:', JSON.stringify(error, null, 2))
    throw new Error(error.message || 'Erro desconhecido ao reverter transferência')
  }

  invalidateRemarketingCache()
}
