'use client'

import { useState, useEffect } from 'react'
import { Profile } from '@/lib/leads'
import { Qualificacao } from '@/lib/kanban'
import PremiumSelect from './ui/PremiumSelect'

interface UserFormModalProps {
  isOpen: boolean
  user: Profile | null // null = criar novo, Profile = editar
  onClose: () => void
  onCreate: (data: {
    email: string
    password: string
    name: string
    role: 'admin' | 'sdr'
    visible_qualifications: Qualificacao[]
  }) => Promise<void>
  onUpdate: (userId: string, data: {
    name: string
    role: 'admin' | 'sdr'
    visible_qualifications: Qualificacao[]
  }) => Promise<void>
}

const ALL_QUALIFICACOES: { value: Qualificacao; label: string }[] = [
  { value: 'RUIM', label: 'Nível 1' },
  { value: 'MEDIO', label: 'Nível 2' },
  { value: 'QUALIFICADO', label: 'Nível 3' },
  { value: 'ULTRA', label: 'Nível 4' },
  { value: 'COMUNIDADE', label: 'Comunidade' },
]

export default function UserFormModal({
  isOpen,
  user,
  onClose,
  onCreate,
  onUpdate,
}: UserFormModalProps) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'admin' | 'sdr'>('sdr')
  const [visibleQualifications, setVisibleQualifications] = useState<Qualificacao[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const isEditing = !!user

  useEffect(() => {
    if (user) {
      setName(user.name)
      setEmail(user.email || '')
      setRole(user.role)
      setVisibleQualifications(user.visible_qualifications || [])
      setPassword('')
    } else {
      setName('')
      setEmail('')
      setPassword('')
      setRole('sdr')
      setVisibleQualifications(['RUIM', 'MEDIO', 'QUALIFICADO', 'ULTRA'])
    }
    setError(null)
  }, [user, isOpen])

  const toggleQualification = (q: Qualificacao) => {
    if (visibleQualifications.includes(q)) {
      setVisibleQualifications(visibleQualifications.filter(v => v !== q))
    } else {
      setVisibleQualifications([...visibleQualifications, q])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!name.trim()) {
      setError('Nome é obrigatório')
      return
    }

    if (!isEditing) {
      if (!email.trim()) {
        setError('Email é obrigatório')
        return
      }
      if (!password || password.length < 6) {
        setError('Senha deve ter no mínimo 6 caracteres')
        return
      }
    }

    if (visibleQualifications.length === 0) {
      setError('Selecione pelo menos uma coluna visível')
      return
    }

    setLoading(true)

    try {
      if (isEditing) {
        await onUpdate(user.id, {
          name,
          role,
          visible_qualifications: visibleQualifications,
        })
      } else {
        await onCreate({
          email,
          password,
          name,
          role,
          visible_qualifications: visibleQualifications,
        })
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-100">
          <h2 className="text-xl font-bold text-gray-900">
            {isEditing ? 'Editar Usuário' : 'Novo Usuário'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Nome</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B0000] focus:border-transparent"
              placeholder="Nome do usuário"
            />
          </div>

          {/* Email (apenas na criação) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B0000] focus:border-transparent"
                placeholder="email@exemplo.com"
              />
            </div>
          )}

          {/* Senha (apenas na criação) */}
          {!isEditing && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Senha</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B0000] focus:border-transparent"
                placeholder="Mínimo 6 caracteres"
              />
            </div>
          )}

          {/* Role */}
          <PremiumSelect
            label="Função"
            value={role}
            onChange={(val) => setRole(val as 'admin' | 'sdr')}
            options={[
              { 
                value: 'sdr', 
                label: 'SDR',
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )
              },
              { 
                value: 'admin', 
                label: 'Admin',
                icon: (
                  <svg className="w-4 h-4 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04zM12 21a9.003 9.003 0 008.367-5.633L12 11.367 3.633 15.367A9.003 9.003 0 0012 21z" />
                  </svg>
                )
              }
            ]}
          />

          {/* Colunas visíveis */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Colunas Visíveis
            </label>
            <div className="space-y-2">
              {ALL_QUALIFICACOES.map(q => (
                <label key={q.value} className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={visibleQualifications.includes(q.value)}
                    onChange={() => toggleQualification(q.value)}
                    className="w-4 h-4 text-[#8B0000] rounded focus:ring-[#8B0000]"
                  />
                  <span className="text-sm text-gray-700">{q.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Botões */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-4 py-2 bg-[#8B0000] text-white rounded-lg hover:bg-[#6B0000] transition-colors font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && (
                <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {isEditing ? 'Salvar' : 'Criar Usuário'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
