'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabaseClient'
import { getAllLeads, assignLeadToSdr, unassignLead, reassignLead, deleteLead, Lead, Profile, getAllSdrs } from '@/lib/leads'
import { 
  agruparLeadsPorColuna, 
  ORDEM_COLUNAS, 
  QUALIFICACAO_PARA_COLUNA,
  CORES_COLUNAS,
  type Qualificacao,
  type ColunaGlobal
} from '@/lib/kanban'
import { useAuth } from '@/contexts/AuthContext'
import LeadCard from '@/components/LeadCard'
import AssignModal from '@/components/AssignModal'
import LeadActionsModal from '@/components/LeadActionsModal'
import Sidebar from '@/components/Sidebar'
import LeadFilters, { FilterState, filterLeads } from '@/components/LeadFilters'
import CreateLeadModal from '@/components/CreateLeadModal'

type ViewMode = 'todos' | 'nao_atribuidos' | string

export default function AdminKanbanPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const supabase = createClient() // Ainda necessário para outras chamadas? Sim, getAllLeads usa import direto, mas aqui usa supabase? Não, usa helpers.
  // Wait, getAllLeads uses direct imports from @/lib/leads.
  // But inside useEffect, it uses supabase to get profile? No, useAuth gives profile.

  const [allLeads, setAllLeads] = useState<Lead[]>([])
  const [sdrs, setSdrs] = useState<Profile[]>([])
  const [loadingKanban, setLoadingKanban] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // ... rest of state ...
  const [viewMode, setViewMode] = useState<ViewMode>('nao_atribuidos')
  const [filters, setFilters] = useState<FilterState>({ 
    searchTerm: '', 
    dateFrom: '', 
    dateTo: '', 
    tipoHospedagem: '', 
    origem: '', 
    fonte: '',
    classificacao: '',
    apenasDuplicados: false
  })
  const [assignModalOpen, setAssignModalOpen] = useState(false)
  const [selectedLeadForAssign, setSelectedLeadForAssign] = useState<Lead | null>(null)
  const [actionsModalOpen, setActionsModalOpen] = useState(false)
  const [selectedLeadForActions, setSelectedLeadForActions] = useState<Lead | null>(null)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const sdrsMap = useMemo(() => {
    const map = new Map<string, Profile>()
    sdrs.forEach(sdr => map.set(sdr.id, sdr))
    return map
  }, [sdrs])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (!profile) return

    const fetchData = async () => {
      try {
        const [leadsData, sdrsData] = await Promise.all([
          getAllLeads(),
          getAllSdrs()
        ])
        
        setAllLeads(leadsData)
        setSdrs(sdrsData)
      } catch (err: any) {
        console.error('Erro ao carregar dados:', err)
        setError('Erro ao carregar dados')
      } finally {
        setLoadingKanban(false)
      }
    }

    fetchData()
  }, [user, profile, authLoading, router])

  const getFilteredLeads = useMemo(() => {
    let leads = allLeads
    
    if (viewMode === 'nao_atribuidos') {
      leads = leads.filter(l => !l.owner_sdr_id)
    } else if (viewMode !== 'todos') {
      leads = leads.filter(l => l.owner_sdr_id === viewMode)
    }
    
    return filterLeads(leads, filters)
  }, [allLeads, viewMode, filters])

  const leadsAgrupados = agruparLeadsPorColuna(getFilteredLeads)

  // Sempre mostra todas as colunas
  const colunasVisiveis = ORDEM_COLUNAS
  
  // Verifica se o usuário pode ver os cards de uma coluna específica
  const podeVerCardsColuna = (coluna: ColunaGlobal): boolean => {
    if (profile?.role === 'admin') return true
    const qualificacao = Object.entries(QUALIFICACAO_PARA_COLUNA)
      .find(([_, col]) => col === coluna)?.[0] as Qualificacao
    return profile?.visible_qualifications?.includes(qualificacao) ?? false
  }

  const handlePuxarParaMim = async (leadId: number) => {
    if (!profile) return
    try {
      await assignLeadToSdr(leadId, profile.id)
      setAllLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, owner_sdr_id: profile.id, status_sdr: 'MEUS_LEADS' } : l
      ))
    } catch (err) {
      console.error('Erro ao puxar lead:', err)
    }
  }

  const handleOpenAtribuir = (leadId: number) => {
    const lead = allLeads.find(l => l.id === leadId)
    if (lead) {
      setSelectedLeadForAssign(lead)
      setAssignModalOpen(true)
    }
  }

  const handleConfirmAtribuir = async (leadId: number, sdrId: string) => {
    try {
      await assignLeadToSdr(leadId, sdrId)
      setAllLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, owner_sdr_id: sdrId, status_sdr: 'MEUS_LEADS' } : l
      ))
      setAssignModalOpen(false)
      setSelectedLeadForAssign(null)
    } catch (err) {
      console.error('Erro ao atribuir lead:', err)
    }
  }

  const handleOpenGerenciar = (lead: Lead) => {
    setSelectedLeadForActions(lead)
    setActionsModalOpen(true)
  }

  const handleUnassign = async (leadId: number) => {
    try {
      await unassignLead(leadId)
      setAllLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, owner_sdr_id: null, status_sdr: null } : l
      ))
    } catch (err) {
      console.error('Erro ao desatribuir lead:', err)
    }
  }

  const handleReassign = async (leadId: number, newSdrId: string) => {
    try {
      await reassignLead(leadId, newSdrId)
      setAllLeads(prev => prev.map(l => 
        l.id === leadId ? { ...l, owner_sdr_id: newSdrId, status_sdr: 'MEUS_LEADS' } : l
      ))
    } catch (err) {
      console.error('Erro ao reatribuir lead:', err)
    }
  }

  const handleDeleteLead = async (leadId: number) => {
    // Guarda o lead para reverter se falhar
    const leadToDelete = allLeads.find(l => l.id === leadId)
    
    // Atualização otimista
    setAllLeads(prev => prev.filter(l => l.id !== leadId))
    
    try {
      await deleteLead(leadId)
      console.log('Lead deletado com sucesso:', leadId)
    } catch (err: any) {
      console.error('Erro ao deletar lead:', err)
      // Reverte a UI
      if (leadToDelete) {
        setAllLeads(prev => [...prev, leadToDelete])
      }
      const errorMsg = err?.message || err?.code || 'Verifique as permissões de DELETE no Supabase'
      setError(`Erro ao deletar lead: ${errorMsg}`)
    }
  }

  const totalLeads = allLeads.length
  const naoAtribuidos = allLeads.filter(l => !l.owner_sdr_id).length
  const hasActiveFilters = filters.searchTerm || filters.dateFrom || filters.dateTo || filters.tipoHospedagem || filters.origem || filters.fonte || filters.classificacao

  if (loadingKanban || authLoading) {
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
           <p className="text-gray-500">Não foi possível carregar seu perfil de Administrador.</p>
           <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-[#8B0000] text-white rounded">Tentar Novamente</button>
        </div>
      </div>
    )
  }

  return (
    <Sidebar>
      <div className="h-screen flex flex-col bg-gray-50 overflow-hidden">
        {/* Header fixo */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-3">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">Novos Leads</h1>
                <p className="text-xs text-gray-500 mt-0.5">
                  Gerencie e distribua os leads para sua equipe
                </p>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#8B0000] text-white text-xs font-bold rounded-lg hover:bg-[#6B0000] transition-all shadow-sm active:scale-95"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Novo Lead
              </button>
            </div>
            <div className="flex items-center gap-4 bg-gray-50 rounded-xl px-3 py-1.5">
              <div className="text-center">
                <p className="text-xl font-bold text-gray-900">{totalLeads}</p>
                <p className="text-xs text-gray-500">Total</p>
              </div>
              <div className="w-px h-6 bg-gray-200"></div>
              <div className="text-center">
                <p className="text-xl font-bold text-amber-600">{naoAtribuidos}</p>
                <p className="text-xs text-gray-500">Não atribuídos</p>
              </div>
              {hasActiveFilters && (
                <>
                  <div className="w-px h-6 bg-gray-200"></div>
                  <div className="text-center">
                    <p className="text-xl font-bold text-blue-600">{getFilteredLeads.length}</p>
                    <p className="text-xs text-gray-500">Filtrados</p>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Filtros de busca e data */}
          <LeadFilters onFilterChange={setFilters} />

          {/* Filtros por SDR */}
          {profile.role === 'admin' && (
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                onClick={() => setViewMode('nao_atribuidos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'nao_atribuidos'
                    ? 'bg-[#8B0000] text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Não atribuídos ({naoAtribuidos})
              </button>
              <button
                onClick={() => setViewMode('todos')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                  viewMode === 'todos'
                    ? 'bg-[#8B0000] text-white shadow-md'
                    : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                }`}
              >
                Todos ({totalLeads})
              </button>
              
              <div className="w-px h-6 bg-gray-200 mx-1"></div>
              
              {sdrs.map(sdr => {
                const sdrLeadsCount = allLeads.filter(l => l.owner_sdr_id === sdr.id).length
                return (
                  <button
                    key={sdr.id}
                    onClick={() => setViewMode(sdr.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      viewMode === sdr.id
                        ? 'bg-[#8B0000] text-white shadow-md'
                        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {sdr.name} ({sdrLeadsCount})
                  </button>
                )
              })}
            </div>
          )}
        </header>

        {/* Área do Kanban - sem scroll vertical externo */}
        <main className="flex-1 p-4 overflow-hidden">
          {error && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 px-3 py-2 rounded-xl flex items-center gap-2 text-sm">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Container com scroll horizontal APENAS AQUI */}
          <div className="h-full rounded-xl bg-white/50 border border-gray-200 p-3 overflow-x-auto overflow-y-hidden">
            <div className="flex gap-3 h-full" style={{ width: 'max-content' }}>
              {colunasVisiveis.map(coluna => {
                const corColuna = CORES_COLUNAS[coluna as ColunaGlobal] || '#8B0000'
                const leadsColuna = leadsAgrupados[coluna]
                
                return (
                  <div 
                    key={coluna} 
                    className="w-[280px] flex-shrink-0 flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-full"
                  >
                    {/* Header da coluna */}
                    <div className="px-3 py-2.5 flex-shrink-0" style={{ backgroundColor: corColuna }}>
                      <div className="flex items-center justify-between">
                        <h2 className="font-semibold text-white text-sm">{coluna}</h2>
                        <span className="bg-white/25 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                          {podeVerCardsColuna(coluna) ? leadsColuna.length : '-'}
                        </span>
                      </div>
                    </div>

                    {/* Cards com scroll vertical APENAS DENTRO DA COLUNA */}
                    <div className="flex-1 p-2 space-y-2 overflow-y-auto bg-gray-50/50">
                      {!podeVerCardsColuna(coluna) ? (
                        <div className="text-center text-gray-400 py-8">
                          <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          <p className="text-xs">Sem acesso</p>
                        </div>
                      ) : leadsColuna.length === 0 ? (
                        <div className="text-center text-gray-400 py-8">
                          <svg className="w-10 h-10 mx-auto text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                          </svg>
                          <p className="text-xs">Nenhum lead</p>
                        </div>
                      ) : (
                        leadsColuna.map(lead => (
                          <LeadCard
                            key={lead.id}
                            lead={lead}
                            isAdmin={profile.role === 'admin'}
                            sdrName={lead.owner_sdr_id ? sdrsMap.get(lead.owner_sdr_id)?.name : undefined}
                            onPuxarParaMim={profile.role === 'sdr' ? handlePuxarParaMim : undefined}
                            onAtribuir={profile.role === 'admin' ? handleOpenAtribuir : undefined}
                            onGerenciar={profile.role === 'admin' ? handleOpenGerenciar : undefined}
                            onDeletar={profile.role === 'admin' ? handleDeleteLead : undefined}
                          />
                        ))
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </main>

        <AssignModal
          isOpen={assignModalOpen}
          leadId={selectedLeadForAssign?.id || null}
          leadNome={selectedLeadForAssign?.nome || ''}
          onClose={() => {
            setAssignModalOpen(false)
            setSelectedLeadForAssign(null)
          }}
          onConfirm={handleConfirmAtribuir}
        />

        <LeadActionsModal
          isOpen={actionsModalOpen}
          leadId={selectedLeadForActions?.id || null}
          leadNome={selectedLeadForActions?.nome || ''}
          currentSdrId={selectedLeadForActions?.owner_sdr_id || null}
          currentSdrName={selectedLeadForActions?.owner_sdr_id ? sdrsMap.get(selectedLeadForActions.owner_sdr_id)?.name : undefined}
          onClose={() => {
            setActionsModalOpen(false)
            setSelectedLeadForActions(null)
          }}
          onUnassign={handleUnassign}
          onReassign={handleReassign}
        />
      </div>

      <CreateLeadModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={(newLead) => setAllLeads(prev => [newLead, ...prev])}
        sdrId={null}
      />
    </Sidebar>
  )
}
