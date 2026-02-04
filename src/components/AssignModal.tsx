'use client'

import { useState, useEffect } from 'react'
import { Profile, getAllSdrs } from '@/lib/leads'
import PremiumSelect from './ui/PremiumSelect'

interface AssignModalProps {
  isOpen: boolean
  leadId: number | null
  leadNome: string
  onClose: () => void
  onConfirm: (leadId: number, sdrId: string) => void
}

export default function AssignModal({
  isOpen,
  leadId,
  leadNome,
  onClose,
  onConfirm,
}: AssignModalProps) {
  const [sdrs, setSdrs] = useState<Profile[]>([])
  const [selectedSdrId, setSelectedSdrId] = useState<string>('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isOpen) {
      loadSdrs()
    }
  }, [isOpen])

  const loadSdrs = async () => {
    setLoading(true)
    try {
      const sdrList = await getAllSdrs()
      setSdrs(sdrList)
      if (sdrList.length > 0) {
        setSelectedSdrId(sdrList[0].id)
      }
    } catch (error) {
      console.error('Erro ao carregar SDRs:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleConfirm = () => {
    if (leadId && selectedSdrId) {
      onConfirm(leadId, selectedSdrId)
      setSelectedSdrId('')
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full mx-4 relative">
        {/* Header */}
        <div className="bg-[#8B0000] p-4 rounded-t-xl">
          <h3 className="text-lg font-semibold text-white">Atribuir Lead a SDR</h3>
        </div>

        {/* Body */}
        <div className="p-6">
          <p className="text-gray-600 mb-4">
            Selecione o SDR que ficará responsável pelo lead:
          </p>
          
          <p className="font-medium text-gray-900 mb-4 p-3 bg-gray-50 rounded-lg">
            {leadNome}
          </p>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000]"></div>
            </div>
          ) : sdrs.length === 0 ? (
            <p className="text-gray-500 text-center py-4">
              Nenhum SDR cadastrado.
            </p>
          ) : (
            <PremiumSelect
              value={selectedSdrId}
              onChange={setSelectedSdrId}
              placeholder="Selecione o SDR"
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

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 bg-gray-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={!selectedSdrId || loading}
            className="px-4 py-2 text-white bg-[#8B0000] rounded-lg hover:bg-[#6B0000] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
