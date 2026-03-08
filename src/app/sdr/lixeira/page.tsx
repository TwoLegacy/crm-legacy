'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { getLeadsInBin, restoreFromBin, deleteLead, Lead } from '@/lib/leads'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'
import ConfirmModal from '@/components/ConfirmModal'

export default function SdrLixeiraPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  const [leads, setLeads] = useState<Lead[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] = useState(false)
  const [selectedLead, setSelectedLead] = useState<{id: number, nome: string} | null>(null)

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (!profile || profile.role !== 'sdr') {
      router.replace('/login')
      return
    }

    // Se estiver tudo ok, podemos buscar
    fetchLeads(profile.id)
  }, [user, profile, authLoading, router])

  const fetchLeads = async (sdrId: string) => {
    setLoading(true)
    try {
      const data = await getLeadsInBin({ sdrId })
      setLeads(data)
      setError(null)
    } catch (err) {
      console.error('Erro ao carregar lixeira:', err)
      setError('Erro ao carregar os leads da lixeira.')
    } finally {
      setLoading(false)
    }
  }

  const handleRestore = async (id: number) => {
    setProcessingId(id)
    try {
      await restoreFromBin(id)
      setLeads(prev => prev.filter(l => l.id !== id))
      setError(null)
    } catch (err) {
      setError('Erro ao restaurar lead. Tente novamente.')
    } finally {
      setProcessingId(null)
    }
  }



  if (authLoading || (loading && leads.length === 0)) {
    return (
      <Sidebar>
        <div className="flex items-center justify-center h-screen">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B0000]"></div>
        </div>
      </Sidebar>
    )
  }

  return (
    <Sidebar>
      <div className="p-6 md:p-8 max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Lixeira de Leads</h1>
          <p className="text-gray-500 mt-1">
            Aqui estão os leads que foram excluídos. Você pode restaurá-los ou excluí-los permanentemente.
          </p>
        </header>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl flex items-center justify-between">
            <span className="text-sm font-medium">{error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {leads.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
            <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-300">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </div>
            <h2 className="text-lg font-semibold text-gray-900">A lixeira está vazia</h2>
            <p className="text-gray-500 mt-1">Nenhum lead deletado recentemente.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Lead</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">WhatsApp</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Motivo</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-500 uppercase">Excluído em</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-gray-400 uppercase text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {leads.map(lead => (
                  <tr key={lead.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">{lead.nome}</p>
                      <p className="text-xs text-gray-500">{lead.fonte?.toUpperCase()} {lead.fonte === 'comunidade' && '🏘️'}</p>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {lead.whatsapp}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={lead.motivo_exclusao || 'Sem motivo registrado'}>
                      {lead.motivo_exclusao || '-'}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {lead.deleted_at ? new Date(lead.deleted_at).toLocaleDateString('pt-BR', {
                        day: '2-digit', month: '2-digit', year: 'numeric',
                        hour: '2-digit', minute: '2-digit'
                      }) : '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => handleRestore(lead.id)}
                          disabled={processingId === lead.id}
                          className="px-3 py-1.5 bg-green-50 text-green-700 hover:bg-green-100 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Restaurar
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </Sidebar>
  )
}
