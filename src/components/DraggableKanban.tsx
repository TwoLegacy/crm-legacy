'use client'

import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import { Lead } from '@/lib/leads'
import { ColunaGlobal, CORES_COLUNAS } from '@/lib/kanban'
import LeadCard from './LeadCard'

interface DraggableKanbanColumnProps {
  id: string
  titulo: string
  leads: Lead[]
  cor?: string
  isAdmin?: boolean
  isComunidade?: boolean
  onPuxarParaMim?: (leadId: number) => void
  onAtribuir?: (leadId: number) => void
  onEncaminhar?: (leadId: number) => void
  onVoltar?: (leadId: number) => void
  onVendeu?: (leadId: number) => void
  onDevolver?: (leadId: number) => void
}

export function DraggableKanbanColumn({
  id,
  titulo,
  leads,
  cor,
  isAdmin = false,
  isComunidade = false,
  onPuxarParaMim,
  onAtribuir,
  onEncaminhar,
  onVoltar,
  onVendeu,
  onDevolver,
}: DraggableKanbanColumnProps) {
  const corColuna = cor || CORES_COLUNAS[titulo as ColunaGlobal] || '#8B0000'

  return (
    <div className="flex flex-col bg-white rounded-2xl shadow-sm border border-gray-100 min-w-[420px] max-w-[480px] flex-1 overflow-hidden">
      {/* Header da coluna */}
      <div 
        className="p-4"
        style={{ backgroundColor: corColuna }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white text-lg">{titulo}</h2>
          <span className="bg-white/25 text-white text-sm font-medium px-3 py-1 rounded-full">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Área droppable */}
      <Droppable droppableId={id}>
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[200px] transition-colors duration-200 ${
              snapshot.isDraggingOver ? 'bg-gray-50' : 'bg-gray-50/50'
            }`}
          >
            {leads.length === 0 ? (
              <div className="text-center text-gray-400 py-12">
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
                <p className="text-sm">Arraste leads para cá</p>
              </div>
            ) : (
              leads.map((lead, index) => (
                <Draggable key={lead.id} draggableId={String(lead.id)} index={index}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      {...provided.dragHandleProps}
                      className={`transition-transform ${snapshot.isDragging ? 'rotate-2 scale-105' : ''}`}
                    >
                      <LeadCard
                        lead={lead}
                        isAdmin={isAdmin}
                        isComunidade={isComunidade}
                        onPuxarParaMim={onPuxarParaMim}
                        onAtribuir={onAtribuir}
                        onEncaminhar={onEncaminhar}
                        onVoltar={onVoltar}
                        onVendeu={onVendeu}
                        onDevolver={onDevolver}
                      />
                    </div>
                  )}
                </Draggable>
              ))
            )}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </div>
  )
}

interface DraggableKanbanBoardProps {
  children: React.ReactNode
  onDragEnd: (result: DropResult) => void
}

export function DraggableKanbanBoard({ children, onDragEnd }: DraggableKanbanBoardProps) {
  return (
    <DragDropContext onDragEnd={onDragEnd}>
      <div className="flex gap-5 overflow-x-auto pb-4 px-1">
        {children}
      </div>
    </DragDropContext>
  )
}
