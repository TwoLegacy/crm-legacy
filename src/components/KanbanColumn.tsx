'use client'

import { ReactNode } from 'react'
import { ColunaGlobal, CORES_COLUNAS } from '@/lib/kanban'

interface KanbanColumnProps {
  titulo: string
  cor?: string
  children: ReactNode
  count?: number
}

export default function KanbanColumn({ titulo, cor, children, count }: KanbanColumnProps) {
  const corColuna = cor || CORES_COLUNAS[titulo as ColunaGlobal] || '#8B0000'
  
  return (
    <div className="flex flex-col bg-white rounded-xl shadow-sm border border-gray-100 h-full overflow-hidden">
      {/* Header da coluna */}
      <div 
        className="p-4 flex-shrink-0"
        style={{ backgroundColor: corColuna }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white text-base">{titulo}</h2>
          {count !== undefined && (
            <span className="bg-white/25 text-white text-sm font-medium px-2.5 py-0.5 rounded-full">
              {count}
            </span>
          )}
        </div>
      </div>

      {/* Corpo da coluna com scroll vertical */}
      <div className="flex-1 p-3 space-y-3 overflow-y-auto bg-gray-50/50">
        {children}
      </div>
    </div>
  )
}
