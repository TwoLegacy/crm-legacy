'use client'

import { useState } from 'react'
import { OutboundLead, FonteOutbound, transferToFunnel } from '@/lib/outbound'

interface TransferToFunnelModalProps {
  lead: OutboundLead | null
  sdrId: string
  onClose: () => void
  onSuccess: (outboundId: number, newLeadId: number) => void
}

const FONTE_LABELS: Record<FonteOutbound, string> = {
  google_maps: 'Google Maps',
  indicacao: 'Indicação',
  linkedin: 'LinkedIn',
  outros: 'Outros',
}

export default function TransferToFunnelModal({ lead, sdrId, onClose, onSuccess }: TransferToFunnelModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [tipoLead, setTipoLead] = useState<'assessoria' | 'ia'>('assessoria')

  if (!lead) return null

  const handleTransfer = async () => {
    setLoading(true)
    setError(null)

    try {
      const newLeadId = await transferToFunnel(lead.id, sdrId, tipoLead)
      onSuccess(lead.id, newLeadId)
    } catch (err: any) {
      console.error('Erro na transferência:', err)
      setError(err?.message || 'Erro ao transferir lead para o funil. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center gap-3 bg-emerald-50/50">
          <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </div>
          <div>
            <h2 className="text-lg font-bold text-gray-900">Enviar para o Funil SDR</h2>
            <p className="text-xs text-gray-500">O lead será criado no seu Painel SDR</p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* Resumo do lead */}
          <div className="bg-gray-50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-gray-900">{lead.nome}</h3>
              <span
                className="px-2 py-0.5 text-[10px] font-bold rounded uppercase text-white"
                style={{ backgroundColor: '#F97316' }}
              >
                {FONTE_LABELS[lead.fonte_outbound]}
              </span>
            </div>

            {lead.nome_empresa && (
              <p className="text-sm text-gray-600">{lead.nome_empresa}</p>
            )}

            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>
                <p className="text-xs text-gray-400">Telefone</p>
                <p className="text-gray-700 font-medium">{lead.whatsapp}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Cidade/UF</p>
                <p className="text-gray-700">{lead.cidade_estado}</p>
              </div>
              {lead.email && (
                <div>
                  <p className="text-xs text-gray-400">E-mail</p>
                  <p className="text-gray-700 truncate">{lead.email}</p>
                </div>
              )}
              {lead.instagram && (
                <div>
                  <p className="text-xs text-gray-400">Instagram</p>
                  <p className="text-gray-700">{lead.instagram}</p>
                </div>
              )}
            </div>
          </div>

          {/* Tipo de Lead (IA vs Assessoria) */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <label className="block text-sm font-medium text-gray-900 mb-3">Qual é o tipo de serviço alvo?</label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoLead('assessoria')}
                className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all ${
                  tipoLead === 'assessoria'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className={`text-sm font-bold ${tipoLead === 'assessoria' ? 'text-blue-700' : 'text-gray-700'}`}>
                  Assessoria
                </span>
              </button>

              <button
                type="button"
                onClick={() => setTipoLead('ia')}
                className={`flex flex-col items-start p-3 rounded-lg border-2 text-left transition-all ${
                  tipoLead === 'ia'
                    ? 'border-zinc-800 bg-zinc-50'
                    : 'border-gray-100 hover:border-gray-200 hover:bg-gray-50'
                }`}
              >
                <span className={`text-sm font-bold ${tipoLead === 'ia' ? 'text-zinc-900' : 'text-gray-700'}`}>
                  Inteligência Artificial
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all text-sm font-medium disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleTransfer}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50 flex items-center gap-2"
          >
            {loading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Transferindo...
              </>
            ) : (
              <>
                Confirmar transferência
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}
