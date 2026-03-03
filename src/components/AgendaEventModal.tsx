'use client'

import { useState, useEffect } from 'react'
import { ReuniaoComDetalhes, updateReuniaoStatus, updateLeadStatusCloser, encaminharParaCloser } from '@/lib/leads'
import ConfirmModal from '@/components/ConfirmModal'

interface AgendaEventModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  onOpenLeadDetails: () => void
  reuniao: ReuniaoComDetalhes | null
}

export default function AgendaEventModal({ isOpen, onClose, onSuccess, onOpenLeadDetails, reuniao }: AgendaEventModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isConfirmOpen, setIsConfirmOpen] = useState(false)

  // Estados de edição (Reagendamento)
  const [isEditing, setIsEditing] = useState(false)
  const [newDate, setNewDate] = useState('')
  const [newSlot, setNewSlot] = useState('')

  const slotsDiarios = [
    '09:00', '10:15', '11:30',
    '12:45', '14:00', '15:15',
    '16:30', '17:45', '19:00',
    '20:15'
  ]

  useEffect(() => {
    if (isOpen && reuniao) {
      setError(null)
      setIsEditing(false)
      const dataReuniao = new Date(reuniao.data_hora)
      setNewDate(dataReuniao.toISOString().split('T')[0])
      
      const hh = dataReuniao.getHours().toString().padStart(2, '0')
      const mm = dataReuniao.getMinutes().toString().padStart(2, '0')
      setNewSlot(`${hh}:${mm}`)
    }
  }, [isOpen, reuniao])

  if (!isOpen || !reuniao) return null

  const handleCancelMeeting = () => {
    setIsConfirmOpen(true)
  }

  const executeCancelMeeting = async () => {
    setIsConfirmOpen(false)
    setLoading(true)
    setError(null)
    try {
      // Cancela a meeting
      await updateReuniaoStatus(reuniao.id, 'CANCELADA')
      // Opcional: Se a reunião foi cancelada na agenda, ela deve sumir da coluna de reunião no kanban?
      // Idealmente, poderíamos puxar pro 'ACOMPANHAMENTO' ou 'NO_SHOW'. Vamos botar 'NO_SHOW' na label de lead
      // Mas o lead só pode ser revertido se usarmos devolverNoShowSdr. Aqui apenas cancelamos o status local da reuniao.
      // O lead_status_closer continuará REUNIAO_MARCADA a menos que seja arrastado, mas vamos voltar pro NO_SHOW.
      await updateLeadStatusCloser(reuniao.lead_id, 'NO_SHOW')
      
      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erro ao cancelar reunião')
    } finally {
      setLoading(false)
    }
  }

  const handleReschedule = async () => {
    if (!newDate || !newSlot) {
      setError('Escolha a nova data e o novo horário.')
      return
    }

    setLoading(true)
    setError(null)
    try {
      const [ano, mes, dia] = newDate.split('-').map(Number)
      const [hora, minuto] = newSlot.split(':').map(Number)
      const dataHoraISO = new Date(ano, mes - 1, dia, hora, minuto).toISOString()

      // Para simplificar, nós cancelamos a reunião antiga e criamos uma nova com os mesmos atores.
      await updateReuniaoStatus(reuniao.id, 'CANCELADA')
      await encaminharParaCloser(reuniao.lead_id, reuniao.closer_id!, reuniao.sdr_id!, dataHoraISO)

      onSuccess()
    } catch (err: any) {
      setError(err.message || 'Erro ao reagendar reunião')
    } finally {
      setLoading(false)
    }
  }

  const nomeLead = reuniao.leads?.nome || 'Convidado Desconhecido'
  const isPast = new Date(reuniao.data_hora) < new Date()
  const stColor = reuniao.status === 'REALIZADA' ? 'emerald' : reuniao.status === 'NO_SHOW' ? 'orange' : reuniao.status === 'CANCELADA' ? 'red' : 'blue'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2.5 py-1 text-[10px] font-black tracking-widest uppercase rounded bg-${stColor}-50 text-${stColor}-700 border border-${stColor}-100`}>
                {reuniao.status}
              </span>
            </div>
            <h3 className="text-xl font-bold text-gray-900 truncate pr-4">{nomeLead}</h3>
            <p className="text-sm text-gray-500 mt-1">
              Agendada em: <span className="font-semibold text-gray-700">{new Date(reuniao.data_hora).toLocaleString('pt-BR')}</span>
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto custom-scrollbar">
          {error && (
            <div className="mb-6 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
              {error}
            </div>
          )}

          {!isEditing ? (
            <div className="space-y-6">
              {/* Informações Básicas da Reunião */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Responsável (Closer)</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {Array.isArray(reuniao.closer_profile) ? reuniao.closer_profile[0]?.name : reuniao.closer_profile?.name || '-'}
                  </p>
                </div>
                <div className="bg-gray-50 p-4 rounded-xl border border-gray-100">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1">Agendado por (SDR)</p>
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {Array.isArray(reuniao.sdr_profile) ? reuniao.sdr_profile[0]?.name : reuniao.sdr_profile?.name || '-'}
                  </p>
                </div>
              </div>

              {/* Botão para Ver Detalhes Completos do Lead */}
              <button
                onClick={onOpenLeadDetails}
                className="w-full py-3.5 px-4 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-sm rounded-xl border border-blue-200 transition-colors flex items-center justify-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
                Inspecionar Perfil do Lead (Qualificações)
              </button>

            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-bold text-gray-900">Reagendar Compromisso</h4>
                <button onClick={() => setIsEditing(false)} className="text-sm text-blue-600 font-medium hover:underline">Voltar</button>
              </div>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Nova Data</label>
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-[#8B0000]/20 focus:border-[#8B0000] text-gray-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Novo Horário (Slots de 1h15m)</label>
                <div className="grid grid-cols-3 gap-2">
                  {slotsDiarios.map(slot => (
                    <button
                      key={slot}
                      type="button"
                      onClick={() => setNewSlot(slot)}
                      className={`
                        py-2 text-sm font-medium rounded-lg border transition-all
                        ${newSlot === slot
                          ? 'bg-[#8B0000] text-white border-[#8B0000] shadow-md'
                          : 'bg-white text-gray-700 border-gray-200 hover:border-[#8B0000] hover:text-[#8B0000]'
                        }
                      `}
                    >
                      {slot}
                    </button>
                  ))}
                </div>
              </div>

            </div>
          )}
        </div>

        {/* Footer (Ações Rápidas) */}
        <div className="p-6 border-t border-gray-100 bg-gray-50 mt-auto flex justify-between rounded-b-2xl">
          {!isEditing ? (
            <>
              <button
                onClick={handleCancelMeeting}
                disabled={loading || reuniao.status !== 'AGENDADA'}
                className="px-4 py-2.5 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-xl hover:bg-red-50 hover:border-red-300 transition-colors disabled:opacity-50"
              >
                {loading ? 'Processando...' : 'Cancelar Reunião'}
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => setIsEditing(true)}
                  disabled={reuniao.status !== 'AGENDADA'}
                  className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Editar Data/Hora
                </button>
              </div>
            </>
          ) : (
            <div className="w-full flex justify-end gap-3">
              <button
                onClick={handleReschedule}
                disabled={loading}
                className="px-6 py-2.5 text-sm font-medium text-white bg-[#8B0000] rounded-xl hover:bg-red-800 transition-all shadow-md disabled:opacity-50 flex items-center gap-2"
              >
                {loading ? 'Reagendando...' : 'Confirmar Reagendamento'}
              </button>
            </div>
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={isConfirmOpen}
        title="Cancelar Reunião"
        message="Deseja realmente cancelar esta reunião? O slot será liberado na agenda."
        confirmLabel="Sim, Cancelar"
        cancelLabel="Voltar"
        onConfirm={executeCancelMeeting}
        onCancel={() => setIsConfirmOpen(false)}
        variant="danger"
      />
    </div>
  )
}
