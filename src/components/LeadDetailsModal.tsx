'use client'

import { Lead } from '@/lib/leads'
import { obterQualificacaoEColuna, CORES_COLUNAS } from '@/lib/kanban'

interface LeadDetailsModalProps {
  lead: Lead | null
  isOpen: boolean
  isComunidade?: boolean
  onClose: () => void
}

export default function LeadDetailsModal({
  lead,
  isOpen,
  isComunidade = false,
  onClose,
}: LeadDetailsModalProps) {
  if (!isOpen || !lead) return null

  const { qualificacao, coluna } = obterQualificacaoEColuna(
    lead.tipo_hospedagem,
    lead.faturamento_medio,
    lead.fonte
  )
  
  const corColuna = CORES_COLUNAS[coluna]
  
  // Determina o tipo de hospedagem a exibir
  const tipoHospedagemDisplay = 
    (lead.tipo_hospedagem?.toLowerCase() === 'outros' && lead.outros_hospedagem) 
      ? `Outros (${lead.outros_hospedagem})`
      : lead.tipo_hospedagem

  // Verifica se é lead do Site
  const isSite = lead.fonte?.toLowerCase() === 'site'

  // Verifica se o campo instagram é na verdade um website
  const isWebsite = (value: string | null): boolean => {
    if (!value) return false
    const lowerValue = value.toLowerCase()
    return lowerValue.includes('.com') || lowerValue.includes('.com.br') || lowerValue.includes('www') || lowerValue.includes('http')
  }

  const instagramIsWebsite = isWebsite(lead.instagram)

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Helper para formatar texto com pipes (|) em lista
  const formatListText = (text: string | null | undefined) => {
    if (!text) return null
    
    if (text.includes('|')) {
      return (
        <div className="flex flex-col gap-1.5 mt-1">
          {text.split('|').map((item, index) => {
            const trimmed = item.trim()
            if (!trimmed) return null
            return (
              <div key={index} className="flex items-start gap-2">
                <div className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 flex-shrink-0" />
                <span>{trimmed}</span>
              </div>
            )
          })}
        </div>
      )
    }
    return text
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header colorido */}
        <div 
          className="p-5"
          style={{ backgroundColor: corColuna }}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2.5 py-0.5 bg-white/20 text-white text-xs font-semibold rounded-full">
                  {qualificacao}
                </span>
                {lead.fonte === 'comunidade' && (
                  <span className="px-2.5 py-0.5 bg-sky-500 text-white text-xs font-semibold rounded-full">
                    COMUNIDADE
                  </span>
                )}
                {isSite && (
                  <span className="px-2.5 py-0.5 bg-orange-500 text-white text-xs font-semibold rounded-full flex items-center gap-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                    SITE
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold text-white">{lead.nome}</h2>
              <p className="text-white/70 text-sm mt-1">
                Criado em {formatDate(lead.created_at)}
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div className="p-5 space-y-5 overflow-y-auto max-h-[60vh]">
          
          {/* Informações de Contato */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
              </svg>
              Contato
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {lead.whatsapp && (
                <a
                  href={`https://wa.me/${lead.whatsapp_formatado || lead.whatsapp?.replace(/\D/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 p-3 bg-green-50 rounded-xl hover:bg-green-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">WhatsApp</p>
                    <p className="text-sm font-medium text-green-700 group-hover:underline">{lead.whatsapp}</p>
                  </div>
                </a>
              )}
              
              {lead.instagram && (
                instagramIsWebsite ? (
                  <a
                    href={lead.instagram.startsWith('http') ? lead.instagram : `https://${lead.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl hover:bg-blue-100 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Website</p>
                      <p className="text-sm font-medium text-blue-700 group-hover:underline">{lead.instagram}</p>
                    </div>
                  </a>
                ) : (
                  <a
                    href={`https://instagram.com/${lead.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-3 p-3 bg-pink-50 rounded-xl hover:bg-pink-100 transition-colors group"
                  >
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 via-pink-500 to-orange-500 rounded-full flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Instagram</p>
                      <p className="text-sm font-medium text-pink-700 group-hover:underline">{lead.instagram}</p>
                    </div>
                  </a>
                )
              )}
              
              {/* Email - leads do site */}
              {lead.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors group"
                >
                  <div className="w-10 h-10 bg-gray-500 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">E-mail</p>
                    <p className="text-sm font-medium text-gray-700 group-hover:underline">{lead.email}</p>
                  </div>
                </a>
              )}
            </div>
          </section>

          {/* Informações do Espaço */}
          <section>
            <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              Sobre o Espaço
            </h3>
            <div className="bg-gray-50 rounded-xl p-4 space-y-3">
              {/* Nome da hospedagem - leads do site */}
              {lead.nome_hospedagem && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Nome do espaço</span>
                  <span className="text-sm font-medium text-gray-900">{lead.nome_hospedagem}</span>
                </div>
              )}
              
              {tipoHospedagemDisplay && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Tipo de espaço</span>
                  <span className="text-sm font-medium text-gray-900">{tipoHospedagemDisplay}</span>
                </div>
              )}
              
              {lead.qtd_quartos_hospedagens && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Quantidade de quartos</span>
                  <span className="text-sm font-medium text-gray-900">{lead.qtd_quartos_hospedagens}</span>
                </div>
              )}
              
              {lead.faturamento_medio && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Faturamento médio</span>
                  <span className="text-sm font-medium text-gray-900">{lead.faturamento_medio}</span>
                </div>
              )}
              
              {/* Investimento em marketing - leads do site */}
              {lead.investimento_mkt && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">Investimento em marketing</span>
                  <span className="text-sm font-medium text-gray-900">{lead.investimento_mkt}</span>
                </div>
              )}
            </div>
          </section>

          {/* Campos específicos de Comunidade */}
          {((lead.fonte?.toLowerCase() === 'comunidade') || isComunidade || lead.maior_desafio) && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-sky-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Informações da Comunidade
              </h3>
              <div className="bg-sky-50 rounded-xl p-4 space-y-4">
                {lead.maior_desafio && (
                  <div>
                    <p className="text-xs text-sky-600 font-medium mb-1">Qual seu maior desafio?</p>
                    <div className="text-sm text-gray-900">{formatListText(lead.maior_desafio)}</div>
                  </div>
                )}
                
                {lead.ja_tentou_de_tudo && (
                  <div>
                    <p className="text-xs text-sky-600 font-medium mb-1">Já tentou de tudo?</p>
                    <div className="text-sm text-gray-900">{formatListText(lead.ja_tentou_de_tudo)}</div>
                  </div>
                )}
                
                {lead.melhorar_primeiro && (
                  <div>
                    <p className="text-xs text-sky-600 font-medium mb-1">O que quer melhorar primeiro?</p>
                    <div className="text-sm text-gray-900">{formatListText(lead.melhorar_primeiro)}</div>
                  </div>
                )}
                
                {lead.falta_destravar && (
                  <div className="bg-amber-50 p-3 rounded-lg border border-amber-100">
                    <p className="text-xs text-amber-700 font-medium mb-1 flex items-center gap-1.5">
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                      </svg>
                      O que falta destravar?
                    </p>
                    <div className="text-sm text-gray-900">{formatListText(lead.falta_destravar)}</div>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* Status */}
          {lead.status_sdr && (
            <section>
              <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Status
              </h3>
              <div className={`inline-flex items-center px-3 py-1.5 rounded-full text-sm font-medium ${
                lead.status_sdr === 'ENCAMINHADO_REUNIAO' 
                  ? 'bg-emerald-100 text-emerald-700'
                  : lead.status_sdr === 'VENDEU'
                    ? 'bg-green-100 text-green-700'
                    : 'bg-gray-100 text-gray-700'
              }`}>
                {lead.status_sdr === 'MEUS_LEADS' 
                  ? 'Em atendimento' 
                  : lead.status_sdr === 'ENCAMINHADO_REUNIAO' 
                    ? 'Encaminhado para reunião'
                    : lead.status_sdr === 'VENDEU'
                      ? 'Vendido'
                      : lead.status_sdr
                }
              </div>
            </section>
          )}
        </div>

        {/* Footer com botões de ação */}
        <div className="p-4 border-t border-gray-100 bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
