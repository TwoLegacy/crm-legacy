'use client'

import { useState } from 'react'
import { checkLeadExists, createLead, Lead } from '@/lib/leads'
import PremiumSelect from './ui/PremiumSelect'

interface CreateLeadModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (lead: Lead) => void
  sdrId: string | null
}

export default function CreateLeadModal({ isOpen, onClose, onSuccess, sdrId }: CreateLeadModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [duplicateLead, setDuplicateLead] = useState<Lead | null>(null)
  
  const [formData, setFormData] = useState({
    nome: '',
    whatsapp: '',
    tipo_hospedagem: '',
    faturamento_medio: '',
    instagram: '',
    origem: 'Brasil',
    fonte: '' as any
  })

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

  const FONTES = [
    { value: 'quiz', label: 'Quiz' },
    { value: 'site', label: 'Site' },
    { value: 'vsl', label: 'VSL' },
    { value: 'comunidade', label: 'Comunidade' },
  ]

  const ORIGENS = [
    { value: 'Brasil', label: 'Brasil' },
    { value: 'Portugal', label: 'Portugal' },
    { value: 'EUA', label: 'EUA' },
    { value: 'Outros', label: 'Outros' },
  ]

  if (!isOpen) return null

  const handleCheckDuplicity = async () => {
    if (!formData.whatsapp) return
    
    setLoading(true)
    setError(null)
    try {
      const existing = await checkLeadExists(formData.whatsapp)
      if (existing) {
        setDuplicateLead(existing)
      } else {
        await handleSave()
      }
    } catch (err) {
      setError('Erro ao verificar duplicidade')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setLoading(true)
    setError(null)
    try {
      const newLead = await createLead({
        ...formData,
        owner_sdr_id: sdrId,
        status_sdr: 'MEUS_LEADS',
        whatsapp_formatado: formData.whatsapp.replace(/\D/g, '')
      })
      onSuccess(newLead)
      handleClose()
    } catch (err) {
      setError('Erro ao criar lead')
    } finally {
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
      origem: 'Brasil',
      fonte: 'quiz'
    })
    setDuplicateLead(null)
    setError(null)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <h2 className="text-xl font-bold text-gray-900">Novo Lead</h2>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl">
              {error}
            </div>
          )}

          {duplicateLead ? (
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
              <div className="flex gap-3">
                <svg className="w-6 h-6 text-amber-600 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <h3 className="font-bold text-amber-900">Lead já cadastrado!</h3>
                  <p className="text-sm text-amber-800 mt-1">
                    Este WhatsApp já pertence ao lead <strong>{duplicateLead.nome}</strong>.
                  </p>
                  <div className="mt-4 flex gap-2">
                    <button
                      onClick={() => setDuplicateLead(null)}
                      className="px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-lg transition-colors"
                    >
                      Corrigir Número
                    </button>
                    <button
                      onClick={handleSave}
                      className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-lg transition-colors"
                    >
                      Desejo recadastrar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Nome Completo</label>
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
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">WhatsApp</label>
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
                  label="Tipo Hospedagem"
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
                  placeholder="Selecione..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <PremiumSelect
                  label="Fonte"
                  options={FONTES}
                  value={formData.fonte}
                  onChange={val => setFormData({ ...formData, fonte: val as any })}
                  placeholder="Selecione..."
                />
                <PremiumSelect
                  label="Origem"
                  options={ORIGENS}
                  value={formData.origem}
                  onChange={val => setFormData({ ...formData, origem: val })}
                  placeholder="Selecione..."
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-bold text-gray-500 uppercase tracking-wider ml-1">Instagram / Site</label>
                <input
                  type="text"
                  value={formData.instagram}
                  onChange={e => setFormData({ ...formData, instagram: e.target.value })}
                  className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B0000] transition-all outline-none"
                  placeholder="@usuario"
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
              disabled={loading || !formData.nome || !formData.whatsapp}
              className={`flex-1 px-4 py-2.5 text-white font-semibold rounded-xl transition-all ${
                loading || !formData.nome || !formData.whatsapp 
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
