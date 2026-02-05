import { createClient } from './supabaseClient'
import type { Qualificacao } from './kanban'

// =====================================================
// TIPOS
// =====================================================

export interface Profile {
  id: string
  name: string
  email?: string
  role: 'admin' | 'sdr'
  visible_qualifications: Qualificacao[]
  created_at: string
  updated_at: string
}

export interface Lead {
  id: number
  nome: string
  whatsapp: string | null
  whatsapp_formatado: string | null
  tipo_hospedagem: string | null
  outros_hospedagem: string | null
  faturamento_medio: string | null
  instagram: string | null
  qtd_quartos_hospedagens: string | null
  owner_sdr_id: string | null
  status_sdr: 'MEUS_LEADS' | 'QUALIFICACAO' | 'PERTO_REUNIAO' | 'ENCAMINHADO_REUNIAO' | 'VENDEU' | 'LEAD_PERDIDO' | null
  fonte: 'geral' | 'comunidade' | 'site' | null
  origem: string | null
  // Campos específicos de comunidade
  maior_desafio: string | null
  ja_tentou_de_tudo: string | null
  melhorar_primeiro: string | null
  falta_destravar: string | null
  // Campos específicos do site
  email: string | null
  nome_hospedagem: string | null
  investimento_mkt: string | null
  created_at: string
  updated_at: string
}

// =====================================================
// CACHE
// =====================================================

const CACHE_TTL = 30000 // 30 segundos

interface CacheEntry<T> {
  data: T
  timestamp: number
}

const cache = new Map<string, CacheEntry<any>>()

function getCached<T>(key: string): T | null {
  const entry = cache.get(key)
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data
  }
  cache.delete(key)
  return null
}

function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, timestamp: Date.now() })
}

export function invalidateCache(pattern?: string): void {
  if (pattern) {
    for (const key of cache.keys()) {
      if (key.includes(pattern)) {
        cache.delete(key)
      }
    }
  } else {
    cache.clear()
  }
}

// =====================================================
// FUNÇÕES DE LEADS
// =====================================================

/**
 * Busca todos os leads (para admin ou kanban global)
 */
export async function getAllLeads(): Promise<Lead[]> {
  const cacheKey = 'leads:all'
  const cached = getCached<Lead[]>(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Erro ao buscar leads:', error)
    throw error
  }
  
  const result = data || []
  setCache(cacheKey, result)
  return result
}

/**
 * Busca leads de um SDR específico
 */
export async function getLeadsBySdr(sdrId: string): Promise<Lead[]> {
  const cacheKey = `leads:sdr:${sdrId}`
  const cached = getCached<Lead[]>(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('owner_sdr_id', sdrId)
    .order('created_at', { ascending: false })
  
  if (error) {
    console.error('Erro ao buscar leads do SDR:', error)
    throw error
  }
  
  const result = data || []
  setCache(cacheKey, result)
  return result
}

/**
 * Atribui um lead a um SDR
 */
export async function assignLeadToSdr(leadId: number, sdrId: string): Promise<Lead> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .update({
      owner_sdr_id: sdrId,
      status_sdr: 'MEUS_LEADS'
    })
    .eq('id', leadId)
    .select()
    .single()
  
  if (error) {
    console.error('Erro ao atribuir lead:', error)
    throw error
  }
  
  invalidateCache('leads')
  return data
}

/**
 * Desatribui um lead (remove do SDR e volta para o pool global)
 */
export async function unassignLead(leadId: number): Promise<Lead> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .update({
      owner_sdr_id: null,
      status_sdr: null
    })
    .eq('id', leadId)
    .select()
    .single()
  
  if (error) {
    console.error('Erro ao desatribuir lead:', error)
    throw error
  }
  
  invalidateCache('leads')
  return data
}

/**
 * Reatribui um lead de um SDR para outro
 */
export async function reassignLead(leadId: number, newSdrId: string): Promise<Lead> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .update({
      owner_sdr_id: newSdrId,
      status_sdr: 'MEUS_LEADS' // Reseta para "Meus leads" ao reatribuir
    })
    .eq('id', leadId)
    .select()
    .single()
  
  if (error) {
    console.error('Erro ao reatribuir lead:', error)
    throw error
  }
  
  invalidateCache('leads')
  return data
}

/**
 * Transfere TODOS os leads de um SDR para outro
 * Retorna a quantidade de leads transferidos
 */
export async function transferAllLeadsFromSdr(
  fromSdrId: string,
  toSdrId: string | null
): Promise<number> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .update({
      owner_sdr_id: toSdrId,
      status_sdr: 'MEUS_LEADS'
    })
    .eq('owner_sdr_id', fromSdrId)
    .select()
  
  if (error) {
    console.error('Erro ao transferir leads em massa:', error)
    throw error
  }
  
  invalidateCache('leads')
  return data?.length || 0
}

/**
 * Transfere leads específicos para outro SDR
 * Retorna a quantidade de leads transferidos
 */
export async function transferMultipleLeads(
  leadIds: number[],
  toSdrId: string | null
): Promise<number> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .update({
      owner_sdr_id: toSdrId,
      status_sdr: 'MEUS_LEADS'
    })
    .in('id', leadIds)
    .select()
  
  if (error) {
    console.error('Erro ao transferir leads:', error)
    throw error
  }
  
  invalidateCache('leads')
  return data?.length || 0
}


/**
 * Deleta um lead permanentemente (apenas admin)
 */
export async function deleteLead(leadId: number): Promise<void> {
  const supabase = createClient()
  
  const { error } = await supabase
    .from('leads')
    .delete()
    .eq('id', leadId)
  
  if (error) {
    console.error('Erro ao deletar lead:', error)
    throw error
  }
  
  invalidateCache('leads')
}

/**
 * Atualiza o status de um lead (para kanban individual do SDR)
 */
export async function updateLeadStatus(
  leadId: number,
  status: 'MEUS_LEADS' | 'QUALIFICACAO' | 'PERTO_REUNIAO' | 'ENCAMINHADO_REUNIAO' | 'VENDEU' | 'LEAD_PERDIDO'
): Promise<Lead> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('leads')
    .update({ status_sdr: status })
    .eq('id', leadId)
    .select()
    .single()
  
  if (error) {
    console.error('Erro ao atualizar status:', error)
    throw error
  }
  
  invalidateCache('leads')
  return data
}

/**
 * Busca todos os SDRs (para modal de atribuição)
 */
export async function getAllSdrs(): Promise<Profile[]> {
  const cacheKey = 'sdrs:all'
  const cached = getCached<Profile[]>(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('role', 'sdr')
    .order('name')
  
  if (error) {
    console.error('Erro ao buscar SDRs:', error)
    throw error
  }
  
  const result = data || []
  setCache(cacheKey, result)
  return result
}

// =====================================================
// FUNÇÕES DE GERENCIAMENTO DE USUÁRIOS (ADMIN)
// =====================================================

// URL da Edge Function - será configurada via .env
const EDGE_FUNCTION_URL = process.env.NEXT_PUBLIC_SUPABASE_URL 
  ? `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/admin-users`
  : ''

/**
 * Busca todos os usuários (profiles)
 */
export async function getAllUsers(): Promise<Profile[]> {
  const cacheKey = 'users:all'
  const cached = getCached<Profile[]>(cacheKey)
  if (cached) return cached

  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .order('name')
  
  if (error) {
    console.error('Erro ao buscar usuários:', error)
    throw error
  }
  
  const result = data || []
  setCache(cacheKey, result)
  return result
}

/**
 * Atualiza o perfil de um usuário (nome, role, permissões)
 */
export async function updateUserProfile(
  userId: string, 
  updates: { name?: string; role?: 'admin' | 'sdr'; visible_qualifications?: Qualificacao[] }
): Promise<Profile> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
  
  if (error) {
    console.error('Erro ao atualizar perfil:', error)
    throw error
  }
  
  if (!data || data.length === 0) {
    throw new Error('Usuário não encontrado')
  }
  
  invalidateCache('users')
  invalidateCache('sdrs')
  return data[0]
}

/**
 * Cria um novo usuário via Edge Function
 */
export async function createUser(userData: {
  email: string
  password: string
  name: string
  role: 'admin' | 'sdr'
  visible_qualifications: Qualificacao[]
}): Promise<{ success: boolean; user?: { id: string; email: string; name: string }; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    return { success: false, error: 'Não autenticado' }
  }
  
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(userData),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Erro ao criar usuário' }
    }
    
    invalidateCache('users')
    invalidateCache('sdrs')
    return result
  } catch (err: any) {
    console.error('Erro ao criar usuário:', err)
    return { success: false, error: err.message || 'Erro de conexão' }
  }
}

/**
 * Deleta um usuário via Edge Function
 */
export async function deleteUser(userId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    return { success: false, error: 'Não autenticado' }
  }
  
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/delete`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Erro ao deletar usuário' }
    }
    
    invalidateCache('users')
    invalidateCache('sdrs')
    return result
  } catch (err: any) {
    console.error('Erro ao deletar usuário:', err)
    return { success: false, error: err.message || 'Erro de conexão' }
  }
}

/**
 * Envia email de reset de senha via Edge Function
 */
export async function resetUserPassword(email: string): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    return { success: false, error: 'Não autenticado' }
  }
  
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/reset-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ email }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Erro ao enviar reset' }
    }
    
    return result
  } catch (err: any) {
    console.error('Erro ao enviar reset de senha:', err)
    return { success: false, error: err.message || 'Erro de conexão' }
  }
}

/**
 * Altera a senha de um usuário diretamente (sem precisar de email)
 * Apenas admin pode usar esta função
 */
export async function changeUserPassword(
  userId: string,
  newPassword: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  
  if (!session?.access_token) {
    return { success: false, error: 'Não autenticado' }
  }
  
  try {
    const response = await fetch(`${EDGE_FUNCTION_URL}/change-password`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({ userId, newPassword }),
    })
    
    const result = await response.json()
    
    if (!response.ok) {
      return { success: false, error: result.error || 'Erro ao alterar senha' }
    }
    
    return result
  } catch (err: any) {
    console.error('Erro ao alterar senha:', err)
    return { success: false, error: err.message || 'Erro de conexão' }
  }
}
