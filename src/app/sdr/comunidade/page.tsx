'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabaseClient'
import { getLeadsBySdr, updateLeadStatus, getAllSdrs, unassignLead, Lead, Profile } from '@/lib/leads'
import { DraggableKanbanBoard, DraggableKanbanColumn } from '@/components/DraggableKanban'
import Sidebar from '@/components/Sidebar'
import LeadFilters, { FilterState, filterLeads } from '@/components/LeadFilters'
import { useAuth } from '@/contexts/AuthContext'

export default function ComunidadeKanbanPage() {
  const router = useRouter()
  
  const { user, profile, loading: authLoading } = useAuth()
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [sdrs, setSdrs] = useState<Profile[]>([])
  const [selectedSdrId, setSelectedSdrId] = useState<string | null>(null)
  const [loadingKanban, setLoadingKanban] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Filtros
  const [filters, setFilters] = useState<FilterState>({ searchTerm: '', dateFrom: '', dateTo: '', tipoHospedagem: '', origem: '' })

  // Inicializa selectedSdrId
  useEffect(() => {
    if (profile && !selectedSdrId) {
      setSelectedSdrId(profile.id)
    }
  }, [profile])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace('/login')
      return
    }
    
    if (!profile) return

    const fetchData = async () => {
      setLoadingKanban(true)
      try {
        const promises: Promise<any>[] = []
        
        if (profile.role === 'admin') {
          promises.push(getAllSdrs().then(setSdrs))
        }

        const targetSdrId = profile.role === 'admin' ? (selectedSdrId || profile.id) : profile.id
        
        if (targetSdrId) {
          const leadsPromise = getLeadsBySdr(targetSdrId).then(leadsData => {
            const leadsComunidade = leadsData.filter(l => 
              l.fonte && l.fonte.toLowerCase() === 'comunidade'
            )
            setLeads(leadsComunidade)
          })
          promises.push(leadsPromise)
        }

        await Promise.all(promises)
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados')
      } finally {
        setLoadingKanban(false)
      }
    }

    fetchData()
  }, [user, profile, authLoading, router, selectedSdrId])

  // Aplica filtros aos leads
  const filteredLeads = useMemo(() => {
    return filterLeads(leads, filters)
  }, [leads, filters])

  const meusLeads = filteredLeads.filter(l => l.status_sdr === 'MEUS_LEADS')
  const vendidos = filteredLeads.filter(l => l.status_sdr === 'VENDEU')

  // Contadores originais (sem filtro)
  const totalMeusLeads = leads.filter(l => l.status_sdr === 'MEUS_LEADS').length
  const totalVendidos = leads.filter(l => l.status_sdr === 'VENDEU').length

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result

    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return
    }

    const leadId = parseInt(draggableId)
    const newStatus = destination.droppableId as 'MEUS_LEADS' | 'VENDEU'

    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, status_sdr: newStatus } : l
    ))

    try {
      await updateLeadStatus(leadId, newStatus)
    } catch (err) {
      console.error('Erro ao atualizar status:', err)
      if (profile) {
        const leadsData = await getLeadsBySdr(profile.id)
        const leadsComunidade = leadsData.filter(l => l.fonte && l.fonte.toLowerCase() === 'comunidade')
        setLeads(leadsComunidade)
      }
    }
  }

  const handleMarcarVendeu = async (leadId: number) => {
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, status_sdr: 'VENDEU' } : l
    ))
    try {
      await updateLeadStatus(leadId, 'VENDEU')
    } catch (err) {
      if (profile) {
        const leadsData = await getLeadsBySdr(profile.id)
        const leadsComunidade = leadsData.filter(l => l.fonte === 'comunidade')
        setLeads(leadsComunidade)
      }
    }
  }

  const handleVoltar = async (leadId: number) => {
    setLeads(prev => prev.map(l => 
      l.id === leadId ? { ...l, status_sdr: 'MEUS_LEADS' } : l
    ))
    try {
      await updateLeadStatus(leadId, 'MEUS_LEADS')
    } catch (err) {
      if (profile) {
        const leadsData = await getLeadsBySdr(profile.id)
        const leadsComunidade = leadsData.filter(l => l.fonte === 'comunidade')
        setLeads(leadsComunidade)
      }
    }
  }

  const handleDevolver = async (leadId: number) => {
    setLeads(prev => prev.filter(l => l.id !== leadId))
    try {
      await unassignLead(leadId)
    } catch (err) {
      console.error('Erro ao devolver lead:', err)
      if (profile) {
        const leadsData = await getLeadsBySdr(profile.id)
        const leadsComunidade = leadsData.filter(l => l.fonte && l.fonte.toLowerCase() === 'comunidade')
        setLeads(leadsComunidade)
      }
    }
  }

  if (loadingKanban || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#0ea5e9] mx-auto mb-4"></div>
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

  const hasActiveFilters = filters.searchTerm || filters.dateFrom || filters.dateTo

  return (
    <Sidebar>
      <div className="h-screen flex flex-col bg-gray-50">
        {/* Header fixo */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 z-20 relative overflow-visible">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Leads Comunidade</h1>
              <p className="text-sm text-gray-500 mt-1">
                Gerencie seus leads da comunidade
              </p>
            </div>
            <div className="flex items-center gap-6 bg-gray-50 rounded-xl px-4 py-2">
              <div className="text-center">
                <p className="text-2xl font-bold text-sky-600">{totalMeusLeads}</p>
                <p className="text-xs text-gray-500">Em atendimento</p>
              </div>
              <div className="w-px h-8 bg-gray-200"></div>
              <div className="text-center">
                <p className="text-2xl font-bold text-emerald-600">{totalVendidos}</p>
                <p className="text-xs text-gray-500">Vendidos</p>
              </div>
              {hasActiveFilters && (
                <>
                  <div className="w-px h-8 bg-gray-200"></div>
                  <div className="text-center">
                    <p className="text-2xl font-bold text-blue-600">{filteredLeads.length}</p>
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
                      ? 'bg-[#0ea5e9] text-white shadow-md' // Blue for Comunidade
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
        <main className="flex-1 min-h-0 p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center gap-2">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Container do Kanban */}
          <div className="h-full rounded-2xl bg-white/50 border border-gray-200 p-4">
            <DraggableKanbanBoard onDragEnd={handleDragEnd}>
              <DraggableKanbanColumn
                id="MEUS_LEADS"
                titulo="Leads Comunidade"
                leads={meusLeads}
                cor="#0ea5e9"
                onVendeu={handleMarcarVendeu}
                onDevolver={handleDevolver}
                isComunidade={true}
              />
              <DraggableKanbanColumn
                id="VENDEU"
                titulo="Vendeu"
                leads={vendidos}
                cor="#10b981"
                onVoltar={handleVoltar}
                isComunidade={true}
              />
            </DraggableKanbanBoard>
          </div>
        </main>
      </div>
    </Sidebar>
  )
}
