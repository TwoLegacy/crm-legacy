'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'
import { getTodasReunioesAtivasComDetalhes, ReuniaoComDetalhes, getAllUsers, Profile } from '@/lib/leads'
import LeadDetailsModal from '@/components/LeadDetailsModal'
import PremiumSelect from '@/components/ui/PremiumSelect'
import AgendaEventModal from '@/components/AgendaEventModal'

const HOURS = Array.from({ length: 14 }, (_, i) => i + 8) // Das 08:00 às 21:00

export default function AgendaPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
  const [reunioes, setReunioes] = useState<ReuniaoComDetalhes[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Filtros Globais (Admin)
  const [allUsers, setAllUsers] = useState<Profile[]>([])
  const [selectedCloserId, setSelectedCloserId] = useState<string>('')
  const [selectedSdrId, setSelectedSdrId] = useState<string>('')

  // Controle de Visualização do Calendário (Dia)
  const [selectedDateStr, setSelectedDateStr] = useState<string>(() => {
    return new Date().toISOString().split('T')[0]
  })

  // Modal de Detalhes do Lead (Legado Integrado)
  const [selectedLead, setSelectedLead] = useState<any | null>(null)
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false)

  // Modal de Ação da Agenda (Novo)
  const [selectedReuniao, setSelectedReuniao] = useState<ReuniaoComDetalhes | null>(null)
  const [isEventModalOpen, setIsEventModalOpen] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      router.replace('/login')
      return
    }

    if (profile?.role === 'admin') {
      getAllUsers().then(setAllUsers)
    }

    loadReunioes()
  }, [user, profile, authLoading, router, selectedCloserId, selectedSdrId])

  const loadReunioes = async () => {
    if (!profile) return
    setLoading(true)
    try {
      const data = await getTodasReunioesAtivasComDetalhes(
        profile.role === 'admin' ? undefined : profile.id, 
        profile.role === 'admin' ? undefined : profile.role
      )
      
      const formatado = data.map(r => ({
        ...r,
        leads: Array.isArray(r.leads) ? r.leads[0] : r.leads,
        sdr_profile: Array.isArray(r.sdr_profile) ? r.sdr_profile[0] : r.sdr_profile,
        closer_profile: Array.isArray(r.closer_profile) ? r.closer_profile[0] : r.closer_profile,
      }))

      // Filtro local pra Admin pq a query traz tudo
      let filtrado = formatado as ReuniaoComDetalhes[]
      if (profile.role === 'admin') {
        if (selectedSdrId) filtrado = filtrado.filter(r => r.sdr_id === selectedSdrId)
        if (selectedCloserId) filtrado = filtrado.filter(r => r.closer_id === selectedCloserId)
      }

      setReunioes(filtrado)
    } catch (err: any) {
      console.error('Erro ao buscar agenda', err)
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  // Lógica de Navegação do "Time Picker" Local
  const currentDate = new Date(selectedDateStr + 'T00:00:00')

  const goPrevDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() - 1)
    setSelectedDateStr(d.toISOString().split('T')[0])
  }

  const goNextDay = () => {
    const d = new Date(currentDate)
    d.setDate(d.getDate() + 1)
    setSelectedDateStr(d.toISOString().split('T')[0])
  }

  const setToToday = () => {
    setSelectedDateStr(new Date().toISOString().split('T')[0])
  }

  // Filtrando a Timeline Diária
  const reunioesDoDia = useMemo(() => {
    return reunioes.filter(r => {
      // Data vem como TIMESTAMPTZ ex: "2026-03-03T16:00:00Z" ou similar
      // Mas convertemos localmente para garantir o fuso no navegador
      const dataLocalStr = new Date(r.data_hora).toLocaleDateString('en-CA') // YYYY-MM-DD
      return dataLocalStr === selectedDateStr
    })
  }, [reunioes, selectedDateStr])

  // Utils
  const formatDisplayDate = (dateOb: Date) => {
    return dateOb.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })
  }

  const handleCardClick = (reuniao: ReuniaoComDetalhes) => {
    setSelectedReuniao(reuniao)
    setIsEventModalOpen(true)
  }

  const handleOpenLeadDetails = () => {
    if (selectedReuniao?.leads) {
      setSelectedLead(selectedReuniao.leads)
      setIsLeadModalOpen(true)
    }
  }

  if (authLoading || !profile) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-16 h-16 border-4 border-[#8B0000] border-t-transparent rounded-full animate-spin"></div>
      </div>
    )
  }

  return (
    <Sidebar>
      <div className="h-screen flex flex-col bg-white overflow-hidden">
        {/* Cabeçalho da Visão de Calendário */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 z-20 shadow-sm relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            
            {/* Títulos */}
            <div>
              <h1 className="text-2xl font-bold text-gray-900">{profile?.role === 'admin' ? 'Agenda Global' : 'Minha Agenda'}</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Google Calendar View
              </p>
            </div>

            {/* Controle Master de Calendário e Filtros Admin */}
            <div className="flex items-center gap-3">
              
              {profile?.role === 'admin' && allUsers.length > 0 && (
                <div className="flex items-center gap-2 mr-4">
                  <div className="w-48">
                    <PremiumSelect
                      value={selectedSdrId}
                      onChange={setSelectedSdrId}
                      options={[
                        { value: '', label: 'Todos os SDRs' },
                        ...allUsers.filter(u => u.role === 'sdr').map(u => ({ value: u.id, label: u.name }))
                      ]}
                      placeholder="Filtrar SDR"
                    />
                  </div>
                  <div className="w-48">
                    <PremiumSelect
                      value={selectedCloserId}
                      onChange={setSelectedCloserId}
                      options={[
                        { value: '', label: 'Todos os Closers' },
                        ...allUsers.filter(u => u.role === 'closer').map(u => ({ value: u.id, label: u.name }))
                      ]}
                      placeholder="Filtrar Closer"
                    />
                  </div>
                </div>
              )}

              <button 
                onClick={setToToday}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors"
              >
                Hoje
              </button>

              <div className="flex items-center bg-gray-100 p-1 rounded-xl">
                <button 
                  onClick={goPrevDay}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
                </button>
                <div className="w-64 text-center font-bold text-gray-900 capitalize select-none text-sm">
                  {formatDisplayDate(currentDate)}
                </div>
                <button 
                  onClick={goNextDay}
                  className="p-1.5 text-gray-600 hover:text-gray-900 hover:bg-white rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                </button>
              </div>

              <button 
                onClick={loadReunioes}
                className="p-2.5 bg-gray-100 text-gray-600 hover:bg-gray-200 rounded-xl transition-colors ml-2"
                title="Sincronizar"
              >
                <svg className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
            </div>

          </div>
        </header>

        {/* Corpo: Timetable Grid Google Calendar Like */}
        <main className="flex-1 overflow-y-auto bg-white custom-scrollbar">
          {error && (
            <div className="m-6 bg-red-50 text-red-700 p-4 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          {loading && reunioes.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 mt-10">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000]"></div>
              <p className="mt-4 text-gray-500 font-medium tracking-wide">Buscando compromissos...</p>
            </div>
          ) : (
            <div className="relative min-w-[700px] mt-2 mb-12">
              
              {/* Dia sem blocos vazios não tem problema visual, mas se não tiver NADA, mostra splash? 
                  Não, o Calendar mesmo mostra blocos vazios nas horas para ter escopo de espaço. */}
              {reunioesDoDia.length === 0 && (
                <div className="absolute inset-0 top-32 flex items-start justify-center z-10 pointer-events-none">
                  <div className="px-6 py-4 bg-gray-50/90 backdrop-blur-sm rounded-2xl border border-dashed border-gray-300 shadow-sm text-center">
                    <p className="text-gray-500 font-medium">Você tem tempo livre.</p>
                    <p className="text-sm text-gray-400">Nenhum evento agendado para este dia.</p>
                  </div>
                </div>
              )}

              {/* Grid Horizontal Linhas */}
              {HOURS.map(hour => {
                const agendamentosNestaHora = reunioesDoDia.filter(r => {
                   const rh = new Date(r.data_hora).getHours()
                   return rh === hour
                })

                return (
                  <div key={hour} className="flex border-b border-gray-100 min-h-[120px] group">
                    {/* Linha Temporal Lateral */}
                    <div className="w-20 sm:w-24 text-right pr-4 py-3 text-sm text-gray-400 font-medium select-none sticky left-0 bg-white z-10">
                      {hour.toString().padStart(2, '0')}:00
                    </div>

                    {/* Espaço das Reuniões */}
                    <div className="flex-1 p-2 border-l border-gray-100 relative group-hover:bg-gray-50/50 transition-colors">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {agendamentosNestaHora.map(agendamento => {
                          const horaFormatada = new Date(agendamento.data_hora).toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})
                          const isRealizada = agendamento.status === 'REALIZADA'
                          
                          return (
                            <div 
                              key={agendamento.id} 
                              onClick={() => handleCardClick(agendamento)}
                              className={`
                                relative pl-3 pr-4 py-3 rounded-xl cursor-pointer hover:shadow-lg transition-all text-left shadow-sm border
                                ${isRealizada 
                                  ? 'bg-emerald-50 border-emerald-100/50 hover:bg-emerald-100' 
                                  : 'bg-blue-50 border-[#8B0000]/10 hover:bg-blue-100'}
                              `}
                            >
                              {/* Decoração da Borda lateral viva */}
                              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${isRealizada ? 'bg-emerald-500' : 'bg-[#8B0000]'}`}></div>

                              <div className="flex justify-between items-start mb-2">
                                <span className={`text-xs font-bold px-2 py-0.5 rounded ${isRealizada ? 'bg-emerald-100 text-emerald-800' : 'bg-white text-blue-900 border border-blue-200'}`}>
                                  {horaFormatada} - Agenda
                                </span>
                                <span className={`text-[10px] font-black tracking-widest px-1.5 py-0.5 rounded uppercase opacity-80 ${isRealizada ? 'text-emerald-700' : 'text-gray-500'}`}>
                                  {agendamento.status}
                                </span>
                              </div>
                              
                              <p className={`font-bold text-[15px] truncate mb-1 ${isRealizada ? 'text-emerald-950' : 'text-gray-900'}`}>
                                {agendamento.leads?.nome || 'Convidado'}
                              </p>

                              <div className="flex items-center gap-2 mt-2">
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-gray-500 uppercase">Closer</p>
                                  <p className="text-xs text-gray-700 truncate font-medium">
                                    {agendamento.closer_profile?.name || '-'}
                                  </p>
                                </div>
                                <div className="w-px h-6 bg-gray-200 mx-1"></div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-[11px] font-semibold text-gray-500 uppercase">SDR</p>
                                  <p className="text-xs text-gray-700 truncate font-medium">
                                    {agendamento.sdr_profile?.name || '-'}
                                  </p>
                                </div>
                              </div>

                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </main>
      </div>
        <LeadDetailsModal 
          isOpen={isLeadModalOpen}
          onClose={() => setIsLeadModalOpen(false)}
          lead={selectedLead}
        />

        <AgendaEventModal
          isOpen={isEventModalOpen}
          onClose={() => setIsEventModalOpen(false)}
          reuniao={selectedReuniao}
          onOpenLeadDetails={handleOpenLeadDetails}
          onSuccess={() => {
            setIsEventModalOpen(false)
            loadReunioes()
          }}
        />
    </Sidebar>
  )
}
