'use client'

import { useState, useEffect } from 'react'
import { Lead, Profile, getAllClosers, getReunioesAtivas, encaminharParaCloser, Reuniao } from '@/lib/leads'
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
  const [selectedDate, setSelectedDate] = useState(() => {
    // Default para amanhã, formatado como YYYY-MM-DD
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    return tomorrow.toISOString().split('T')[0]
  })
  const [selectedSlot, setSelectedSlot] = useState('')
  
  const [reunioesAtivas, setReunioesAtivas] = useState<Reuniao[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Slots fixos diários de 1h15m de duração
  const slotsDiarios = [
    '09:00', '10:15', '11:30',
    '12:45', '14:00', '15:15',
    '16:30', '17:45', '19:00',
    '20:15'
  ]

  useEffect(() => {
    if (isOpen) {
      loadData()
      setSelectedCloserId('')
      setSelectedSlot('')
    }
  }, [isOpen])

  const loadData = async () => {
    try {
      const [_closers, _reunioes] = await Promise.all([
        getAllClosers(),
        getReunioesAtivas()
      ])
      setClosers(_closers)
      setReunioesAtivas(_reunioes)
    } catch (err) {
      console.error('Erro ao carregar dados pro Agendamento', err)
    }
  }

  if (!isOpen || !lead) return null

  // Filtra os slots ocupados do Closer selecionado na Data selecionada
  const getSlotsOcupados = () => {
    if (!selectedCloserId || !selectedDate) return []
    
    return reunioesAtivas
      .filter(r => r.closer_id === selectedCloserId)
      .map(r => {
        // Converte o TIMESTAMPTZ de volta para checar dia e hora
        const dataReuniao = new Date(r.data_hora)
        const dateString = dataReuniao.toISOString().split('T')[0]
        
        if (dateString === selectedDate) {
          // Extrai hora e minuto em formato HH:MM (ajustando fuso caso necessário)
          const hh = dataReuniao.getHours().toString().padStart(2, '0')
          const mm = dataReuniao.getMinutes().toString().padStart(2, '0')
          return `${hh}:${mm}`
        }
        return null
      })
      .filter(Boolean) as string[]
  }

  const slotsOcupados = getSlotsOcupados()

  const handleAgendar = async () => {
    if (!selectedCloserId || !selectedDate || !selectedSlot) {
      setError('Por favor, preencha todos os campos.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      // Montar a data ISO
      const [ano, mes, dia] = selectedDate.split('-').map(Number)
      const [hora, minuto] = selectedSlot.split(':').map(Number)
      
      const dataHora = new Date(ano, mes - 1, dia, hora, minuto)
      const dataHoraISO = dataHora.toISOString()

      const res = await encaminharParaCloser(lead.id, selectedCloserId, sdrId, dataHoraISO)
      
      if (res.success) {
        onSuccess()
      } else {
        setError(res.error || 'Erro ao agendar reunião.')
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
            <h3 className="text-xl font-bold text-gray-900">Agendar Reunião</h3>
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
        <div className="p-6 overflow-y-auto">
          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <div className="space-y-5">
            {/* Escolha do Closer */}
            <div className="z-50">
              <label className="block text-sm font-semibold text-gray-700 mb-2">Closer (Vendedor Final)</label>
              <PremiumSelect
                value={selectedCloserId}
                onChange={(val) => {
                  setSelectedCloserId(val)
                  setSelectedSlot('') // Zera o slot ao mudar de closer
                }}
                options={closers.map(c => ({ value: c.id, label: c.name }))}
                placeholder="Selecione um closer..."
              />
            </div>

            {/* Escolha da Data */}
            <div className={!selectedCloserId ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Data da Reunião</label>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setSelectedSlot('')
                }}
                min={new Date().toISOString().split('T')[0]} // Não agendar no passado
                className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000] text-gray-700 bg-gray-50/50 outline-none"
              />
            </div>

            {/* Escolha do Horário */}
            <div className={!selectedDate || !selectedCloserId ? 'opacity-50 pointer-events-none' : ''}>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Horário (Slots de 1h15m)</label>
              <div className="grid grid-cols-3 gap-2">
                {slotsDiarios.map(slot => {
                  const isOcupado = slotsOcupados.includes(slot)
                  const isSelected = selectedSlot === slot

                  return (
                    <button
                      key={slot}
                      type="button"
                      disabled={isOcupado}
                      onClick={() => setSelectedSlot(slot)}
                      className={`
                        py-2 text-sm font-medium rounded-lg border transition-all
                        ${isOcupado 
                          ? 'bg-gray-100 text-gray-400 border-gray-100 cursor-not-allowed line-through' 
                          : isSelected
                            ? 'bg-[#8B0000] text-white border-[#8B0000] shadow-md'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-[#8B0000] hover:text-[#8B0000]'
                        }
                      `}
                    >
                      {slot}
                    </button>
                  )
                })}
              </div>
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
            disabled={loading || !selectedCloserId || !selectedDate || !selectedSlot}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#8B0000] rounded-xl hover:bg-red-800 transition-all font-semibold shadow-md disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Agendando...</span>
              </>
            ) : (
              <span>Confirmar Agendamento</span>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
