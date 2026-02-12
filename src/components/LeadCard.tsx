'use client'

import { useState, Fragment } from 'react'
import { Lead } from '@/lib/leads'
import { obterQualificacaoEColuna, CORES_COLUNAS } from '@/lib/kanban'
import LeadDetailsModal from './LeadDetailsModal'
import ConfirmModal from './ConfirmModal'

interface LeadCardProps {
  lead: Lead
  showActions?: boolean
  isAdmin?: boolean
  isComunidade?: boolean
  sdrName?: string
  onPuxarParaMim?: (leadId: number) => void
  onAtribuir?: (leadId: number) => void
  onGerenciar?: (lead: Lead) => void
  onEncaminhar?: (leadId: number) => void
  onVoltar?: (leadId: number) => void
  onVendeu?: (leadId: number) => void
  onDevolver?: (leadId: number) => void
  onDeletar?: (leadId: number) => void
  isDragging?: boolean
}

export default function LeadCard({
  lead,
  showActions = true,
  isAdmin = false,
  isComunidade = false,
  sdrName,
  onPuxarParaMim,
  onAtribuir,
  onGerenciar,
  onEncaminhar,
  onVoltar,
  onVendeu,
  onDevolver,
  onDeletar,
  isDragging
}: LeadCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [devolverModalOpen, setDevolverModalOpen] = useState(false)
  const [deletarModalOpen, setDeletarModalOpen] = useState(false)

  const { qualificacao, coluna } = obterQualificacaoEColuna(
    lead.tipo_hospedagem,
    lead.faturamento_medio,
    lead.fonte
  )
  
  const corColuna = CORES_COLUNAS[coluna]
  
  // Usa o nome da coluna para exibição (Nível 1, Nível 2, etc.)
  const qualificacaoDisplay = coluna

  // Determina o tipo de hospedagem a exibir
  // Se tipo_hospedagem for "Outros" e tiver outros_hospedagem preenchido, usa o outros_hospedagem
  const tipoHospedagemDisplay = 
    (lead.tipo_hospedagem?.toLowerCase() === 'outros' && lead.outros_hospedagem) 
      ? lead.outros_hospedagem 
      : lead.tipo_hospedagem

  // Verifica se é lead da Comunidade
  const isComunidadeLocal = lead.fonte?.toLowerCase() === 'comunidade' || isComunidade

  // Verifica se é lead do Site
  const isSite = lead.fonte?.toLowerCase() === 'site'

  // Verifica se o campo instagram é na verdade um website
  const isWebsite = (value: string | null): boolean => {
    if (!value) return false
    const lowerValue = value.toLowerCase()
    return lowerValue.includes('.com') || lowerValue.includes('.com.br') || lowerValue.includes('www') || lowerValue.includes('http')
  }

  const instagramIsWebsite = isWebsite(lead.instagram)

  return (
    <Fragment>
      <div 
        onClick={() => !isDragging && setIsModalOpen(true)}
        className="bg-white rounded-xl shadow-sm border border-gray-100 p-4 hover:shadow-md hover:border-gray-200 transition-all duration-200 cursor-pointer group"
      >
        {/* Header com nome, qualificação e engrenagem */}
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-gray-900 text-sm leading-tight break-words flex items-center gap-2">
                {lead.nome}
                {lead.origem?.toLowerCase() === 'brasil' && (
                  <img src="/flags/br.png" alt="Brasil" className="w-5 h-auto rounded-sm border border-gray-100 flex-shrink-0" />
                )}
                {lead.origem?.toLowerCase() === 'portugal' && (
                  <img src="/flags/pt.png" alt="Portugal" className="w-5 h-auto rounded-sm border border-gray-100 flex-shrink-0" />
                )}
              </h3>
            </div>
            
            <div className="flex items-center gap-1 flex-shrink-0">
              {/* Engrenagem para gerenciar (Admin com lead atribuído) */}
              {onGerenciar && isAdmin && lead.owner_sdr_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onGerenciar(lead); }}
                  className="p-1 text-gray-400 hover:text-[#8B0000] hover:bg-gray-100 rounded-lg transition-all"
                  title="Gerenciar lead"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
              )}
              {/* Lixeira para deletar (Admin apenas) */}
              {onDeletar && isAdmin && (
                <button
                  onClick={(e) => { e.stopPropagation(); setDeletarModalOpen(true); }}
                  className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                  title="Deletar lead"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            {isSite && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-orange-500 text-white flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                SITE
              </span>
            )}
            {lead.fonte?.toLowerCase() === 'vsl' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-blue-600 text-white flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                VSL
              </span>
            )}
            {lead.fonte?.toLowerCase() === 'quiz' && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-500 text-white flex items-center gap-1">
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                QUIZ
              </span>
            )}
            <span 
              className="px-2 py-0.5 text-[10px] font-bold rounded-full text-white"
              style={{ backgroundColor: corColuna }}
            >
              {qualificacaoDisplay}
            </span>
          </div>
        </div>

        {/* SDR atribuído (se houver) */}
        {sdrName && lead.owner_sdr_id && (
          <div className="mb-2 flex items-center gap-2 px-2 py-1 bg-blue-50 rounded-lg">
            <svg className="w-3.5 h-3.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <span className="text-xs text-blue-700 font-medium">{sdrName}</span>
            {lead.status_sdr && (
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                lead.status_sdr === 'ENCAMINHADO_REUNIAO' 
                  ? 'bg-emerald-100 text-emerald-700' 
                  : lead.status_sdr === 'VENDEU'
                    ? 'bg-green-100 text-green-700'
                    : lead.status_sdr === 'QUALIFICACAO'
                      ? 'bg-blue-100 text-blue-700'
                      : lead.status_sdr === 'PERTO_REUNIAO'
                        ? 'bg-indigo-100 text-indigo-700'
                        : 'bg-gray-100 text-gray-600'
              }`}>
                {lead.status_sdr === 'ENCAMINHADO_REUNIAO' ? 'Reunião' : 
                 lead.status_sdr === 'VENDEU' ? 'Vendido' : 
                 lead.status_sdr === 'QUALIFICACAO' ? 'Qualificação' : 
                 lead.status_sdr === 'PERTO_REUNIAO' ? 'Perto de reunião' : 'Novo'}
              </span>
            )}
          </div>
        )}

        {/* Informações do lead */}
        <div className="space-y-1.5 text-sm text-gray-600 mb-3">
          {lead.whatsapp && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-green-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
              </div>
              <a 
                href={`https://wa.me/${lead.whatsapp_formatado || lead.whatsapp?.replace(/\D/g, '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-green-600 hover:text-green-700 hover:underline truncate"
                onClick={(e) => e.stopPropagation()}
              >
                {lead.whatsapp}
              </a>
            </div>
          )}

          {tipoHospedagemDisplay && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <span className="text-xs truncate">{tipoHospedagemDisplay}</span>
            </div>
          )}

          {/* Campos específicos de comunidade */}
          {isComunidadeLocal && lead.maior_desafio && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-sky-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-sky-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                </svg>
              </div>
              <span className="text-xs truncate text-sky-700">{lead.maior_desafio}</span>
            </div>
          )}

          {isComunidadeLocal && lead.falta_destravar && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <span className="text-xs truncate text-amber-700">{lead.falta_destravar}</span>
            </div>
          )}

          {/* Faturamento só para leads gerais */}
          {!isComunidadeLocal && lead.faturamento_medio && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-gray-100 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs truncate">{lead.faturamento_medio}</span>
            </div>
          )}

          {/* Instagram ou Website - só para leads gerais */}
          {!isComunidadeLocal && lead.instagram && (
            <div className="flex items-center gap-2">
              {instagramIsWebsite ? (
                <>
                  {/* É um Website */}
                  <div className="w-4 h-4 rounded-full bg-blue-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                    </svg>
                  </div>
                  <a 
                    href={lead.instagram.startsWith('http') ? lead.instagram : `https://${lead.instagram}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-blue-600 hover:text-blue-700 hover:underline truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.instagram}
                  </a>
                </>
              ) : (
                <>
                  {/* É Instagram */}
                  <div className="w-4 h-4 rounded-full bg-pink-100 flex items-center justify-center flex-shrink-0">
                    <svg className="w-2.5 h-2.5 text-pink-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </div>
                  <a 
                    href={`https://instagram.com/${lead.instagram.replace('@', '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-pink-600 hover:text-pink-700 hover:underline truncate"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {lead.instagram}
                  </a>
                </>
              )}
            </div>
          )}

          {lead.fonte?.toLowerCase() === 'vsl' && lead.valor_diaria && (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-2.5 h-2.5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-xs truncate text-blue-700 font-medium">Diária: R$ {lead.valor_diaria}</span>
            </div>
          )}

          {/* Botões de ação */}
          {/* Botões de ação */}
          {showActions && (
            <div className="flex flex-wrap gap-2 pt-2 border-t border-gray-100">
              {/* Botões para Kanban Global - Lead não atribuído */}
              {onPuxarParaMim && !lead.owner_sdr_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onPuxarParaMim(lead.id); }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-[#8B0000] to-[#A52A2A] hover:from-[#6B0000] hover:to-[#8B0000] rounded-lg transition-all"
                >
                  Puxar pra mim
                </button>
              )}

              {onAtribuir && isAdmin && !lead.owner_sdr_id && (
                <button
                  onClick={(e) => { e.stopPropagation(); onAtribuir(lead.id); }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-[#8B0000] bg-white border border-[#8B0000] hover:bg-[#8B0000] hover:text-white rounded-lg transition-all"
                >
                  Atribuir
                </button>
              )}

              {/* Navegação via Setas (Novo Fluxo SDR) */}
              {lead.status_sdr && !isComunidadeLocal && lead.status_sdr !== 'VENDEU' && (
                <div className="flex items-center gap-2 w-full">
                  {/* Botão Voltar (Esquerda) */}
                  {lead.status_sdr !== 'MEUS_LEADS' && onVoltar && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onVoltar(lead.id); }}
                      className="p-2 text-gray-500 hover:text-[#8B0000] hover:bg-red-50 rounded-lg transition-all border border-gray-200"
                      title="Voltar fase"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                      </svg>
                    </button>
                  )}
                  
                  {/* Espaçador ou Botão Devolver */}
                  <div className="flex-1 flex justify-center">
                   {onDevolver && lead.status_sdr === 'MEUS_LEADS' && (
                    <button
                      onClick={(e) => { 
                        e.stopPropagation(); 
                        setDevolverModalOpen(true);
                      }}
                      className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-all"
                      title="Devolver lead"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                         <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                      </svg>
                    </button>
                   )}
                  </div>

                  {/* Botão Avançar (Direita) */}
                  {lead.status_sdr !== 'ENCAMINHADO_REUNIAO' && onEncaminhar && (
                    <button
                      onClick={(e) => { e.stopPropagation(); onEncaminhar(lead.id); }}
                      className="px-4 py-2 flex-grow-0 bg-[#8B0000] text-white hover:bg-[#6B0000] rounded-lg transition-all flex items-center gap-2 text-xs font-medium justify-center"
                      title="Avançar fase"
                    >
                      Avançar
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  )}
                </div>
              )}

              {/* Botões para Kanban Comunidade (Mantidos originais) */}
              {onVendeu && lead.status_sdr === 'MEUS_LEADS' && isComunidadeLocal && (
                <button
                  onClick={(e) => { e.stopPropagation(); onVendeu(lead.id); }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-white bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 rounded-lg transition-all"
                >
                  Marcar como Vendeu
                </button>
              )}

              {onVoltar && lead.status_sdr === 'VENDEU' && isComunidadeLocal && (
                <button
                  onClick={(e) => { e.stopPropagation(); onVoltar(lead.id); }}
                  className="flex-1 px-3 py-1.5 text-xs font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-all"
                >
                  Voltar para meus leads
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <LeadDetailsModal 
        lead={lead}
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        isComunidade={isComunidadeLocal}
      />

      <ConfirmModal
        isOpen={devolverModalOpen}
        title="Devolver Lead"
        message="Tem certeza que deseja devolver este lead para a fila geral? Ele ficará disponível para outros SDRs."
        confirmLabel="Devolver Lead"
        cancelLabel="Cancelar"
        onConfirm={() => {
            if (onDevolver) onDevolver(lead.id);
            setDevolverModalOpen(false);
        }}
        onCancel={() => setDevolverModalOpen(false)}
        variant="danger"
      />

      <ConfirmModal
        isOpen={deletarModalOpen}
        title="Deletar Lead Permanentemente"
        message={`Tem certeza que deseja DELETAR o lead "${lead.nome}"? Esta ação é IRREVERSÍVEL e o lead será removido do sistema.`}
        confirmLabel="Deletar Permanentemente"
        cancelLabel="Cancelar"
        onConfirm={() => {
            if (onDeletar) onDeletar(lead.id);
            setDeletarModalOpen(false);
        }}
        onCancel={() => setDeletarModalOpen(false)}
        variant="danger"
      />
    </Fragment>
  )
}
