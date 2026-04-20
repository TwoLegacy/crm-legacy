'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'
import ImportRemarketingModal from '@/components/ImportRemarketingModal'
import ConfirmModal from '@/components/ConfirmModal'
import AddRemarketingLeadModal from '@/components/AddRemarketingLeadModal'
import LeadRemarketingDetailModal from '@/components/LeadRemarketingDetailModal'
import TransferToRemarketingFunnelModal from '@/components/TransferToRemarketingFunnelModal'
import { DraggableKanbanBoard, DraggableKanbanColumn } from '@/components/DraggableRemarketingKanban'
import { createClient } from '@/lib/supabaseClient'
import {
  RemarketingLead,
  StatusRemarketing,
} from '@/lib/remarketing'

export default function RemarketingPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()

  // Lista Master de todos os leads visíveis
  const [leads, setLeads] = useState<RemarketingLead[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  // Modais
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [detailLead, setDetailLead] = useState<RemarketingLead | null>(null)
  const [deleteLeadId, setDeleteLeadId] = useState<number | null>(null)
  const [transferLead, setTransferLead] = useState<RemarketingLead | null>(null)
  
  // Guardar coluna de origem para rollback se o modal de RECUPERADO for cancelado
  const [originColTransfer, setOriginColTransfer] = useState<string | null>(null)

  const isAdmin = profile?.role === 'admin'

  const fetchLeads = useCallback(async () => {
    if (!profile) return
    setLoading(true)

    try {
      const supabase = createClient()
      let q = supabase
        .from('remarketing_leads')
        .select('*')
        .is('transferido_at', null)
        .order('created_at', { ascending: false })
        .limit(200)

      if (!isAdmin) {
        q = q.or(`sdr_id.eq.${profile.id},sdr_id.is.null`)
      }

      if (search) {
        q = q.or(`nome.ilike.%${search}%,whatsapp.ilike.%${search}%,nome_empresa.ilike.%${search}%`)
      }

      const { data, error } = await q
      if (error) throw error
      if (data) setLeads(data)
    } catch (err) {
      console.error('Erro ao buscar leads:', err)
    } finally {
      setLoading(false)
    }
  }, [profile, isAdmin, search])

  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    if (!profile) return
    if (profile.role !== 'admin' && profile.role !== 'sdr' && profile.role !== 'marketing') {
      router.replace('/'); return
    }

    fetchLeads()
  }, [user, profile, authLoading, router, fetchLeads])

  const handleDragEnd = async (result: { draggableId: string; sourceColumnId: string; destinationColumnId: string }) => {
    const { draggableId, sourceColumnId, destinationColumnId } = result
    if (sourceColumnId === destinationColumnId) return

    const leadId = Number(draggableId)
    const newStatus = destinationColumnId as StatusRemarketing
    const oldStatus = sourceColumnId as StatusRemarketing

    // Optimistic UI Update
    setLeads(prev => prev.map(l => {
      if (l.id === leadId) {
        return {
          ...l,
          status_remarketing: newStatus,
          sdr_id: newStatus !== 'PARA_PROSPECTAR' ? profile?.id || l.sdr_id : null
        }
      }
      return l
    }))

    // Se ele jogou pra "RECUPERADO", abre o modal na hora!
    if (newStatus === 'RECUPERADO') {
      const draggedLead = leads.find(l => l.id === leadId)
      if (draggedLead) {
        setOriginColTransfer(sourceColumnId)
        setTransferLead({
          ...draggedLead,
          status_remarketing: 'RECUPERADO',
          sdr_id: profile?.id || draggedLead.sdr_id
        })
      }
      // O banco só será de fato alterado quando confirmar no modal,
      // se cancelar, volta pro oldStatus
      return; 
    }

    // Caso não seja RECUPERADO, apenas faz o UPDATE simples no supabase
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('remarketing_leads')
        .update({ 
          status_remarketing: newStatus,
          sdr_id: newStatus !== 'PARA_PROSPECTAR' ? profile?.id : null
        })
        .eq('id', leadId)

      if (error) throw error
    } catch (err) {
      console.error('Erro update remarketing:', err)
      fetchLeads() // Rollback
    }
  }

  // Quando o Modal de Recuperar é Fechado ou Cancelado
  const handleTransferModalClose = () => {
    // Rollback visual imediato se não concluiu a transação
    if (transferLead && originColTransfer) {
      setLeads(prev => prev.map(l => 
        l.id === transferLead.id 
          ? { ...l, status_remarketing: originColTransfer as StatusRemarketing } 
          : l
      ))
    }
    setTransferLead(null)
    setOriginColTransfer(null)
  }

  const handleTransferSuccess = (remarketingId: number) => {
    // Remove do board porque já foi pro CRM Master
    setLeads(prev => prev.filter(l => l.id !== remarketingId))
    setTransferLead(null)
    setOriginColTransfer(null)
  }

  const handleDeleteLead = (id: number) => {
    setDeleteLeadId(id)
  }

  const confirmDeleteLead = async () => {
    if (!deleteLeadId) return
    try {
      const { deleteRemarketingLead } = await import('@/lib/remarketing')
      await deleteRemarketingLead(deleteLeadId)
      setLeads(prev => prev.filter(l => l.id !== deleteLeadId))
    } catch (err) {
      console.error('Erro ao deletar lead:', err)
    } finally {
      setDeleteLeadId(null)
    }
  }

  if (authLoading || !profile) {
    return (
      <Sidebar>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-[#8B0000] rounded-full animate-spin" />
        </div>
      </Sidebar>
    )
  }

  // Filtra Leads por Colunas
  const cols = {
    PARA_PROSPECTAR: leads.filter(l => l.status_remarketing === 'PARA_PROSPECTAR'),
    PROSPECTADO: leads.filter(l => l.status_remarketing === 'PROSPECTADO'),
    RESPONDEU: leads.filter(l => l.status_remarketing === 'RESPONDEU'),
    RECUPERADO: leads.filter(l => l.status_remarketing === 'RECUPERADO')
  }

  return (
    <Sidebar>
      <div className="flex flex-col h-[100dvh] overflow-hidden min-w-0">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Kanban de Remarketing</h1>
              <p className="text-sm text-gray-500">Recuperação e reativação de leads isolada</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setAddModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gray-50 text-gray-700 hover:bg-gray-100 border border-gray-200 transition-all text-sm font-medium shadow-sm"
              >
                + Novo Manual
              </button>
              {isAdmin && (
                <button
                  onClick={() => setImportModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-sm font-medium shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Importar CSV de Contatos
                </button>
              )}
            </div>
          </div>

          <div className="relative max-w-md">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar no remarketing..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            />
          </div>
        </div>

        {/* Board DnD */}
        <div className="flex-1 bg-gray-50 overflow-hidden relative min-w-0 min-h-0 w-full">
          {loading ? (
             <div className="absolute inset-0 flex items-center justify-center">
               <div className="w-8 h-8 border-2 border-gray-300 border-t-[#8B0000] rounded-full animate-spin" />
             </div>
          ) : (
             <DraggableKanbanBoard onDragEnd={handleDragEnd}>
               <DraggableKanbanColumn
                 id="PARA_PROSPECTAR"
                 titulo="Para Prospectar"
                 cor="#2563EB"
                 onClick={setDetailLead}
                 onDelete={handleDeleteLead}
                 leads={cols.PARA_PROSPECTAR}
               />
               <DraggableKanbanColumn
                 id="PROSPECTADO"
                 titulo="Prospectado"
                 cor="#0EA5E9"
                 onClick={setDetailLead}
                 onDelete={handleDeleteLead}
                 leads={cols.PROSPECTADO}
               />
               <DraggableKanbanColumn
                 id="RESPONDEU"
                 titulo="Respondeu"
                 cor="#F59E0B"
                 onClick={setDetailLead}
                 onDelete={handleDeleteLead}
                 leads={cols.RESPONDEU}
               />
               <DraggableKanbanColumn
                 id="RECUPERADO"
                 titulo="Recuperado (Gatilho)"
                 cor="#10B981"
                 onClick={setDetailLead}
                 onDelete={handleDeleteLead}
                 leads={cols.RECUPERADO}
               />
             </DraggableKanbanBoard>
          )}
        </div>
      </div>

      <ImportRemarketingModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false)
          fetchLeads()
        }}
        userId={profile.id}
      />

      <AddRemarketingLeadModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={(newLead) => {
          setLeads(prev => [newLead, ...prev])
        }}
        userId={profile.id}
      />

      <LeadRemarketingDetailModal
        lead={detailLead}
        onClose={() => setDetailLead(null)}
        onUpdate={(updated) => {
          setLeads(prev => prev.map(l => l.id === updated.id ? updated : l))
          setDetailLead(updated)
        }}
      />

      {/* MODAL MÁGICO DE TRANSFERÊNCIA! (Quando Joga pra RECUPERADO) */}
      <TransferToRemarketingFunnelModal
        lead={transferLead}
        sdrId={profile.id}
        onClose={handleTransferModalClose}
        onSuccess={handleTransferSuccess}
      />

      {/* Modal de confirmação de deleção */}
      <ConfirmModal
        isOpen={deleteLeadId !== null}
        title="Apagar lead do Remarketing"
        message="Tem certeza que deseja apagar este lead? Essa ação não pode ser desfeita."
        confirmLabel="Apagar"
        cancelLabel="Cancelar"
        onConfirm={confirmDeleteLead}
        onCancel={() => setDeleteLeadId(null)}
        variant="danger"
      />
    </Sidebar>
  )
}
