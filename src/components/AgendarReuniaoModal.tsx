'use client'

import { useState, useEffect } from 'react'
import { Lead, Profile, getAllClosers, encaminharParaCloser } from '@/lib/leads'
import PremiumSelect from '@/components/ui/PremiumSelect'

interface AgendarReuniaoModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  lead: Lead | null
  sdrId: string
}

export default function AgendarReuniaoModal({ isOpen, onClose, onSuccess, lead, sdrId }: AgendarReuniaoModalProps) {
  const [closers, setClosers] = useState<Profile[]>([])
  const [selectedCloserId, setSelectedCloserId] = useState('')
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen) {
      loadData()
      setSelectedCloserId('')
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const _closers = await getAllClosers()
      setClosers(_closers)
    } catch (err) {
      console.error('Erro ao carregar closers para o encaminhamento', err)
    }
  }

  if (!isOpen || !lead) return null

  const handleAgendar = async () => {
    if (!selectedCloserId) {
      setError('Por favor, escolha um Closer.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Chama API passando apenas lead, closer e sdr (sem dataHoraISO, ou seja, sem gerar registro na Agenda)
      const res = await encaminharParaCloser(lead.id, selectedCloserId, sdrId)
      
      if (res.success) {
        onSuccess()
      } else {
        setError(res.error || 'Erro ao encaminhar lead.')
      }
    } catch (err: any) {
      setError(err.message || 'Erro inesperado.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h3 className="text-xl font-bold text-gray-900">Encaminhar para Closer</h3>
            <p className="text-sm text-gray-500 mt-1">
              Encaminhando lead <strong className="text-gray-900">{lead.nome}</strong>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-visible relative z-50">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Escolha do Closer */}
            <div className="relative z-50">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Closer (Vendedor Final)</label>
              <PremiumSelect
                value={selectedCloserId}
                onChange={(val) => {
                  setSelectedCloserId(val)
                }}
                options={closers.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Selecione um closer..."
              />
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-100 bg-gray-50/50 mt-auto flex justify-end gap-3 rounded-b-2xl">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleAgendar}
            disabled={loading || !selectedCloserId}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#8B0000] rounded-xl hover:bg-red-800 transition-all font-semibold shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Encaminhando...</span>
              </>
            ) : (
              <span>Confirmar Encaminhamento</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
