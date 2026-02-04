'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { getAllUsers, updateUserProfile, createUser, deleteUser, resetUserPassword, changeUserPassword, Profile } from '@/lib/leads'
import { Qualificacao } from '@/lib/kanban'
import Sidebar from '@/components/Sidebar'
import ConfirmModal from '@/components/ConfirmModal'
import UserFormModal from '@/components/UserFormModal'
import TransferLeadsModal from '@/components/TransferLeadsModal'
import ChangePasswordModal from '@/components/ChangePasswordModal'

export default function UsuariosPage() {
  const router = useRouter()
  const supabase = createClient()
  
  const [profile, setProfile] = useState<Profile | null>(null)
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)
  
  // Modais
  const [formModalOpen, setFormModalOpen] = useState(false)
  const [editingUser, setEditingUser] = useState<Profile | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [userToDelete, setUserToDelete] = useState<Profile | null>(null)
  const [transferModalOpen, setTransferModalOpen] = useState(false)
  const [transferFromSdrId, setTransferFromSdrId] = useState<string | null>(null)
  const [passwordModalOpen, setPasswordModalOpen] = useState(false)
  const [userForPasswordChange, setUserForPasswordChange] = useState<Profile | null>(null)

  useEffect(() => {
    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session?.user) {
          router.replace('/login')
          return
        }

        const { data: profileData } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .single()

        if (!profileData || profileData.role !== 'admin') {
          router.replace('/admin/kanban')
          return
        }

        setProfile(profileData)
        
        const usersData = await getAllUsers()
        setUsers(usersData)
      } catch (err: any) {
        console.error('Erro ao inicializar:', err)
        setError('Erro ao carregar dados')
      } finally {
        setLoading(false)
      }
    }

    init()
  }, [supabase, router])

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg)
    setTimeout(() => setSuccessMessage(null), 3000)
  }

  const handleCreateUser = async (data: {
    email: string
    password: string
    name: string
    role: 'admin' | 'sdr'
    visible_qualifications: Qualificacao[]
  }) => {
    setError(null)
    const result = await createUser(data)
    
    if (result.success) {
      const usersData = await getAllUsers()
      setUsers(usersData)
      setFormModalOpen(false)
      showSuccess('Usuário criado com sucesso!')
    } else {
      setError(result.error || 'Erro ao criar usuário')
    }
  }

  const handleUpdateUser = async (userId: string, data: {
    name: string
    role: 'admin' | 'sdr'
    visible_qualifications: Qualificacao[]
  }) => {
    setError(null)
    try {
      await updateUserProfile(userId, data)
      const usersData = await getAllUsers()
      setUsers(usersData)
      setFormModalOpen(false)
      setEditingUser(null)
      showSuccess('Usuário atualizado com sucesso!')
    } catch (err: any) {
      setError(err.message || 'Erro ao atualizar usuário')
    }
  }

  const handleDeleteUser = async () => {
    if (!userToDelete) return
    
    setError(null)
    const result = await deleteUser(userToDelete.id)
    
    if (result.success) {
      setUsers(users.filter(u => u.id !== userToDelete.id))
      setDeleteModalOpen(false)
      setUserToDelete(null)
      showSuccess('Usuário excluído com sucesso!')
    } else {
      setError(result.error || 'Erro ao excluir usuário')
    }
  }

  const handleResetPassword = async (user: Profile) => {
    if (!user.email) {
      setError('Usuário não tem email cadastrado')
      return
    }
    
    setError(null)
    const result = await resetUserPassword(user.email)
    
    if (result.success) {
      showSuccess(`Email de reset enviado para ${user.email}`)
    } else {
      setError(result.error || 'Erro ao enviar reset')
    }
  }

  const openEditModal = (user: Profile) => {
    setEditingUser(user)
    setFormModalOpen(true)
  }

  const openDeleteModal = (user: Profile) => {
    setUserToDelete(user)
    setDeleteModalOpen(true)
  }

  const openTransferModal = (user: Profile | null = null) => {
    setTransferFromSdrId(user?.id || null)
    setTransferModalOpen(true)
  }

  const handleTransferComplete = (count: number) => {
    showSuccess(`${count} lead(s) transferido(s) com sucesso!`)
  }

  const openPasswordModal = (user: Profile) => {
    setUserForPasswordChange(user)
    setPasswordModalOpen(true)
  }

  const handleChangePassword = async (userId: string, newPassword: string) => {
    setError(null)
    const result = await changeUserPassword(userId, newPassword)
    
    if (result.success) {
      showSuccess('Senha alterada com sucesso!')
    } else {
      throw new Error(result.error || 'Erro ao alterar senha')
    }
  }

  const qualificacaoLabels: Record<Qualificacao, string> = {
    'RUIM': 'Nível 1',
    'MEDIO': 'Nível 2',
    'QUALIFICADO': 'Nível 3',
    'ULTRA': 'Nível 4',
    'COMUNIDADE': 'Comunidade',
  }

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

  if (!profile) {
    return null
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 p-6">
        {/* Header */}
        <header className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Gerenciar Usuários</h1>
              <p className="text-sm text-gray-500 mt-1">
                Crie, edite e gerencie os usuários do sistema
              </p>
            </div>
            <button
              onClick={() => {
                setEditingUser(null)
                setFormModalOpen(true)
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#8B0000] text-white rounded-lg hover:bg-[#6B0000] transition-colors font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Novo Usuário
            </button>
          </div>
        </header>

        {/* Mensagens */}
        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {error}
            <button onClick={() => setError(null)} className="ml-auto text-red-500 hover:text-red-700">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {successMessage && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center gap-2">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            {successMessage}
          </div>
        )}

        {/* Tabela de Usuários */}
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full hidden md:table">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Nome</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Email</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Função</th>
                <th className="text-left px-6 py-4 text-sm font-semibold text-gray-900">Colunas Visíveis</th>
                <th className="text-right px-6 py-4 text-sm font-semibold text-gray-900">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {users.map(user => (
                <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-900">{user.name}</div>
                  </td>
                  <td className="px-6 py-4 text-gray-600 text-sm">{user.email || '-'}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800' 
                        : 'bg-blue-100 text-blue-800'
                    }`}>
                      {user.role === 'admin' ? 'Admin' : 'SDR'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {user.visible_qualifications?.map(q => (
                        <span 
                          key={q} 
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-700"
                        >
                          {qualificacaoLabels[q]}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => openEditModal(user)}
                        className="p-2 text-gray-500 hover:text-[#8B0000] hover:bg-gray-100 rounded-lg transition-colors"
                        title="Editar"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => openPasswordModal(user)}
                        className="p-2 text-gray-500 hover:text-amber-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Alterar Senha"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                        </svg>
                      </button>
                      {user.role === 'sdr' && (
                        <button
                          onClick={() => openTransferModal(user)}
                          className="p-2 text-gray-500 hover:text-blue-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Transferir Leads"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                          </svg>
                        </button>
                      )}
                      {user.id !== profile.id && (
                        <button
                          onClick={() => openDeleteModal(user)}
                          className="p-2 text-gray-500 hover:text-red-600 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Excluir"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* Cards Mobile */}
          <div className="md:hidden space-y-4 p-4">
            {users.map(user => (
              <div key={user.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{user.name}</h3>
                    <p className="text-sm text-gray-500">{user.email}</p>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800' 
                      : 'bg-blue-100 text-blue-800'
                  }`}>
                    {user.role === 'admin' ? 'Admin' : 'SDR'}
                  </span>
                </div>
                
                {user.visible_qualifications && user.visible_qualifications.length > 0 && (
                  <div className="mb-4">
                    <p className="text-xs text-gray-500 mb-1.5 font-medium">Colunas visíveis:</p>
                    <div className="flex flex-wrap gap-1">
                      {user.visible_qualifications.map(q => (
                        <span 
                          key={q} 
                          className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-50 text-gray-600 border border-gray-100"
                        >
                          {qualificacaoLabels[q]}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2 pt-3 border-t border-gray-100 mt-2">
                  <button
                    onClick={() => openEditModal(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors border border-gray-200"
                  >
                    <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Editar
                  </button>
                  {user.role === 'sdr' && (
                    <button
                      onClick={() => openTransferModal(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors border border-blue-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Transferir
                    </button>
                  )}
                  <button
                    onClick={() => openPasswordModal(user)}
                    className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 rounded-lg transition-colors border border-amber-100"
                  >
                     <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                    </svg>
                    Senha
                  </button>
                  {user.id !== profile.id && (
                    <button
                      onClick={() => openDeleteModal(user)}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 text-sm font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors border border-red-100"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Excluir
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {users.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p>Nenhum usuário cadastrado</p>
            </div>
          )}
        </div>

        {/* Modal de Criar/Editar */}
        <UserFormModal
          isOpen={formModalOpen}
          user={editingUser}
          onClose={() => {
            setFormModalOpen(false)
            setEditingUser(null)
          }}
          onCreate={handleCreateUser}
          onUpdate={handleUpdateUser}
        />

        {/* Modal de Confirmar Exclusão */}
        <ConfirmModal
          isOpen={deleteModalOpen}
          title="Excluir Usuário"
          message={`Tem certeza que deseja excluir o usuário "${userToDelete?.name}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          cancelLabel="Cancelar"
          onConfirm={handleDeleteUser}
          onCancel={() => {
            setDeleteModalOpen(false)
            setUserToDelete(null)
          }}
          variant="danger"
        />

        {/* Modal de Transferência de Leads */}
        <TransferLeadsModal
          isOpen={transferModalOpen}
          sdrs={users}
          initialFromSdrId={transferFromSdrId}
          onClose={() => {
            setTransferModalOpen(false)
            setTransferFromSdrId(null)
          }}
          onTransferComplete={handleTransferComplete}
        />

        {/* Modal de Alterar Senha */}
        <ChangePasswordModal
          isOpen={passwordModalOpen}
          userId={userForPasswordChange?.id || null}
          userName={userForPasswordChange?.name || ''}
          onClose={() => {
            setPasswordModalOpen(false)
            setUserForPasswordChange(null)
          }}
          onSubmit={handleChangePassword}
        />
      </div>
    </Sidebar>
  )
}
