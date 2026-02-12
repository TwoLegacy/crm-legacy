'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabaseClient'
import { getLeadsBySdr, updateLeadStatus, unassignLead, getAllSdrs, Lead, Profile } from '@/lib/leads'
import { useAuth } from '@/contexts/AuthContext'
import { DraggableKanbanBoard, DraggableKanbanColumn } from '@/components/DraggableKanban'
import Sidebar from '@/components/Sidebar'
import LeadFilters, { FilterState, filterLeads } from '@/components/LeadFilters'

export default function SdrKanbanPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [sdrs, setSdrs] = useState<Profile[]>([])
  const [selectedSdrId, setSelectedSdrId] = useState<string | null>(null)
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [filters, setFilters] = useState<FilterState>({ 
    searchTerm: '', 
    dateFrom: '', 
    dateTo: '', 
    tipoHospedagem: '', 
    origem: '', 
    fonte: '', 
    classificacao: '' 
  })

  // Inicializa selectedSdrId com o próprio ID se não for admin (ou se for, pode ser null ou o próprio)
  useEffect(() => {
    if (profile && !selectedSdrId) {
      setSelectedSdrId(profile.id)
    }
  }, [profile]) // Executa apenas quando profile carregar

  // Efeito para buscar leads e SDRs (se admin)
  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (!profile) return

    const fetchData = async () => {
      setLoadingLeads(true)
      try {
        const promises: Promise<any>[] = []
        
        // Se for admin, busca lista de SDRs
        if (profile.role === 'admin') {
          promises.push(getAllSdrs().then(setSdrs))
        }

        // Busca leads do SDR selecionado (ou do próprio user)
        const targetSdrId = profile.role === 'admin' ? (selectedSdrId || profile.id) : profile.id
        
        // Se temos um ID alvo, buscamos os leads
        if (targetSdrId) {
           const leadsPromise = getLeadsBySdr(targetSdrId).then(leadsData => {
              setLeads(leadsData)
           })
           promises.push(leadsPromise)
        }

        await Promise.all(promises)
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados')
      } finally {
        setLoadingLeads(false)
      }
    }

    fetchData()
  }, [user, profile, authLoading, router, selectedSdrId]) // Recarrega se selectedSdrId mudar

  // Aplica filtros aos leads
  const filteredLeads = useMemo(() => {
    return filterLeads(leads, filters)
  }, [leads, filters])

  const handleDevolver = async (leadId: number) => {
    // Remove o lead da lista local imediatamente para feedback visual
    setLeads(prev => prev.filter(l => l.id !== leadId))
    
    try {
      await unassignLead(leadId)
    } catch (err) {
      console.error('Erro ao devolver lead:', err)
      // Se der erro, recarrega a lista para garantir consistência
      if (profile) {
        const leadsData = await getLeadsBySdr(profile.id)
        setLeads(leadsData)
      }
    }
  }

  // Ordena Meus Leads por data de atualização (mais recente primeiro)
  // Ordena por data de atualização
  const meusLeads = filteredLeads
    .filter(l => l.status_sdr === 'MEUS_LEADS')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  const emQualificacao = filteredLeads
    .filter(l => l.status_sdr === 'QUALIFICACAO')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  const pertoReuniao = filteredLeads
    .filter(l => l.status_sdr === 'PERTO_REUNIAO')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  const encaminhados = filteredLeads.filter(l => l.status_sdr === 'ENCAMINHADO_REUNIAO')

  const leadsPerdidos = filteredLeads
    .filter(l => l.status_sdr === 'LEAD_PERDIDO')
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  // Contadores
  const totalMeusLeads = leads.filter(l => l.status_sdr === 'MEUS_LEADS').length
  const totalQualificacao = leads.filter(l => l.status_sdr === 'QUALIFICACAO').length
  const totalPertoReuniao = leads.filter(l => l.status_sdr === 'PERTO_REUNIAO').length
  const totalEncaminhados = leads.filter(l => l.status_sdr === 'ENCAMINHADO_REUNIAO').length
  const totalLeadsPerdidos = leads.filter(l => l.status_sdr === 'LEAD_PERDIDO').length

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return
    }

    const leadId = parseInt(draggableId)
    const newStatus = destination.droppableId as 'MEUS_LEADS' | 'QUALIFICACAO' | 'PERTO_REUNIAO' | 'ENCAMINHADO_REUNIAO' | 'LEAD_PERDIDO'

    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, status_sdr: newStatus } : l
    ))

    try {
      await updateLeadStatus(leadId, newStatus)
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      if (profile) {
        // Recarrega leads
        const leadsData = await getLeadsBySdr(profile.id)
        setLeads(leadsData)
      }
    }
  }

  // Handler Genérico para Avançar (Seta Direita)
  const handleAdvance = async (leadId: number) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    let newStatus: 'QUALIFICACAO' | 'PERTO_REUNIAO' | 'ENCAMINHADO_REUNIAO' | null = null

    if (lead.status_sdr === 'MEUS_LEADS') newStatus = 'QUALIFICACAO'
    else if (lead.status_sdr === 'QUALIFICACAO') newStatus = 'PERTO_REUNIAO'
    else if (lead.status_sdr === 'PERTO_REUNIAO') newStatus = 'ENCAMINHADO_REUNIAO'

    if (newStatus) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status_sdr: newStatus } : l))
      try {
        await updateLeadStatus(leadId, newStatus)
      } catch (err) {
        console.error('Erro ao avançar:', err)
      }
    }
  }

  // Handler Genérico para Voltar (Seta Esquerda)
  const handleRetreat = async (leadId: number) => {
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    let newStatus: 'MEUS_LEADS' | 'QUALIFICACAO' | 'PERTO_REUNIAO' | null = null

    if (lead.status_sdr === 'ENCAMINHADO_REUNIAO') newStatus = 'PERTO_REUNIAO'
    else if (lead.status_sdr === 'PERTO_REUNIAO') newStatus = 'QUALIFICACAO'
    else if (lead.status_sdr === 'QUALIFICACAO') newStatus = 'MEUS_LEADS'

    if (newStatus) {
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status_sdr: newStatus } : l))
      try {
        await updateLeadStatus(leadId, newStatus)
      } catch (err) {
        console.error('Erro ao voltar:', err)
      }
    }
  }

  if (loadingLeads || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B0000] mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando...</p>
        </div>
      </div>
    )
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
           <h2 className="text-xl font-bold text-gray-900 mb-2">Erro de Perfil</h2>
           <p className="text-gray-500">Não foi possível carregar seu perfil de SDR.</p>
           <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[#8B0000] text-white rounded">Tentar Novamente</button>
        </div>
      </div>
    )
  }

  const hasActiveFilters = filters.searchTerm || filters.dateFrom || filters.dateTo || filters.tipoHospedagem || filters.origem || filters.fonte || filters.classificacao

  return (
    <Sidebar>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header fixo */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-4 md:px-6 py-4 z-20 relative overflow-visible">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-4">
            <div>
              <h1 className="text-xl md:text-2xl font-bold text-gray-900 mt-8 md:mt-0">Meus Leads</h1>
              <p className="text-sm text-gray-500 mt-1">
                Arraste os cards para atualizar o status
              </p>
            </div>
            
            {/* Stats Grid - Mobile: Grid 2 cols, Desktop: Flex Row */}
            <div className="grid grid-cols-2 lg:flex items-center gap-4 md:gap-6 bg-gray-50 rounded-xl p-4">
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-gray-700">{totalMeusLeads}</p>
                <p className="text-xs text-gray-500">Aguardando</p>
              </div>
              <div className="hidden lg:block w-px h-8 bg-gray-200"></div>
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-blue-600">{totalQualificacao}</p>
                <p className="text-xs text-gray-500">Qualificação</p>
              </div>
              <div className="hidden lg:block w-px h-8 bg-gray-200"></div>
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-indigo-600">{totalPertoReuniao}</p>
                <p className="text-xs text-gray-500">Perto de Reunião</p>
              </div>
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-emerald-600">{totalEncaminhados}</p>
                <p className="text-xs text-gray-500">Encaminhados</p>
              </div>
              <div className="hidden lg:block w-px h-8 bg-gray-200"></div>
              <div className="text-center">
                <p className="text-xl md:text-2xl font-bold text-red-600">{totalLeadsPerdidos}</p>
                <p className="text-xs text-gray-500">Perdidos</p>
              </div>
              
              {hasActiveFilters && (
                <>
                  <div className="hidden md:block w-px h-8 bg-gray-200"></div>
                  <div className="text-center col-span-2 md:col-span-1 border-t md:border-t-0 pt-2 md:pt-0 mt-2 md:mt-0 border-gray-200">
                    <p className="text-xl md:text-2xl font-bold text-blue-600">{filteredLeads.length}</p>
                    <p className="text-xs text-gray-500">Filtrados</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Filtros de busca e data */}
          <LeadFilters onFilterChange={setFilters} />

          {/* Filtros de SDR (Apenas Admin) */}
          {profile && profile.role === 'admin' && (
            <div className="mt-3 flex flex-wrap gap-2 pb-2">
              <span className="text-xs font-semibold text-gray-500 flex items-center mr-2">
                Ver como:
              </span>
              {sdrs.map(sdr => (
                <button
                  key={sdr.id}
                  onClick={() => setSelectedSdrId(sdr.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    selectedSdrId === sdr.id
                      ? 'bg-[#8B0000] text-white shadow-md'
                      : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                  }`}
                >
                  {sdr.name}
                </button>
              ))}
            </div>
          )}
        </header>

        {/* Conteúdo - área do Kanban */}
        <main className="flex-1 min-h-0 p-4 md:p-6 overflow-x-auto">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Container do Kanban - Scroll horizontal no mobile */}
          <div className="h-full rounded-2xl bg-white/50 border border-gray-200 p-4 min-w-[768px] md:min-w-0">
            <DraggableKanbanBoard onDragEnd={handleDragEnd}>
              <DraggableKanbanColumn
                id="MEUS_LEADS"
                titulo="Meus leads"
                leads={meusLeads}
                cor="#4b5563"
                onEncaminhar={handleAdvance}
                onDevolver={handleDevolver}
              />
              <DraggableKanbanColumn
                id="QUALIFICACAO"
                titulo="Qualificação"
                leads={emQualificacao}
                cor="#2563eb"
                onEncaminhar={handleAdvance}
                onVoltar={handleRetreat}
              />
              <DraggableKanbanColumn
                id="PERTO_REUNIAO"
                titulo="Perto de marcar reunião"
                leads={pertoReuniao}
                cor="#4f46e5"
                onEncaminhar={handleAdvance}
                onVoltar={handleRetreat}
              />
              <DraggableKanbanColumn
                id="ENCAMINHADO_REUNIAO"
                titulo="Encaminhados para reunião"
                leads={encaminhados}
                cor="#10b981"
                onVoltar={handleRetreat}
              />
              <DraggableKanbanColumn
                id="LEAD_PERDIDO"
                titulo="Lead Perdido"
                leads={leadsPerdidos}
                cor="#dc2626"
              />
            </DraggableKanbanBoard>
          </div>
        </main>
      </div>
    </Sidebar>
  )
}
