'use client'

import { useState } from 'react'
import { FonteRemarketing, createRemarketingLead, RemarketingLead } from '@/lib/remarketing'

interface AddRemarketingLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (lead: RemarketingLead) => void
  userId: string
}

const FONTES: { value: FonteRemarketing; label: string }[] = [
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'outros', label: 'Outros' },
]

function formatPhone(value: string): string {
  const nums = value.replace(/\D/g, '').slice(0, 11)
  if (nums.length <= 2) return nums
  if (nums.length <= 7) return `(${nums.slice(0, 2)}) ${nums.slice(2)}`
  return `(${nums.slice(0, 2)}) ${nums.slice(2, 7)}-${nums.slice(7)}`
}

export default function AddRemarketingLeadModal({ isOpen, onClose, onSuccess, userId }: AddRemarketingLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({
    nome: '',
    whatsapp: '',
    cidade_estado: '',
    email: '',
    instagram: '',
    nome_empresa: '',
    faturamento_estimado: '',
    link_perfil: '',
    fonte_remarketing: 'google_maps' as FonteRemarketing,
  })

  if (!isOpen) return null

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSubmit = async () => {
    if (!form.nome.trim()) { setError('Nome é obrigatório'); return }
    if (!form.whatsapp.trim() || form.whatsapp.replace(/\D/g, '').length < 10) {
      setError('Telefone válido é obrigatório (mín. 10 dígitos)')
      return
    }
    if (!form.cidade_estado.trim()) { setError('Cidade/Estado é obrigatório'); return }

    setLoading(true)
    setError(null)

    try {
      const lead = await createRemarketingLead({
        nome: form.nome.trim(),
        whatsapp: form.whatsapp.replace(/\D/g, ''),
        cidade_estado: form.cidade_estado.trim(),
        email: form.email.trim() || undefined,
        instagram: form.instagram.trim() || undefined,
        nome_empresa: form.nome_empresa.trim() || undefined,
        faturamento_estimado: form.faturamento_estimado.trim() || undefined,
        link_perfil: form.link_perfil.trim() || undefined,
        fonte_remarketing: form.fonte_remarketing,
      }, userId)

      onSuccess(lead)
      handleClose()
    } catch {
      setError('Erro ao criar lead. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setForm({
      nome: '', whatsapp: '', cidade_estado: '', email: '',
      instagram: '', nome_empresa: '', faturamento_estimado: '',
      link_perfil: '',
      fonte_remarketing: 'google_maps',
    })
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </div>
            <h2 className="text-xl font-bold text-gray-900">Novo Lead Remarketing</h2>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Nome *</label>
            <input
              type="text"
              value={form.nome}
              onChange={(e) => handleChange('nome', e.target.value)}
              placeholder="Nome do contato ou empresa"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </div>

          {/* WhatsApp */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">WhatsApp *</label>
            <input
              type="tel"
              value={form.whatsapp}
              onChange={(e) => handleChange('whatsapp', formatPhone(e.target.value))}
              placeholder="(65) 99999-9999"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </div>

          {/* Cidade/Estado */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cidade / Estado *</label>
            <input
              type="text"
              value={form.cidade_estado}
              onChange={(e) => handleChange('cidade_estado', e.target.value)}
              placeholder="Ex: Cuiabá, MT"
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </div>

          {/* Email e Instagram em linha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">E-mail</label>
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleChange('email', e.target.value)}
                placeholder="email@exemplo.com"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instagram</label>
              <input
                type="text"
                value={form.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
                placeholder="@perfil"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              />
            </div>
          </div>

          {/* Empresa e Faturamento em linha */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Empresa</label>
              <input
                type="text"
                value={form.nome_empresa}
                onChange={(e) => handleChange('nome_empresa', e.target.value)}
                placeholder="Nome da empresa"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Faturamento</label>
              <input
                type="text"
                value={form.faturamento_estimado}
                onChange={(e) => handleChange('faturamento_estimado', e.target.value)}
                placeholder="Ex: R$ 50 mil"
                className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
              />
            </div>
          </div>

          {/* Link do perfil */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Link do Perfil / Google Maps</label>
            <input
              type="url"
              value={form.link_perfil}
              onChange={(e) => handleChange('link_perfil', e.target.value)}
              placeholder="https://maps.google.com/... ou https://linkedin.com/..."
              className="w-full px-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
            />
          </div>

          {/* Fonte Remarketing */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Fonte *</label>
            <div className="grid grid-cols-2 gap-2">
              {FONTES.map(f => (
                <button
                  key={f.value}
                  type="button"
                  onClick={() => handleChange('fonte_remarketing', f.value)}
                  className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                    form.fonte_remarketing === f.value
                      ? 'bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-200'
                      : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button
            onClick={handleClose}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50"
          >
            {loading ? 'Salvando...' : 'Criar Lead'}
          </button>
        </div>
      </div>
    </div>
  )
}
