'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'

export default function Home() {
  const router = useRouter()
  const { user, profile, loading, error } = useAuth()

  useEffect(() => {
    if (loading) return
    
    // Se não tem usuário, login
    if (!user) {
      router.replace('/login')
      return
    }

    // Se tem usuário e perfil, redireciona
    if (profile) {
      router.replace(profile.role === 'admin' ? '/admin/kanban' : '/sdr/kanban')
    }
    // Se tem usuário mas não tem perfil (e não está carregando), deixa na tela com mensagem de erro (renderizado abaixo)
  }, [user, profile, loading, router])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B0000] mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  // Mostra erro se tiver usuário mas falhar perfil
  if (user && !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 text-center border border-red-100">
          <div className="mx-auto h-16 w-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
            <svg className="h-8 w-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Erro ao carregar perfil</h2>
          <p className="text-gray-600 mb-6">{error || 'Não foi possível carregar seus dados de perfil. Tente novamente.'}</p>
          <div className="flex flex-col gap-3">
             <button 
               onClick={() => window.location.reload()}
               className="w-full px-4 py-2 bg-[#8B0000] text-white rounded-lg hover:bg-[#6B0000] transition-colors"
             >
               Tentar Novamente
             </button>
             <button 
               onClick={() => router.replace('/login')}
               className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
             >
               Voltar para Login
             </button>
          </div>
        </div>
      </div>
    )
  }
}
