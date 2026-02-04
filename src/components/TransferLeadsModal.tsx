'use client'

import { useState, useEffect } from 'react'
import { Lead, Profile, getLeadsBySdr, transferAllLeadsFromSdr, transferMultipleLeads } from '@/lib/leads'
import PremiumSelect from '@/components/ui/PremiumSelect'

interface TransferLeadsModalProps {
  isOpen: boolean
  sdrs: Profile[]
  initialFromSdrId?: string | null
  onClose: () => void
  onTransferComplete: (count: number) => void
}

export default function TransferLeadsModal({
  isOpen,
  sdrs,
  initialFromSdrId,
  onClose,
  onTransferComplete
}: TransferLeadsModalProps) {
  const [fromSdrId, setFromSdrId] = useState<string>('')
  const [toSdrId, setToSdrId] = useState<string>('')
  const [leads, setLeads] = useState<Lead[]>([])
  const [selectedLeadIds, setSelectedLeadIds] = useState<Set<number>>(new Set())
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [loadingLeads, setLoadingLeads] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Inicializa com o SDR passado
  useEffect(() => {
    if (initialFromSdrId) {
      setFromSdrId(initialFromSdrId)
    }
  }, [initialFromSdrId])

  // Carrega leads quando seleciona SDR de origem
  useEffect(() => {
    if (fromSdrId) {
      loadLeadsFromSdr(fromSdrId)
    } else {
      setLeads([])
      setSelectedLeadIds(new Set())
    }
  }, [fromSdrId])

  const loadLeadsFromSdr = async (sdrId: string) => {
    setLoadingLeads(true)
    setError(null)
    try {
      const leadsData = await getLeadsBySdr(sdrId)
      setLeads(leadsData)
      setSelectedLeadIds(new Set())
    } catch (err) {
      setError('Erro ao carregar leads')
      setLeads([])
    } finally {
      setLoadingLeads(false)
    }
  }

  const toggleLeadSelection = (leadId: number) => {
    const newSelection = new Set(selectedLeadIds)
    if (newSelection.has(leadId)) {
      newSelection.delete(leadId)
    } else {
      newSelection.add(leadId)
    }
    setSelectedLeadIds(newSelection)
  }

  const selectAll = () => {
    setSelectedLeadIds(new Set(filteredLeads.map(l => l.id)))
  }

  const deselectAll = () => {
    setSelectedLeadIds(new Set())
  }

  // Filtra leads pelo termo de busca
  const filteredLeads = leads.filter(lead =>
    lead.nome.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleTransferAll = async () => {
    if (!fromSdrId || toSdrId === '') return // toSdrId being '' means none selected, toSdrId being 'null' means unassign
    
    setLoading(true)
    setError(null)
    try {
      const destinationId = toSdrId === 'unassigned' ? null : toSdrId
      const count = await transferAllLeadsFromSdr(fromSdrId, destinationId)
      onTransferComplete(count)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao transferir leads')
    } finally {
      setLoading(false)
    }
  }

  const handleTransferSelected = async () => {
    if (selectedLeadIds.size === 0 || toSdrId === '') return
    
    setLoading(true)
    setError(null)
    try {
      const destinationId = toSdrId === 'unassigned' ? null : toSdrId
      const count = await transferMultipleLeads(Array.from(selectedLeadIds), destinationId)
      onTransferComplete(count)
      onClose()
    } catch (err: any) {
      setError(err.message || 'Erro ao transferir leads')
    } finally {
      setLoading(false)
    }
  }

  const handleClose = () => {
    setFromSdrId('')
    setToSdrId('')
    setLeads([])
    setSelectedLeadIds(new Set())
    setSearchTerm('')
    setError(null)
    onClose()
  }

  if (!isOpen) return null

  const fromSdr = sdrs.find(s => s.id === fromSdrId)
  const availableDestinations = sdrs.filter(s => s.id !== fromSdrId)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col mx-4">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Transferir Leads</h2>
            <button
              onClick={handleClose}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          {/* Seleção de SDR de Origem */}
          <PremiumSelect
            label="Transferir de:"
            value={fromSdrId}
            onChange={setFromSdrId}
            placeholder="Selecione um SDR"
            options={sdrs
              .filter(s => s.role === 'sdr')
              .map(sdr => ({
                value: sdr.id,
                label: sdr.name,
                icon: (
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )
              }))}
          />

          {/* Lista de Leads */}
          {fromSdrId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Leads de {fromSdr?.name} ({leads.length})
                </label>
                {leads.length > 0 && (
                  <div className="flex gap-2">
                    <button
                      onClick={selectAll}
                      className="text-xs text-[#8B0000] hover:underline"
                    >
                      Selecionar todos
                    </button>
                    <span className="text-gray-300">|</span>
                    <button
                      onClick={deselectAll}
                      className="text-xs text-gray-500 hover:underline"
                    >
                      Limpar seleção
                    </button>
                  </div>
                )}
              </div>

              {/* Campo de Busca */}
              {leads.length > 0 && (
                <div className="relative mb-3">
                  <svg 
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="Buscar lead por nome..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B0000] focus:border-transparent transition-all text-sm"
                  />
                </div>
              )}

              {loadingLeads ? (
                <div className="text-center py-8 text-gray-500">
                  Carregando leads...
                </div>
              ) : filteredLeads.length === 0 ? (
                <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
                  {searchTerm ? 'Nenhum lead encontrado com esse nome' : 'Este SDR não possui leads atribuídos'}
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-60 overflow-y-auto">
                  {filteredLeads.map(lead => (
                    <div
                      key={lead.id}
                      onClick={() => toggleLeadSelection(lead.id)}
                      className={`flex items-center gap-3 px-4 py-3 border-b border-gray-100 last:border-b-0 cursor-pointer hover:bg-gray-50 transition-colors ${
                        selectedLeadIds.has(lead.id) ? 'bg-[#8B0000]/5' : ''
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedLeadIds.has(lead.id)}
                        onChange={() => {}}
                        className="w-4 h-4 text-[#8B0000] border-gray-300 rounded focus:ring-[#8B0000]"
                      />
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-gray-900 truncate">{lead.nome}</p>
                        <p className="text-xs text-gray-500 truncate">
                          {lead.tipo_hospedagem || 'Sem tipo'} • {lead.status_sdr || 'Novo'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {selectedLeadIds.size > 0 && (
                <p className="text-sm text-[#8B0000] mt-2">
                  {selectedLeadIds.size} lead(s) selecionado(s)
                </p>
              )}
            </div>
          )}

          {/* Seleção de SDR de Destino */}
          {fromSdrId && leads.length > 0 && (
            <PremiumSelect
              label="Transferir para:"
              value={toSdrId}
              onChange={setToSdrId}
              placeholder="Selecione o destino"
              options={[
                {
                  value: 'unassigned',
                  label: 'Ninguém (Desatribuir)',
                  icon: (
                    <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  )
                },
                ...availableDestinations
                  .filter(s => s.role === 'sdr')
                  .map(sdr => ({
                    value: sdr.id,
                    label: sdr.name,
                    icon: (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    )
                  }))
              ]}
            />
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={handleClose}
              className="px-4 py-2 text-gray-700 hover:bg-gray-200 rounded-lg transition-colors"
            >
              Cancelar
            </button>
            
            {leads.length > 0 && toSdrId && (
              <>
                <button
                  onClick={handleTransferSelected}
                  disabled={loading || selectedLeadIds.size === 0}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? 'Transferindo...' : `Transferir Selecionados (${selectedLeadIds.size})`}
                </button>
                <button
                  onClick={handleTransferAll}
                  disabled={loading}
                  className="px-4 py-2 bg-[#8B0000] text-white rounded-lg hover:bg-[#6B0000] transition-colors disabled:opacity-50"
                >
                  {loading ? 'Transferindo...' : `Transferir Todos (${leads.length})`}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
