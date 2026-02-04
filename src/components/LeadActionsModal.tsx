'use client'

import { useState, useEffect } from 'react'
import { Profile, getAllSdrs } from '@/lib/leads'
import PremiumSelect from './ui/PremiumSelect'

interface LeadActionsModalProps {
  isOpen: boolean
  leadId: number | null
  leadNome: string
  currentSdrId: string | null
  currentSdrName?: string
  onClose: () => void
  onUnassign: (leadId: number) => void
  onReassign: (leadId: number, newSdrId: string) => void
}

export default function LeadActionsModal({
  isOpen,
  leadId,
  leadNome,
  currentSdrId,
  currentSdrName,
  onClose,
  onUnassign,
  onReassign,
}: LeadActionsModalProps) {
  const [sdrs, setSdrs] = useState<Profile[]>([])
  const [selectedSdrId, setSelectedSdrId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [action, setAction] = useState<'unassign' | 'reassign'>('reassign')

  useEffect(() => {
    if (isOpen) {
      loadSdrs()
      setAction('reassign')
    }
  }, [isOpen])

  const loadSdrs = async () => {
    setLoading(true)
    try {
      const sdrList = await getAllSdrs()
      // Filtra o SDR atual da lista
      const filteredSdrs = sdrList.filter(sdr => sdr.id !== currentSdrId)
      setSdrs(filteredSdrs)
      if (filteredSdrs.length > 0) {
        setSelectedSdrId(filteredSdrs[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar SDRs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (!leadId) return

    if (action === 'unassign') {
      onUnassign(leadId)
    } else if (action === 'reassign' && selectedSdrId) {
      onReassign(leadId, selectedSdrId)
    }
    onClose()
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 relative animate-in">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#8B0000] to-[#A52A2A] p-5 rounded-t-2xl">
          <h3 className="text-lg font-semibold text-white">Gerenciar Lead</h3>
          <p className="text-white/70 text-sm mt-1">{leadNome}</p>
        </div>

        {/* Body */}
        <div className="p-6">
          {currentSdrName && (
            <div className="mb-4 p-3 bg-gray-50 rounded-xl">
              <p className="text-sm text-gray-500">SDR atual:</p>
              <p className="font-medium text-gray-900">{currentSdrName}</p>
            </div>
          )}

          {/* Action tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setAction('reassign')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                action === 'reassign'
                  ? 'bg-[#8B0000] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Reatribuir
            </button>
            <button
              onClick={() => setAction('unassign')}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                action === 'unassign'
                  ? 'bg-amber-500 text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Desatribuir
            </button>
          </div>

          {action === 'reassign' ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Selecione o novo SDR:
              </label>
              {loading ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-[#8B0000]"></div>
                </div>
              ) : sdrs.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">
                  Nenhum outro SDR disponível.
                </p>
              ) : (
                <PremiumSelect
                  value={selectedSdrId}
                  onChange={setSelectedSdrId}
                  placeholder="Selecione o novo SDR"
                  options={sdrs.map((sdr) => ({
                    value: sdr.id,
                    label: sdr.name,
                    icon: (
                      <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )
                  }))}
                />
              )}
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <div className="flex gap-3">
                <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <div>
                  <p className="text-amber-800 font-medium text-sm">Atenção</p>
                  <p className="text-amber-700 text-sm mt-1">
                    O lead será removido do SDR atual e voltará para o Kanban Global, podendo ser atribuído novamente.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={action === 'reassign' && (!selectedSdrId || loading)}
            className={`px-4 py-2.5 text-sm font-medium text-white rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
              action === 'unassign'
                ? 'bg-amber-500 hover:bg-amber-600'
                : 'bg-[#8B0000] hover:bg-[#6B0000]'
            }`}
          >
            {action === 'unassign' ? 'Desatribuir' : 'Reatribuir'}
          </button>
        </div>
      </div>
    </div>
  )
}
