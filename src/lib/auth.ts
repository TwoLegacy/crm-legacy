import { createClient } from './supabaseClient'
import type { Profile } from './leads'

// =====================================================
// FUNÇÕES DE AUTENTICAÇÃO
// =====================================================

/**
 * Realiza login com email e senha
 */
export async function signIn(email: string, password: string) {
  const supabase = createClient()
  
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  
  if (error) {
    console.error('Erro ao fazer login:', error)
    throw error
  }
  
  return data
}

/**
 * Realiza logout
 */
export async function signOut() {
  const supabase = createClient()
  
  const { error } = await supabase.auth.signOut()
  
  if (error) {
    console.error('Erro ao fazer logout:', error)
    throw error
  }
}

/**
 * Busca o perfil do usuário atual
 */
export async function getProfile(userId: string): Promise<Profile | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single()
  
  if (error) {
    // Se não encontrou o perfil, retorna null
    if (error.code === 'PGRST116') {
      return null
    }
    console.error('Erro ao buscar perfil:', error)
    throw error
  }
  
  return data
}

/**
 * Obtém a sessão atual do usuário
 */
export async function getSession() {
  const supabase = createClient()
  
  const { data: { session }, error } = await supabase.auth.getSession()
  
  if (error) {
    console.error('Erro ao obter sessão:', error)
    throw error
  }
  
  return session
}

/**
 * Obtém o usuário atual
 */
export async function getUser() {
  const supabase = createClient()
  
  const { data: { user }, error } = await supabase.auth.getUser()
  
  if (error) {
    console.error('Erro ao obter usuário:', error)
    throw error
  }
  
  return user
}
