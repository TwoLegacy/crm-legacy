'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { DropResult } from '@hello-pangea/dnd'
import { createClient } from '@/lib/supabaseClient'
import { getLeadsByCloser, updateLeadStatusCloser, devolverNoShowSdr, Lead, Profile, getAllClosers } from '@/lib/leads'
import { useAuth } from '@/contexts/AuthContext'
import { DraggableKanbanBoard, DraggableKanbanColumn } from '@/components/DraggableKanban'
import Sidebar from '@/components/Sidebar'
import CloserActionModal from '@/components/CloserActionModal'
import PremiumSelect from '@/components/ui/PremiumSelect'

type CloserKanbanStatus = 'REUNIAO_MARCADA' | 'NO_SHOW' | 'ACOMPANHAMENTO' | 'FECHAMENTO' | 'GANHOU' | 'PERDEU'

export default function CloserKanbanPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [loadingLeads, setLoadingLeads] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Modais de Ação (Arrasto)
  const [actionLead, setActionLead] = useState<Lead | null>(null)
  const [actionType, setActionType] = useState<'GANHOU' | 'PERDEU' | 'NO_SHOW' | null>(null)

  // Filtros Admin
  const [closers, setClosers] = useState<Profile[]>([])
  const [selectedCloserId, setSelectedCloserId] = useState<string>('')

  // Efeito isolado para o Admin puxar a lista de Closers
  useEffect(() => {
    if (profile?.role === 'admin') {
      getAllClosers().then(data => {
        setClosers(data)
        if (data.length > 0 && !selectedCloserId) {
          setSelectedCloserId(data[0].id)
        }
      })
    }
  }, [profile])

  useEffect(() => {
    if (authLoading) return
    if (!user || !profile) {
      if (!authLoading && !user) router.replace('/login')
      return
    }
    
    // Admin ou Closer
    if (profile.role !== 'closer' && profile.role !== 'admin') {
      router.replace('/sdr/kanban')
      return
    }

    loadLeads()
  }, [user, profile, authLoading, router, selectedCloserId])

  const loadLeads = async () => {
    if (!profile) return
    const closerToFetch = profile.role === 'admin' ? selectedCloserId : profile.id
    if (!closerToFetch) return // aguarda popular selectedCloserId em caso de Admin

    setLoadingLeads(true)
    try {
      const data = await getLeadsByCloser(closerToFetch)
      setLeads(data)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setLoadingLeads(false)
    }
  }

  const reunioesMarcadas = leads.filter(l => l.status_closer === 'REUNIAO_MARCADA').sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const noShows = leads.filter(l => l.status_closer === 'NO_SHOW').sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const acompanhamento = leads.filter(l => l.status_closer === 'ACOMPANHAMENTO').sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const fechamento = leads.filter(l => l.status_closer === 'FECHAMENTO').sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const ganhou = leads.filter(l => l.status_closer === 'GANHOU').sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())
  const perdeu = leads.filter(l => l.status_closer === 'PERDEU').sort((a,b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())

  const handleDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result
    if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
      return
    }

    const leadId = parseInt(draggableId)
    const newStatus = destination.droppableId as CloserKanbanStatus
    const lead = leads.find(l => l.id === leadId)
    if (!lead) return

    // Interceptações de Status Especiais
    if (newStatus === 'GANHOU' || newStatus === 'PERDEU' || newStatus === 'NO_SHOW') {
      setActionLead(lead)
      setActionType(newStatus)
      return // Espera o modal
    }

    // Status Comuns - Salva otimista
    setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status_closer: newStatus } : l))
    try {
      await updateLeadStatusCloser(leadId, newStatus)
    } catch {
      loadLeads() // Rollback on error
    }
  }

  const handleModalConfirm = async (data: { valor?: number; motivo?: string }) => {
    if (!actionLead || !actionType) return
    const leadId = actionLead.id

    // Fechar modal otimista
    const finalType = actionType
    setActionLead(null)
    setActionType(null)

    try {
      if (finalType === 'NO_SHOW') {
        // Remove da vista do Closer imediatamente (volta pro SDR)
        setLeads(prev => prev.filter(l => l.id !== leadId))
        await devolverNoShowSdr(leadId)
      } else {
        // GANHOU ou PERDEU
        setLeads(prev => prev.map(l => l.id === leadId ? { 
          ...l, 
          status_closer: finalType,
          valor_venda: data.valor || l.valor_venda,
          motivo_perda: data.motivo || l.motivo_perda
        } : l))

        // Save status
        await updateLeadStatusCloser(leadId, finalType)
        
        // Save extra data manually
        const supabase = createClient()
        if (finalType === 'GANHOU' && data.valor) {
          await supabase.from('leads').update({ valor_venda: data.valor }).eq('id', leadId)
        } else if (finalType === 'PERDEU' && data.motivo) {
          await supabase.from('leads').update({ motivo_perda: data.motivo }).eq('id', leadId)
        }
      }
    } catch (err: any) {
      console.error('Erro na ação do closer', err)
      setError(err.message)
      loadLeads()
    }
  }

  if (loadingLeads || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-800"></div>
      </div>
    )
  }

  if (!profile) return null

  return (
    <Sidebar>
      <div className="h-screen flex flex-col bg-gray-50">
        <header className="flex-shrink-0 bg-white border-b border-gray-200 px-6 py-4 z-20 relative">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-gray-900">Painel Closer</h1>
              {profile.role === 'admin' && closers.length > 0 && (
                <div className="w-64 max-w-sm ml-4 z-50">
                  <PremiumSelect
                    value={selectedCloserId}
                    onChange={setSelectedCloserId}
                    options={closers.map(c => ({ value: c.id, label: c.name }))}
                    placeholder="Filtrar por Closer..."
                  />
                </div>
              )}
            </div>

            <div className="flex gap-4 p-2 bg-gray-50 rounded-xl">
              <div className="text-center px-4 border-r">
                <p className="text-xl font-bold text-slate-700">{leads.length}</p>
                <p className="text-xs text-gray-500">Meus Leads</p>
              </div>
              <div className="text-center px-4">
                <p className="text-xl font-bold text-emerald-600">{ganhou.length}</p>
                <p className="text-xs text-gray-500">Ganhos</p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 min-h-0 p-6 overflow-x-auto">
          {error && (
            <div className="mb-4 bg-red-50 text-red-700 p-3 rounded-xl border border-red-200">
              {error}
            </div>
          )}

          <div className="h-full rounded-2xl bg-white/50 border border-gray-200 p-4 min-w-[1200px]">
            <DraggableKanbanBoard onDragEnd={handleDragEnd}>
              <DraggableKanbanColumn
                id="REUNIAO_MARCADA"
                titulo="Reuniões Marcadas"
                leads={reunioesMarcadas}
                cor="#3b82f6"
              />
              <DraggableKanbanColumn
                id="ACOMPANHAMENTO"
                titulo="Acompanhamento"
                leads={acompanhamento}
                cor="#8b5cf6"
              />
              <DraggableKanbanColumn
                id="FECHAMENTO"
                titulo="Fechamento"
                leads={fechamento}
                cor="#14b8a6"
              />
              <DraggableKanbanColumn
                id="GANHOU"
                titulo="Ganhou"
                leads={ganhou}
                cor="#10b981"
              />
              <DraggableKanbanColumn
                id="PERDEU"
                titulo="Perdeu"
                leads={perdeu}
                cor="#ef4444"
              />
              <DraggableKanbanColumn
                id="NO_SHOW"
                titulo="No-Show (Devolver)"
                leads={noShows}
                cor="#f97316"
              />
            </DraggableKanbanBoard>
          </div>
        </main>

        <CloserActionModal
          isOpen={!!actionType}
          type={actionType}
          leadName={actionLead?.nome}
          onClose={() => {
            setActionType(null)
            setActionLead(null)
          }}
          onConfirm={handleModalConfirm}
        />
      </div>
    </Sidebar>
  )
}
