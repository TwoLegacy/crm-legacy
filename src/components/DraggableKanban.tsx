'use client'

import React, { useState, useMemo } from 'react'
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragOverEvent,
  DragEndEvent,
  defaultDropAnimationSideEffects,
  pointerWithin,
  rectIntersection,
  getFirstCollision,
} from '@dnd-kit/core'
import {
  useSortable,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { CSS } from '@dnd-kit/utilities'
import { Lead } from '@/lib/leads'
import { ColunaGlobal, CORES_COLUNAS } from '@/lib/kanban'
import LeadCard from './LeadCard'

// --- Componente de Item Agarrável (Card) ---
interface SortableLeadCardProps {
  lead: Lead
  isAdmin?: boolean
  isComunidade?: boolean
  isCloserView?: boolean
  onPuxarParaMim?: (leadId: number) => void
  onAtribuir?: (leadId: number) => void
  onEncaminhar?: (leadId: number) => void
  onVoltar?: (leadId: number) => void
  onVendeu?: (leadId: number) => void
  onDevolver?: (leadId: number) => void
  onDeletar?: (leadId: number) => void
}

function SortableLeadCard({ lead, ...props }: SortableLeadCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: lead.id,
    data: {
      type: 'Lead',
      lead,
    }
  })

  // Estilo do card enquanto ele é arrastado (deixa o original opaco na coluna)
  const style = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
    zIndex: isDragging ? 100 : 'auto',
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing touch-none transition-all duration-200 ${
        isDragging ? 'z-50' : ''
      }`}
    >
      <LeadCard lead={lead} {...props} isDragging={isDragging} />
    </div>
  )
}

// --- Componente de Coluna ---
interface DraggableKanbanColumnProps {
  id: string
  titulo: string
  leads: Lead[]
  cor?: string
  isAdmin?: boolean
  isComunidade?: boolean
  isCloserView?: boolean
  onPuxarParaMim?: (leadId: number) => void
  onAtribuir?: (leadId: number) => void
  onEncaminhar?: (leadId: number) => void
  onVoltar?: (leadId: number) => void
  onVendeu?: (leadId: number) => void
  onDevolver?: (leadId: number) => void
  onDeletar?: (leadId: number) => void
}

export function DraggableKanbanColumn({
  id,
  titulo,
  leads,
  cor,
  ...props
}: DraggableKanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: id,
    data: {
      type: 'Column',
    }
  });

  const corColuna = cor || CORES_COLUNAS[titulo as ColunaGlobal] || '#8B0000'

  return (
    <div 
      ref={setNodeRef}
      className={`flex flex-col bg-white rounded-2xl shadow-sm border-2 transition-all duration-200 w-[320px] shrink-0 overflow-hidden h-full ${
        isOver ? 'border-blue-400 ring-2 ring-blue-100 shadow-lg scale-[1.01]' : 'border-gray-100'
      }`}
    >
      {/* Header */}
      <div 
        className="p-4 flex-shrink-0"
        style={{ backgroundColor: corColuna }}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-white text-lg truncate pr-2">{titulo}</h2>
          <span className="bg-white/25 text-white text-sm font-medium px-3 py-1 rounded-full shrink-0">
            {leads.length}
          </span>
        </div>
      </div>

      {/* Área de Leads */}
      <div className={`flex-1 p-3 space-y-3 overflow-y-auto max-h-[calc(100vh-280px)] min-h-[200px] transition-colors duration-200 ${
        isOver ? 'bg-blue-50/30' : 'bg-gray-50/50'
      }`}>
        <SortableContext 
          id={id}
          items={leads.map(l => l.id)} 
          strategy={verticalListSortingStrategy}
        >
          {leads.length === 0 ? (
            <div className="text-center text-gray-400 py-12 pointer-events-none opacity-60">
              <svg className="w-12 h-12 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
              </svg>
              <p className="text-sm">Solte um lead aqui</p>
            </div>
          ) : (
            leads.map((lead) => (
              <SortableLeadCard 
                key={lead.id} 
                lead={lead} 
                {...props} 
              />
            ))
          )}
        </SortableContext>
      </div>
    </div>
  )
}

// --- Componente de Board ---
interface DraggableKanbanBoardProps {
  children: React.ReactNode
  onDragEnd: (result: { draggableId: string; sourceColumnId: string; destinationColumnId: string }) => void
}

export function DraggableKanbanBoard({ children, onDragEnd }: DraggableKanbanBoardProps) {
  const [activeLead, setActiveLead] = useState<Lead | null>(null)
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Como no Solven: clique curto não arrasta
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  // Estratégia de Colisão Customizada para garantir a detecção da última coluna mesmo com scroll
  const collisionStrategy = (args: any) => {
    // 1. Tenta colisão por ponta do mouse (mais precisa pro usuário)
    const collisions = pointerWithin(args);
    
    // 2. Se falhar, tenta por intersecção de retângulos (clássica)
    if (collisions.length === 0) {
      return rectIntersection(args);
    }
    
    return collisions;
  };

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    setActiveLead(active.data.current?.lead)
  }

  const handleDragEndInternal = (event: DragEndEvent) => {
    const { active, over } = event
    
    setActiveLead(null)

    if (!over) return

    const draggableId = String(active.id)
    const sourceColumnId = active.data.current?.sortable?.containerId
    
    // Detecta ID da coluna (soltou na coluna vazia ou sobre outro lead)
    const destinationColumnId = over.data.current?.sortable?.containerId || over.id

    if (sourceColumnId !== destinationColumnId) {
      onDragEnd({
        draggableId,
        sourceColumnId: String(sourceColumnId),
        destinationColumnId: String(destinationColumnId),
      })
    }
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={collisionStrategy}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEndInternal}
    >
      <div className="flex gap-4 pb-12 px-4 pr-[500px] overflow-x-auto min-w-max h-full select-none touch-pan-x scroll-smooth">
        {children}
      </div>

      <DragOverlay dropAnimation={{
        sideEffects: defaultDropAnimationSideEffects({
          styles: {
            active: {
              opacity: '0.4',
            },
          },
        }),
      }}>
        {activeLead ? (
          <div className="rotate-2 scale-[1.02] shadow-2xl opacity-90 cursor-grabbing pointer-events-none z-[1000]">
            <LeadCard lead={activeLead} isDragging={true} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
