'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'
import ImportOutboundModal from '@/components/ImportOutboundModal'
import AddOutboundLeadModal from '@/components/AddOutboundLeadModal'
import LeadOutboundDetailModal from '@/components/LeadOutboundDetailModal'
import TransferToFunnelModal from '@/components/TransferToFunnelModal'
import {
  OutboundLead,
  StatusOutbound,
  FonteOutbound,
  getOutboundLeads,
  markAsProspected,
  undoProspected,
  transferToFunnel,
  getOutboundCounts,
} from '@/lib/outbound'

// =====================================================
// CONSTANTES
// =====================================================

const PAGE_SIZE = 30

const FONTE_LABELS: Record<FonteOutbound, { label: string; color: string }> = {
  google_maps: { label: 'Maps', color: 'bg-red-100 text-red-700' },
  indicacao: { label: 'Indicação', color: 'bg-purple-100 text-purple-700' },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-100 text-blue-700' },
  outros: { label: 'Outros', color: 'bg-gray-100 text-gray-600' },
}

// =====================================================
// CARD COMPONENT
// =====================================================

function OutboundCard({
  lead,
  status,
  onProspectar,
  onEnviarFunil,
  onDesfazer,
  onCardClick,
  loading,
}: {
  lead: OutboundLead
  status: StatusOutbound
  onProspectar: (id: number) => void
  onEnviarFunil: (id: number) => void
  onDesfazer: (id: number) => void
  onCardClick: (lead: OutboundLead) => void
  loading: boolean
}) {
  const whatsappLink = `https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 p-4 group cursor-pointer" onClick={() => onCardClick(lead)}>
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-sm truncate">
            {lead.nome_empresa || lead.nome}
          </h3>
          {lead.nome_empresa && (
            <p className="text-xs text-gray-500 truncate">{lead.nome}</p>
          )}
        </div>
        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ml-2 ${FONTE_LABELS[lead.fonte_outbound]?.color || 'bg-gray-100 text-gray-600'}`}>
          {FONTE_LABELS[lead.fonte_outbound]?.label || lead.fonte_outbound}
        </span>
      </div>

      <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        {lead.cidade_estado}
      </p>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <a
            href={whatsappLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium"
            onClick={(e) => e.stopPropagation()}
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
            </svg>
            {lead.whatsapp}
          </a>
          {lead.link_perfil && (
            <a
              href={lead.link_perfil}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-colors font-medium"
              onClick={(e) => e.stopPropagation()}
              title="Ver perfil / fonte"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Perfil
            </a>
          )}
        </div>

        {status === 'PARA_PROSPECTAR' ? (
          <button
            onClick={(e) => { e.stopPropagation(); onProspectar(lead.id) }}
            disabled={loading}
            className="text-xs font-medium px-3 py-1.5 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all disabled:opacity-50 shadow-sm"
          >
            Prospectado ✓
          </button>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={(e) => { e.stopPropagation(); onDesfazer(lead.id) }}
              disabled={loading}
              title="Desfazer prospecção"
              className="text-xs font-medium px-2 py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-all disabled:opacity-50"
            >
              ↩
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onEnviarFunil(lead.id) }}
              disabled={loading}
              className="text-xs font-medium px-3 py-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 transition-all disabled:opacity-50 shadow-sm"
            >
              Enviar ao Funil →
            </button>
          </div>
        )}
      </div>

      {lead.transferido_at && (
        <div className="mt-2 text-[10px] text-emerald-600 bg-emerald-50 rounded-lg px-2 py-1 text-center font-medium">
          ✓ Enviado ao Funil
        </div>
      )}
    </div>
  )
}

// =====================================================
// COLUMN COMPONENT (com scroll infinito)
// =====================================================

function OutboundColumn({
  title,
  status,
  color,
  leads,
  totalCount,
  loading,
  hasMore,
  onLoadMore,
  onProspectar,
  onEnviarFunil,
  onDesfazer,
  onCardClick,
  actionLoading,
  headerAction,
}: {
  title: string
  status: StatusOutbound
  color: string
  leads: OutboundLead[]
  totalCount: number
  loading: boolean
  hasMore: boolean
  onLoadMore: () => void
  onProspectar: (id: number) => void
  onEnviarFunil: (id: number) => void
  onDesfazer: (id: number) => void
  onCardClick: (lead: OutboundLead) => void
  actionLoading: boolean
  headerAction?: React.ReactNode
}) {
  const sentinelRef = useRef<HTMLDivElement>(null)

  // Intersection Observer para scroll infinito
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !loading) {
          onLoadMore()
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [hasMore, loading, onLoadMore])

  return (
    <div className="flex-1 min-w-[340px] max-w-[50%] flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
      {/* Header */}
      <div className="p-4 flex-shrink-0" style={{ borderTop: `4px solid ${color}` }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-900 text-base">{title}</h2>
            <span className="text-xs font-medium px-2.5 py-0.5 rounded-full bg-gray-100 text-gray-600">
              {totalCount}
            </span>
          </div>
          {headerAction}
        </div>
      </div>

      {/* Lista de leads com scroll independente */}
      <div className="flex-1 p-3 space-y-2 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[300px] bg-gray-50/50">
        {leads.length === 0 && !loading ? (
          <div className="text-center py-16 opacity-60">
            <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
            </svg>
            <p className="text-sm text-gray-400">
              {status === 'PARA_PROSPECTAR' ? 'Nenhum lead para prospectar' : 'Nenhum lead prospectado'}
            </p>
          </div>
        ) : (
          <>
            {leads.map((lead) => (
              <OutboundCard
                key={lead.id}
                lead={lead}
                status={status}
                onProspectar={onProspectar}
                onEnviarFunil={onEnviarFunil}
                onDesfazer={onDesfazer}
                onCardClick={onCardClick}
                loading={actionLoading}
              />
            ))}

            {/* Sentinel para scroll infinito */}
            {hasMore && (
              <div ref={sentinelRef} className="py-4 text-center">
                <div className="w-6 h-6 mx-auto border-2 border-gray-200 border-t-gray-500 rounded-full animate-spin" />
              </div>
            )}
          </>
        )}

        {loading && leads.length === 0 && (
          <div className="py-16 text-center">
            <div className="w-8 h-8 mx-auto border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
            <p className="text-sm text-gray-400 mt-3">Carregando...</p>
          </div>
        )}
      </div>
    </div>
  )
}

// =====================================================
// PAGE COMPONENT
// =====================================================

export default function OutboundPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()

  // State: listas
  const [paraProspectar, setParaProspectar] = useState<OutboundLead[]>([])
  const [prospectados, setProspectados] = useState<OutboundLead[]>([])
  const [countPP, setCountPP] = useState(0)
  const [countP, setCountP] = useState(0)
  const [pagePP, setPagePP] = useState(0)
  const [pageP, setPageP] = useState(0)
  const [hasMorePP, setHasMorePP] = useState(true)
  const [hasMoreP, setHasMoreP] = useState(true)
  const [loadingPP, setLoadingPP] = useState(true)
  const [loadingP, setLoadingP] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)

  // State: busca e modais
  const [search, setSearch] = useState('')
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [addModalOpen, setAddModalOpen] = useState(false)
  const [detailLead, setDetailLead] = useState<OutboundLead | null>(null)
  const [transferLead, setTransferLead] = useState<OutboundLead | null>(null)

  const isAdmin = profile?.role === 'admin'

  // Fetch dados
  const fetchColumn = useCallback(async (
    status: StatusOutbound,
    page: number,
    append: boolean = false
  ) => {
    if (!profile) return

    const setLoading = status === 'PARA_PROSPECTAR' ? setLoadingPP : setLoadingP
    const setData = status === 'PARA_PROSPECTAR' ? setParaProspectar : setProspectados
    const setCount = status === 'PARA_PROSPECTAR' ? setCountPP : setCountP
    const setHasMore = status === 'PARA_PROSPECTAR' ? setHasMorePP : setHasMoreP

    setLoading(true)
    try {
      const result = await getOutboundLeads({
        status,
        sdrId: profile.id,
        isAdmin: isAdmin || false,
        page,
        pageSize: PAGE_SIZE,
        search: search || undefined,
      })

      if (append) {
        setData(prev => [...prev, ...result.data])
      } else {
        setData(result.data)
      }
      setCount(result.count)
      setHasMore(result.data.length === PAGE_SIZE)
    } catch (err) {
      console.error(`Erro ao buscar ${status}:`, err)
    } finally {
      setLoading(false)
    }
  }, [profile, isAdmin, search])

  // Load inicial
  useEffect(() => {
    if (authLoading) return
    if (!user) { router.replace('/login'); return }
    if (!profile) return
    if (profile.role !== 'admin' && profile.role !== 'sdr') {
      router.replace('/'); return
    }

    setPagePP(0)
    setPageP(0)
    fetchColumn('PARA_PROSPECTAR', 0)
    fetchColumn('PROSPECTADO', 0)
  }, [user, profile, authLoading, router, fetchColumn])

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPagePP(0)
      setPageP(0)
      fetchColumn('PARA_PROSPECTAR', 0)
      fetchColumn('PROSPECTADO', 0)
    }, 400)
    return () => clearTimeout(timer)
  }, [search]) // eslint-disable-line react-hooks/exhaustive-deps

  // Load more handlers
  const loadMorePP = useCallback(() => {
    const nextPage = pagePP + 1
    setPagePP(nextPage)
    fetchColumn('PARA_PROSPECTAR', nextPage, true)
  }, [pagePP, fetchColumn])

  const loadMoreP = useCallback(() => {
    const nextPage = pageP + 1
    setPageP(nextPage)
    fetchColumn('PROSPECTADO', nextPage, true)
  }, [pageP, fetchColumn])

  // Ações
  const handleProspectar = async (outboundId: number) => {
    if (!profile) return
    setActionLoading(true)

    // Optimistic update: move da coluna 1 para 2
    const lead = paraProspectar.find(l => l.id === outboundId)
    if (lead) {
      const updated = {
        ...lead,
        status_outbound: 'PROSPECTADO' as StatusOutbound,
        sdr_id: profile.id,
        prospectado_at: new Date().toISOString(),
      }
      setParaProspectar(prev => prev.filter(l => l.id !== outboundId))
      setProspectados(prev => [updated, ...prev])
      setCountPP(prev => prev - 1)
      setCountP(prev => prev + 1)
    }

    try {
      await markAsProspected(outboundId, profile.id)
    } catch {
      // Rollback: recarrega ambas
      fetchColumn('PARA_PROSPECTAR', 0)
      fetchColumn('PROSPECTADO', 0)
    } finally {
      setActionLoading(false)
    }
  }

  const handleEnviarFunil = (outboundId: number) => {
    const lead = prospectados.find(l => l.id === outboundId)
    if (lead) setTransferLead(lead)
  }

  const handleTransferSuccess = (outboundId: number) => {
    setProspectados(prev => prev.filter(l => l.id !== outboundId))
    setCountP(prev => prev - 1)
    setTransferLead(null)
  }

  // Desfazer prospecção (Ctrl+Z)
  const handleDesfazer = async (outboundId: number) => {
    if (!profile) return
    setActionLoading(true)

    // Optimistic: move de Prospectados de volta para Para Prospectar
    const lead = prospectados.find(l => l.id === outboundId)
    if (lead) {
      const reverted = {
        ...lead,
        status_outbound: 'PARA_PROSPECTAR' as StatusOutbound,
        sdr_id: null,
        prospectado_at: null,
      }
      setProspectados(prev => prev.filter(l => l.id !== outboundId))
      setParaProspectar(prev => [...prev, reverted])
      setCountP(prev => prev - 1)
      setCountPP(prev => prev + 1)
    }

    try {
      await undoProspected(outboundId)
    } catch {
      // Rollback
      fetchColumn('PARA_PROSPECTAR', 0)
      fetchColumn('PROSPECTADO', 0)
    } finally {
      setActionLoading(false)
    }
  }

  // Loading state
  if (authLoading || !profile) {
    return (
      <Sidebar>
        <div className="flex items-center justify-center h-full">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-[#8B0000] rounded-full animate-spin" />
        </div>
      </Sidebar>
    )
  }

  return (
    <Sidebar>
      <div className="flex flex-col h-[100dvh] overflow-hidden">
        {/* Toolbar */}
        <div className="px-6 py-4 border-b border-gray-100 bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Outbound</h1>
              <p className="text-sm text-gray-500">Prospecção ativa de leads</p>
            </div>
            <div className="flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setImportModalOpen(true)}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-sm font-medium shadow-sm"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Importar CSV
                </button>
              )}
            </div>
          </div>

          {/* Busca */}
          <div className="relative max-w-md">
            <svg className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              placeholder="Buscar por nome ou telefone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300 transition-all"
            />
          </div>
        </div>

        {/* Colunas */}
        <div className="flex-1 flex gap-4 p-4 min-h-0 overflow-hidden">
          <OutboundColumn
            title="Para Prospectar"
            status="PARA_PROSPECTAR"
            color="#2563EB"
            leads={paraProspectar}
            totalCount={countPP}
            loading={loadingPP}
            hasMore={hasMorePP}
            onLoadMore={loadMorePP}
            onProspectar={handleProspectar}
            onEnviarFunil={handleEnviarFunil}
            onDesfazer={handleDesfazer}
            onCardClick={setDetailLead}
            actionLoading={actionLoading}
            headerAction={
              <button
                onClick={() => setAddModalOpen(true)}
                className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-all"
                title="Adicionar lead manual"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            }
          />
          <OutboundColumn
            title="Prospectados"
            status="PROSPECTADO"
            color="#16A34A"
            leads={prospectados}
            totalCount={countP}
            loading={loadingP}
            hasMore={hasMoreP}
            onLoadMore={loadMoreP}
            onProspectar={handleProspectar}
            onEnviarFunil={handleEnviarFunil}
            onDesfazer={handleDesfazer}
            onCardClick={setDetailLead}
            actionLoading={actionLoading}
          />
        </div>
      </div>

      {/* Modal de Importação */}
      <ImportOutboundModal
        isOpen={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        onSuccess={() => {
          setImportModalOpen(false)
          setPagePP(0)
          fetchColumn('PARA_PROSPECTAR', 0)
        }}
        userId={profile.id}
      />

      {/* Modal de Cadastro Manual */}
      <AddOutboundLeadModal
        isOpen={addModalOpen}
        onClose={() => setAddModalOpen(false)}
        onSuccess={(newLead) => {
          setParaProspectar(prev => [...prev, newLead])
          setCountPP(prev => prev + 1)
        }}
        userId={profile.id}
      />

      {/* Modal de Detalhes */}
      <LeadOutboundDetailModal
        lead={detailLead}
        onClose={() => setDetailLead(null)}
        onUpdate={(updated) => {
          setParaProspectar(prev => prev.map(l => l.id === updated.id ? updated : l))
          setProspectados(prev => prev.map(l => l.id === updated.id ? updated : l))
          setDetailLead(updated)
        }}
      />

      {/* Modal de Transferência para Funil */}
      <TransferToFunnelModal
        lead={transferLead}
        sdrId={profile.id}
        onClose={() => setTransferLead(null)}
        onSuccess={handleTransferSuccess}
      />
    </Sidebar>
  )
}
