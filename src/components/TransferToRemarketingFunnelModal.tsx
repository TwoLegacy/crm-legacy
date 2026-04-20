'use client'

import { useState, useEffect } from 'react'
import { RemarketingLead, FonteRemarketing, transferToFunnel, reactivateLead, checkLeadExistsInCRM } from '@/lib/remarketing'
import { createClient } from '@/lib/supabaseClient'
import PremiumSelect from '@/components/ui/PremiumSelect'

interface ProfileBase {
  id: string
  name: string
  role: string
}

interface TransferToRemarketingFunnelModalProps {
  lead: RemarketingLead | null
  sdrId: string
  onClose: () => void
  onSuccess: (remarketingId: number, newLeadId: number) => void
}

const FONTE_LABELS: Record<FonteRemarketing, string> = {
  google_maps: 'Google Maps',
  indicacao: 'Indicação',
  linkedin: 'LinkedIn',
  outros: 'Outros',
}

const TARGET_STATUSES = [
  { value: 'MEUS_LEADS', label: 'Aguardando Atendimento', color: 'bg-gray-100 text-gray-700' },
  { value: 'PROSPECTADOS', label: 'Em Follow Up', color: 'bg-blue-100 text-blue-700' },
  { value: 'QUALIFICACAO', label: 'Em Qualificação', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'PERTO_REUNIAO', label: 'Esquentando para Reunião', color: 'bg-orange-100 text-orange-700' },
  { value: 'ENCAMINHADO_REUNIAO', label: 'Reunião Agendada (Closer)', color: 'bg-emerald-100 text-emerald-700' },
]

export default function TransferToRemarketingFunnelModal({ lead, sdrId, onClose, onSuccess }: TransferToRemarketingFunnelModalProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Status e Setup
  const [tipoLead, setTipoLead] = useState<'assessoria' | 'ia'>('assessoria')
  const [targetStatus, setTargetStatus] = useState<string>('MEUS_LEADS')
  const [selectedCloserId, setSelectedCloserId] = useState<string>('')
  
  // Checking existing lead
  const [checkingLead, setCheckingLead] = useState(true)
  const [existingLead, setExistingLead] = useState<any>(null)

  const [closers, setClosers] = useState<ProfileBase[]>([])

  // Busca dados de especialistas e checa o lead
  useEffect(() => {
    if (!lead) return

    let mounted = true

    async function loadData() {
      setCheckingLead(true)
      const supabase = createClient()
      
      // Busca Closers (Especialistas)
      const { data: closersData } = await supabase
        .from('profiles')
        .select('id, name, role')
        .eq('role', 'closer')
      
      if (mounted && closersData) {
        setClosers(closersData)
      }

      // Check duplicata no CRM
      if (!lead) return
      const result = await checkLeadExistsInCRM(lead.whatsapp, lead.lead_id_principal)
      if (mounted) {
        setExistingLead(result.lead)
        setCheckingLead(false)
      }
    }

    loadData()
    return () => { mounted = false }
  }, [lead])

  if (!lead) return null

  const handleAction = async () => {
    if (targetStatus === 'ENCAMINHADO_REUNIAO' && !selectedCloserId) {
      setError('Selecione um Especialista (Closer) para esta reunião.')
      return
    }

    setLoading(true)
    setError(null)

    try {
      let resultLeadId: number;

      if (existingLead) {
        // Modo RECUPERAÇÃO INJETÁVEL
        resultLeadId = await reactivateLead(
          lead.id,
          existingLead.id,
          sdrId,
          targetStatus,
          targetStatus === 'ENCAMINHADO_REUNIAO' ? selectedCloserId : null
        )
      } else {
        // Modo NOVO LEAD CRIAÇÃO DEFAULT
        resultLeadId = await transferToFunnel(
          lead.id,
          sdrId,
          tipoLead,
          targetStatus,
          targetStatus === 'ENCAMINHADO_REUNIAO' ? selectedCloserId : null
        )
      }

      onSuccess(lead.id, resultLeadId)
    } catch (err: any) {
      console.error('Erro na ação:', err)
      setError(err?.message || 'Erro ao processar este lead. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  const getStatusLabel = (status: string) => {
    const s = TARGET_STATUSES.find(t => t.value === status)
    return s ? s.label : status
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-visible animate-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
        
        {/* Header Dinâmico Baseado no Contexto */}
        <div className={`px-6 py-4 flex-shrink-0 border-b border-gray-100 flex items-center justify-between rounded-t-2xl ${existingLead ? 'bg-amber-50/80' : 'bg-emerald-50/80'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${existingLead ? 'bg-amber-100 text-amber-600' : 'bg-emerald-100 text-emerald-600'}`}>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={existingLead ? "M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" : "M13 7l5 5m0 0l-5 5m5-5H6"} />
              </svg>
            </div>
            <div>
              <h2 className={`text-lg font-bold ${existingLead ? 'text-amber-900' : 'text-emerald-900'}`}>
                {existingLead ? 'Ressuscitar Lead' : 'Enviar para o Funil Outbound'}
              </h2>
              <p className={`text-xs ${existingLead ? 'text-amber-700' : 'text-emerald-700/80'}`}>
                {existingLead ? 'Lead já consta no Banco Central' : 'Criar como lead novinho no CRM'}
              </p>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-5 overflow-visible pb-12">
          {error && (
             <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
               <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
               </svg>
               {error}
             </div>
          )}

          {/* Estado de Checagem */}
          {checkingLead && (
             <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
               <div className="w-4 h-4 rounded-full border-2 border-gray-300 border-t-gray-600 animate-spin" />
               <span className="text-sm font-medium text-gray-500">Inspecionando banco de dados...</span>
             </div>
          )}

          {/* O ALERTA (The Magic Phase) */}
          {!checkingLead && existingLead && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
              <h3 className="font-bold text-amber-900 text-sm flex items-center gap-1.5 mb-1">
                 Este Lead Já Existe no CRM Principal!
              </h3>
              <p className="text-sm text-amber-800/80 leading-relaxed mb-3">
                 Encontramos este lead no sistema. Se você proceguir, <strong>você roubará a titularidade dele para você</strong>, ao invés de duplicá-lo.
              </p>
              
              <div className="bg-white/60 border border-amber-100 rounded-lg p-3 text-sm flex gap-4">
                <div className="flex-1">
                  <span className="block text-[10px] uppercase font-bold text-amber-600 mb-0.5">Dono Atual no Banco</span>
                  <span className="font-semibold text-gray-900">{existingLead.profiles?.name || 'Sem Dono'}</span>
                </div>
                <div className="flex-1 border-l border-amber-200/60 pl-4">
                  <span className="block text-[10px] uppercase font-bold text-amber-600 mb-0.5">Coluna Antiga</span>
                  <span className="font-medium text-gray-700">{getStatusLabel(existingLead.status_sdr || '???')}</span>
                </div>
              </div>
            </div>
          )}

          {/* Resumo do Lead */}
          <div className="bg-gray-50 border border-gray-100 rounded-xl p-4 space-y-3">
             <div className="flex items-center justify-between">
               <h3 className="font-semibold text-gray-900">{lead.nome}</h3>
             </div>
             {lead.nome_empresa && (
               <p className="text-sm text-gray-600">{lead.nome_empresa}</p>
             )}
             <p className="text-sm text-gray-700 font-medium font-mono">{lead.whatsapp}</p>
          </div>

          <hr className="border-gray-100" />

          {/* Campos de Destino Dinâmico */}
          <div className="space-y-4">
            
            {/* Escolha a Coluna */}
            <div>
              <PremiumSelect
                options={TARGET_STATUSES.map(s => ({ value: s.value, label: s.label }))}
                value={targetStatus}
                onChange={(val) => setTargetStatus(val)}
                label="Para qual etapa enviar o lead agora?"
              />
            </div>

            {/* SE a Coluna for Agendados -> Escolha o Closer */}
            {targetStatus === 'ENCAMINHADO_REUNIAO' && (
              <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-100 animate-in slide-in-from-top-1 fade-in duration-200">
                <PremiumSelect
                  options={closers.map(c => ({ value: c.id, label: c.name }))}
                  value={selectedCloserId}
                  onChange={(val) => setSelectedCloserId(val)}
                  label="Dono da Call (Closer)"
                  placeholder="Selecione o Especialista..."
                />
              </div>
            )}

            {/* SE for lead totalmente novo -> Escolhe IA ou Assessoria */}
            {!checkingLead && !existingLead && (
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-1.5">Qual o pilar do serviço (Novo Lead)?</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTipoLead('assessoria')}
                    className={`flex items-center justify-center p-2 rounded-lg border text-sm font-medium transition-all ${
                      tipoLead === 'assessoria'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Assessoria
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipoLead('ia')}
                    className={`flex items-center justify-center p-2 rounded-lg border text-sm font-medium transition-all ${
                      tipoLead === 'ia'
                        ? 'border-zinc-800 bg-zinc-50 text-zinc-900'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    Setor IA
                  </button>
                </div>
              </div>
            )}
            
          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3 mt-auto">
           <button
             onClick={onClose}
             disabled={loading}
             className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all text-sm font-medium disabled:opacity-50"
           >
             Cancelar
           </button>
           <button
             onClick={handleAction}
             disabled={loading || checkingLead}
             className={`px-6 py-2.5 rounded-xl text-white transition-all text-sm font-bold shadow-sm disabled:opacity-50 flex items-center gap-2 ${
               existingLead ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'
             }`}
           >
             {loading ? (
               <>
                 <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                 Processando...
               </>
             ) : (
               <>
                 {existingLead ? 'Tomar Lead e Recuperar' : 'Confirmar Transferência'}
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d={existingLead ? "M5 13l4 4L19 7" : "M13 7l5 5m0 0l-5 5m5-5H6"} />
                 </svg>
               </>
             )}
           </button>
        </div>
      </div>
    </div>
  )
}
