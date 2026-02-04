'use client'

import { createContext, useContext, useEffect, useState, useCallback, ReactNode, useRef } from 'react'
import { User, AuthChangeEvent, Session } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabaseClient'
import type { Profile } from '@/lib/leads'

// =====================================================
// TIPOS
// =====================================================

interface AuthContextType {
  user: User | null
  profile: Profile | null
  loading: boolean
  error: string | null
  refreshProfile: () => Promise<void>
}

// =====================================================
// CONTEXT
// =====================================================

const AuthContext = createContext<AuthContextType>({
  user: null,
  profile: null,
  loading: true,
  error: null,
  refreshProfile: async () => {},
})

// =====================================================
// PROVIDER
// =====================================================

interface AuthProviderProps {
  children: ReactNode
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [initialized, setInitialized] = useState(false)

  const supabase = createClient()

  // Carrega o perfil do usuário
  const loadProfile = useCallback(async (userId: string) => {
    console.log('[AuthContext] Carregando profile para userId:', userId)
    try {
      // Cria uma promise de timeout
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Timeout ao carregar perfil')), 10000)
      )

      // Query do Supabase
      const queryPromise = supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()

      // Corrida entre a query e o timeout
      const { data, error: profileError } = await Promise.race([
        queryPromise,
        timeoutPromise
      ]) as any
      
      if (profileError) {
        throw profileError
      }
      
      if (!data) {
        console.warn('[AuthContext] Perfil não encontrado para o usuário:', userId)
        setError('Perfil de usuário não encontrado. Contate o suporte.')
        return null
      }
      
      console.log('[AuthContext] Profile carregado:', data)
      setProfile(data)
      setError(null) // Limpa erro se sucesso
      return data
    } catch (err: any) {
      console.error('[AuthContext] Erro ao carregar perfil:', err)
      // Se for timeout ou erro de rede, define erro mas não trava tudo
      setError(err.message || 'Erro ao carregar perfil do usuário')
      return null
    }
  }, [supabase])

  // Função para recarregar o perfil
  const refreshProfile = useCallback(async () => {
    if (user) {
      await loadProfile(user.id)
    }
  }, [user, loadProfile])

  // Refs para estado interno (evita dependências no useEffect)
  const profileRef = useRef<Profile | null>(null)
  
  // Atualiza ref quando state muda
  useEffect(() => {
    profileRef.current = profile
  }, [profile])

  // Listener de eventos e inicialização
  useEffect(() => {
    console.log('[AuthContext] Configurando listener de auth...')
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log(`[AuthContext] Evento: ${event}`, session?.user?.id || 'sem user')
        
        // Timeout de segurança para não travar a tela de loading
        const safetyTimeout = setTimeout(() => {
          if (loading) {
            console.warn('[AuthContext] Timeout de segurança atingido. Forçando fim do loading.')
            setLoading(false)
          }
        }, 5000)

        try {
          if (event === 'INITIAL_SESSION') {
            if (session?.user) {
              setUser(session.user)
              await loadProfile(session.user.id)
            } else {
              setUser(null)
              setProfile(null)
            }
            setLoading(false)
            setInitialized(true)
            return
          }
          
          if (event === 'SIGNED_OUT') {
            setUser(null)
            setProfile(null)
            setLoading(false)
            return
          }
          
          if (session?.user && (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED')) {
            setUser(session.user)
            // Usa ref para checar se precisa recarregar, evitando dependência circular
            const currentProfile = profileRef.current
            if (!currentProfile || currentProfile.id !== session.user.id) {
               await loadProfile(session.user.id)
            }
            setLoading(false)
          }
        } catch (error) {
          console.error('[AuthContext] Erro no processamento de auth:', error)
          setLoading(false)
        } finally {
          clearTimeout(safetyTimeout)
        }
      }
    )

    return () => {
      subscription.unsubscribe()
    }
    // Removemos 'profile' e 'loadProfile' das dependências para manter o listener estável
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase])

  return (
    <AuthContext.Provider value={{ user, profile, loading, error, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

// =====================================================
// HOOK
// =====================================================

export function useAuth() {
  const context = useContext(AuthContext)
  
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider')
  }
  
  return context
}

export default AuthContext
