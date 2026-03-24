'use client'

import { useState } from 'react'
import { checkLeadExists, createLead, Lead } from '@/lib/leads'
import PremiumSelect from './ui/PremiumSelect'

interface CreateCloserLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (lead: Lead) => void
  closerId: string | null
}

export default function CreateCloserLeadModal({ isOpen, onClose, onSuccess, closerId }: CreateCloserLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateLead, setDuplicateLead] = useState<Lead | null>(null)
  
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    tipo_hospedagem: '',
    faturamento_medio: '',
    instagram: '',
    nome_hospedagem: '',
    qtd_quartos_hospedagens: '',
    status_closer: 'ACOMPANHAMENTO' as const
  })

  // Mandatory fields for basic closer lead
  const isFormValid = formData.nome && formData.whatsapp && formData.tipo_hospedagem

  const TIPOS_HOSPEDAGEM = [
    { value: 'Hotel, Pousada ou Resort', label: 'Hotel, Pousada ou Resort' },
    { value: 'Cabanas e Chalés', label: 'Cabanas e Chalés' },
    { value: 'Outros', label: 'Outros' },
  ]

  const FATURAMENTOS = [
    { value: 'Menos de R$ 5 mil', label: 'Menos de R$ 5 mil' },
    { value: 'Entre R$ 5 a R$ 20 mil', label: 'Entre R$ 5 a R$ 20 mil' },
    { value: 'Entre R$ 20 a R$ 50 mil', label: 'Entre R$ 20 a R$ 50 mil' },
    { value: 'Entre R$ 50 a R$ 100 mil', label: 'Entre R$ 50 a R$ 100 mil' },
    { value: 'Entre R$ 100 a R$ 500 mil', label: 'Entre R$ 100 a R$ 500 mil' },
    { value: 'Mais de R$ 500 mil', label: 'Mais de R$ 500 mil' },
  ]

  const STATUS_CLOSER_OPCOES = [
    { value: 'REUNIAO_MARCADA', label: '1. Reunião Marcada' },
    { value: 'ACOMPANHAMENTO', label: '2. Acompanhamento' },
    { value: 'FECHAMENTO', label: '3. Fechamento' },
    { value: 'GANHOU', label: 'Ganhou (Cliente)' },
    { value: 'PERDEU', label: 'Perdeu (Lost)' },
    { value: 'NO_SHOW', label: 'No Show' },
  ]

  if (!isOpen) return null

  const handleCheckDuplicity = async () => {
    if (!isFormValid) return
    
    setLoading(true)
    setError(null)
    setDuplicateLead(null)
    try {
      const existing = await checkLeadExists(formData.whatsapp)
      if (existing) {
        setDuplicateLead(existing)
      } else {
        await handleSave()
      }
    } catch {
      setError('Erro ao verificar duplicidade')
    } finally {
      if (duplicateLead) {
        setLoading(false) // Only un-load if stopped. If continuing to handleSave, it manages its own loading.
      }
    }
  }

  const handleSave = async () => {
    try {
      const newLead = await createLead({
        nome: formData.nome,
        whatsapp: formData.whatsapp,
        whatsapp_formatado: formData.whatsapp.replace(/\D/g, ''),
        tipo_hospedagem: formData.tipo_hospedagem,
        faturamento_medio: formData.faturamento_medio || null,
        instagram: formData.instagram || null,
        nome_hospedagem: formData.nome_hospedagem || null,
        qtd_quartos_hospedagens: formData.qtd_quartos_hospedagens || null,
        owner_closer_id: closerId,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        status_closer: formData.status_closer as any,
        owner_sdr_id: null,
        status_sdr: null,
      })
      onSuccess(newLead)
      handleClose()
    } catch {
      setError('Erro ao criar lead. Verifique sua conexão ou contate o suporte.')
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
      nome: '',
      whatsapp: '',
      tipo_hospedagem: '',
      faturamento_medio: '',
      instagram: '',
      nome_hospedagem: '',
      qtd_quartos_hospedagens: '',
      status_closer: 'ACOMPANHAMENTO'
    })
    setDuplicateLead(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Novo Lead (Closer)</h2>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          {duplicateLead ? (
            <div className="p-4 bg-red-50 border border-red-200 rounded-xl">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-red-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-bold text-red-900">Lead já existe!</h3>
                  <p className="text-sm text-red-800 mt-1">
                    Este WhatsApp já pertence ao lead <strong>{duplicateLead.nome}</strong> no CRM.
                    <br/><br/>
                    <em>Ação Bloqueada: Não é possível recadastrar este lead silenciosamente no painel do Closer para evitar conflito de triplicidade. Entre em contato com o Gestor para reatribuição, se for o caso.</em>
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setDuplicateLead(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-red-900 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                    >
                      Corrigir Número
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nome Completo *</label>
                <input
                  type="text"
                  value={formData.nome}
                  onChange={e => setFormData({ ...formData, nome: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:border-transparent transition-all outline-none"
                  placeholder="Nome do lead"
                  required
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">WhatsApp *</label>
                <input
                  type="text"
                  value={formData.whatsapp}
                  onChange={e => setFormData({ ...formData, whatsapp: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:border-transparent transition-all outline-none"
                  placeholder="+55 (11) 99999-9999"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <PremiumSelect
                  label="Hospedagem *"
                  options={TIPOS_HOSPEDAGEM}
                  value={formData.tipo_hospedagem}
                  onChange={val => setFormData({ ...formData, tipo_hospedagem: val })}
                  placeholder="Selecione..."
                />
                <PremiumSelect
                  label="Faturamento"
                  options={FATURAMENTOS}
                  value={formData.faturamento_medio}
                  onChange={val => setFormData({ ...formData, faturamento_medio: val })}
                  placeholder="Opcional"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Instagram / Site</label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:border-transparent transition-all outline-none"
                  placeholder="@usuario ou seu-site.com"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nome do Local</label>
                  <input
                    type="text"
                    value={formData.nome_hospedagem}
                    onChange={e => setFormData({ ...formData, nome_hospedagem: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:border-transparent transition-all outline-none"
                    placeholder="Nome do estabelecimento"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Unidades/Quartos</label>
                  <input
                    type="number"
                    value={formData.qtd_quartos_hospedagens}
                    onChange={e => setFormData({ ...formData, qtd_quartos_hospedagens: e.target.value })}
                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B0000] focus:border-transparent transition-all outline-none"
                    placeholder="Qtd (Opcional)"
                  />
                </div>
              </div>

              <div className="mt-2 pt-2 border-t border-gray-100">
                <PremiumSelect
                  label="Status do Funil Inicial *"
                  options={STATUS_CLOSER_OPCOES}
                  value={formData.status_closer}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onChange={val => setFormData({ ...formData, status_closer: val as any })}
                  placeholder="Selecione a coluna"
                />
              </div>
            </>
          )}
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2.5 text-gray-700 font-semibold hover:bg-gray-200 rounded-xl transition-colors"
          >
            Cancelar
          </button>
          {!duplicateLead && (
            <button
              onClick={handleCheckDuplicity}
              disabled={loading || !isFormValid}
              className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-xl transition-all ${
                loading || !isFormValid
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-[#8B0000] hover:bg-[#6B0000] shadow-lg shadow-red-200'
              }`}
            >
              {loading ? 'Processando...' : 'Criar Lead'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
