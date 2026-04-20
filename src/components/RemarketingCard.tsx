'use client'

import React from 'react'
import { RemarketingLead, StatusRemarketing, FonteRemarketing } from '@/lib/remarketing'

const FONTE_LABELS: Record<FonteRemarketing, { label: string; color: string }> = {
  google_maps: { label: 'Maps', color: 'bg-red-100 text-red-700' },
  indicacao: { label: 'Indicação', color: 'bg-purple-100 text-purple-700' },
  linkedin: { label: 'LinkedIn', color: 'bg-blue-100 text-blue-700' },
  outros: { label: 'Outros', color: 'bg-gray-100 text-gray-600' },
}

interface RemarketingCardProps {
  lead: RemarketingLead
  isDragging?: boolean
  onClick?: (lead: RemarketingLead) => void
  onDelete?: (id: number) => void
}

export default function RemarketingCard({ lead, isDragging, onClick, onDelete }: RemarketingCardProps) {
  const whatsappLink = `https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`

  return (
    <div 
      className={`bg-white rounded-xl border border-gray-100 shadow-sm p-4 group ${onClick ? 'cursor-pointer' : ''} ${isDragging ? 'shadow-xl ring-2 ring-blue-400 rotate-2 opacity-90' : 'hover:shadow-md transition-all duration-200'}`}
      onClick={(e) => {
        if (onClick) {
          e.stopPropagation()
          onClick(lead)
        }
      }}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-gray-900 text-sm truncate">
            {lead.nome_empresa || lead.nome}
          </h3>
          {lead.nome_empresa && (
            <p className="text-xs text-gray-500 truncate">{lead.nome}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${FONTE_LABELS[lead.fonte_remarketing]?.color || 'bg-gray-100 text-gray-600'}`}>
            {FONTE_LABELS[lead.fonte_remarketing]?.label || lead.fonte_remarketing}
          </span>
          {onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDelete(lead.id)
              }}
              className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors pointer-events-auto"
              title="Deletar lead"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
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
            className="inline-flex items-center gap-1.5 text-xs text-green-700 bg-green-50 hover:bg-green-100 px-2.5 py-1.5 rounded-lg transition-colors font-medium pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
             WhatsApp
          </a>
          {lead.link_perfil && (
             <a
               href={lead.link_perfil}
               target="_blank"
               rel="noopener noreferrer"
               className="inline-flex items-center gap-1 text-xs text-blue-600 bg-blue-50 hover:bg-blue-100 px-2 py-1.5 rounded-lg transition-colors font-medium pointer-events-auto"
               onClick={(e) => e.stopPropagation()}
               title="Ver perfil / fonte"
             >
               Perfil
             </a>
           )}
        </div>
      </div>
    </div>
  )
}
