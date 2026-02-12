'use client'

import { useState, useRef, useEffect } from 'react'
import { DayPicker, DateRange } from 'react-day-picker'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import 'react-day-picker/dist/style.css'
import PremiumSelect from './ui/PremiumSelect'
import { obterQualificacaoEColuna } from '@/lib/kanban'

interface LeadFiltersProps {
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  searchTerm: string
  dateFrom: string
  dateTo: string
  tipoHospedagem: string
  origem: string
  fonte: string
  classificacao: string
}

const TIPOS_HOSPEDAGEM = [
  { value: '', label: 'Todos os tipos' },
  { value: 'Hotel, Pousada ou Resort', label: 'Hotel, Pousada ou Resort' },
  { value: 'Cabanas e Chalés', label: 'Cabanas e Chalés' },
  { value: 'Outros', label: 'Outros' },
]

export default function LeadFilters({ onFilterChange }: LeadFiltersProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [dateRange, setDateRange] = useState<DateRange | undefined>()
  const [tipoHospedagem, setTipoHospedagem] = useState('')
  const [origem, setOrigem] = useState('')
  const [fonte, setFonte] = useState('')
  const [classificacao, setClassificacao] = useState('')
  const [isCalendarOpen, setIsCalendarOpen] = useState(false)
  const calendarRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (calendarRef.current && !calendarRef.current.contains(event.target as Node)) {
        setIsCalendarOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSearchChange = (value: string) => {
    setSearchTerm(value)
    onFilterChange({
      searchTerm: value,
      dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
      tipoHospedagem,
      origem,
      fonte,
      classificacao
    })
  }

  const handleTipoHospedagemChange = (value: string) => {
    setTipoHospedagem(value)
    onFilterChange({
      searchTerm,
      dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
      tipoHospedagem: value,
      origem,
      fonte,
      classificacao
    })
  }

  const handleDateRangeSelect = (range: DateRange | undefined) => {
    setDateRange(range)
    onFilterChange({
      searchTerm,
      dateFrom: range?.from ? format(range.from, 'yyyy-MM-dd') : '',
      dateTo: range?.to ? format(range.to, 'yyyy-MM-dd') : '',
      tipoHospedagem,
      origem,
      fonte,
      classificacao
    })
  }

  const handleOrigemChange = (value: string) => {
    const newOrigem = origem === value ? '' : value
    setOrigem(newOrigem)
    onFilterChange({
      searchTerm,
      dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
      tipoHospedagem,
      origem: newOrigem,
      fonte,
      classificacao
    })
  }

  const handleFonteChange = (value: string) => {
    const newFonte = fonte === value ? '' : value
    setFonte(newFonte)
    onFilterChange({
      searchTerm,
      dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
      tipoHospedagem,
      origem,
      fonte: newFonte,
      classificacao
    })
  }

  const handleClassificacaoChange = (value: string) => {
    const newClassificacao = classificacao === value ? '' : value
    setClassificacao(newClassificacao)
    onFilterChange({
      searchTerm,
      dateFrom: dateRange?.from ? format(dateRange.from, 'yyyy-MM-dd') : '',
      dateTo: dateRange?.to ? format(dateRange.to, 'yyyy-MM-dd') : '',
      tipoHospedagem,
      origem,
      fonte,
      classificacao: newClassificacao
    })
  }

  const clearFilters = () => {
    setSearchTerm('')
    setDateRange(undefined)
    setTipoHospedagem('')
    setOrigem('')
    setFonte('')
    setClassificacao('')
    onFilterChange({ searchTerm: '', dateFrom: '', dateTo: '', tipoHospedagem: '', origem: '', fonte: '', classificacao: '' })
  }

  const hasActiveFilters = searchTerm || dateRange?.from || dateRange?.to || tipoHospedagem || origem || fonte || classificacao

  const getDateLabel = () => {
    if (!dateRange?.from) return 'Data'
    if (!dateRange?.to) return format(dateRange.from, 'dd/MM', { locale: ptBR })
    return `${format(dateRange.from, 'dd/MM', { locale: ptBR })} - ${format(dateRange.to, 'dd/MM', { locale: ptBR })}`
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Linha 1: Classificação */}
      <div className="flex items-center gap-2 overflow-x-auto py-2 no-scrollbar">
        <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mr-1">Classificação:</span>
        {[
          { id: 'Lead E', label: 'E', color: 'bg-sky-500', hover: 'hover:bg-sky-600', active: 'ring-sky-200' },
          { id: 'Lead D', label: 'D', color: 'bg-red-600', hover: 'hover:bg-red-700', active: 'ring-red-200' },
          { id: 'Lead C', label: 'C', color: 'bg-amber-500', hover: 'hover:bg-amber-600', active: 'ring-amber-200' },
          { id: 'Lead B', label: 'B', color: 'bg-emerald-500', hover: 'hover:bg-emerald-600', active: 'ring-emerald-200' },
          { id: 'Lead A', label: 'A', color: 'bg-violet-500', hover: 'hover:bg-violet-600', active: 'ring-violet-200' }
        ].map((level) => (
          <button
            key={level.id}
            onClick={() => handleClassificacaoChange(level.id)}
            className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white font-bold transition-all ${level.color} ${level.hover} ${
              classificacao === level.id ? `ring-4 ${level.active} scale-110 shadow-lg` : 'opacity-60 grayscale-[0.5] hover:opacity-100 hover:grayscale-0'
            }`}
            title={level.id}
          >
            {level.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col md:flex-row md:items-center gap-2">
        {/* Busca por nome */}
        <div className="w-full md:flex-1 md:max-w-xs relative">
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
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white border border-gray-200 rounded-lg focus:ring-2 focus:ring-[#8B0000] focus:border-transparent transition-all text-sm"
          />
        </div>

        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          {/* Dropdown tipo de hospedagem */}
          <PremiumSelect
            value={tipoHospedagem}
            onChange={handleTipoHospedagemChange}
            placeholder="Tipos de hospedagem"
            className="flex-1 md:flex-none md:min-w-[180px]"
            options={TIPOS_HOSPEDAGEM}
          />

          {/* Filtro de Origem (País) */}
          <div className="flex gap-1">
            <button
              onClick={() => handleOrigemChange('brasil')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-all ${
                origem === 'brasil'
                  ? 'bg-green-600 text-white ring-2 ring-green-300'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
              title="Filtrar Brasil"
            >
              <img src="/flags/br.png" alt="Brasil" className="w-5 h-auto rounded-sm" />
              <span className="hidden md:inline">BR</span>
            </button>
            <button
              onClick={() => handleOrigemChange('portugal')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-sm font-medium transition-all ${
                origem === 'portugal'
                  ? 'bg-red-600 text-white ring-2 ring-red-300'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
              title="Filtrar Portugal"
            >
              <img src="/flags/pt.png" alt="Portugal" className="w-5 h-auto rounded-sm" />
              <span className="hidden md:inline">PT</span>
            </button>
            <button
              onClick={() => handleFonteChange('vsl')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                fonte === 'vsl'
                  ? 'bg-blue-600 text-white shadow-md shadow-blue-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              VSL
            </button>
            <button
              onClick={() => handleFonteChange('quiz')}
              className={`flex items-center gap-1 px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                fonte === 'quiz'
                  ? 'bg-slate-500 text-white shadow-md shadow-slate-200'
                  : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              QUIZ
            </button>
          </div>

          {/* Filtro de Fonte (Site) */}
          <button
            onClick={() => handleFonteChange('site')}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-sm font-medium transition-all ${
              fonte === 'site'
                ? 'bg-orange-500 text-white ring-2 ring-orange-300'
                : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
            }`}
            title="Filtrar leads do Site"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
            </svg>
            <span className="hidden md:inline">Site</span>
          </button>

          {/* Botão de data com calendário */}
          <div className="relative flex-1 md:flex-none" ref={calendarRef}>
            <button
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                dateRange?.from
                  ? 'bg-[#8B0000] text-white'
                  : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <span className="truncate">{getDateLabel()}</span>
            </button>

            {/* Calendário Popup */}
            {isCalendarOpen && (
              <div className="absolute right-0 top-full mt-2 z-50 bg-white rounded-2xl shadow-2xl border border-gray-100 p-4 animate-in w-[300px] md:w-auto">
                <div className="mb-3 pb-3 border-b border-gray-100">
                  <h3 className="font-semibold text-gray-900 text-sm">Filtrar por período</h3>
                  <p className="text-xs text-gray-500 mt-0.5">Selecione uma data ou um intervalo</p>
                </div>

                <style>{`
                  .rdp {
                    --rdp-cell-size: 36px;
                    --rdp-accent-color: #8B0000;
                    --rdp-background-color: #FEF2F2;
                    margin: 0;
                    font-size: 14px;
                  }
                  .rdp-day_selected:not([disabled]) {
                    background-color: #8B0000;
                    color: white;
                  }
                  .rdp-day_selected:hover:not([disabled]) {
                    background-color: #6B0000;
                  }
                  .rdp-day_range_middle {
                    background-color: #FEE2E2;
                    color: #8B0000;
                  }
                  .rdp-day:hover:not([disabled]):not(.rdp-day_selected) {
                    background-color: #FEF2F2;
                  }
                  .rdp-button:focus-visible {
                    outline: 2px solid #8B0000;
                    outline-offset: 2px;
                  }
                  .rdp-caption_label {
                    font-weight: 600;
                    color: #1F2937;
                    font-size: 14px;
                  }
                  .rdp-nav_button {
                    color: #8B0000;
                  }
                  .rdp-head_cell {
                    color: #6B7280;
                    font-weight: 500;
                    font-size: 12px;
                  }
                `}</style>

                <DayPicker
                  mode="range"
                  selected={dateRange}
                  onSelect={handleDateRangeSelect}
                  locale={ptBR}
                  showOutsideDays
                  numberOfMonths={1}
                  disabled={{ after: new Date() }}
                />

                <div className="mt-3 pt-3 border-t border-gray-100 flex gap-2">
                  <button
                    onClick={() => {
                      setDateRange(undefined)
                      onFilterChange({ searchTerm, dateFrom: '', dateTo: '', tipoHospedagem, origem, fonte, classificacao })
                    }}
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Limpar
                  </button>
                  <button
                    onClick={() => setIsCalendarOpen(false)}
                    className="flex-1 px-3 py-1.5 text-sm font-medium text-white bg-[#8B0000] rounded-lg hover:bg-[#6B0000] transition-colors"
                  >
                    Aplicar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Limpar todos os filtros - Mobile: Botão grande, Desktop: Ícone */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="md:w-auto w-10 flex items-center justify-center gap-1 px-2 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-all"
              title="Limpar filtros"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="md:hidden sr-only">Limpar</span>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

// Função helper para filtrar leads
export function filterLeads<T extends { nome: string; created_at: string; tipo_hospedagem?: string | null; faturamento_medio?: string | null; origem?: string | null; fonte?: string | null }>(
  leads: T[],
  filters: FilterState
): T[] {
  return leads.filter(lead => {
    // Filtro por nome
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase()
      if (!lead.nome.toLowerCase().includes(searchLower)) {
        return false
      }
    }

    // Filtro por tipo de hospedagem
    if (filters.tipoHospedagem) {
      if (lead.tipo_hospedagem !== filters.tipoHospedagem) {
        return false
      }
    }

    // Filtro por origem (país)
    if (filters.origem) {
      if (lead.origem?.toLowerCase() !== filters.origem.toLowerCase()) {
        return false
      }
    }

    // Filtro por fonte (site/geral/comunidade)
    if (filters.fonte) {
      if (lead.fonte?.toLowerCase() !== filters.fonte.toLowerCase()) {
        return false
      }
    }

    // Filtro por classificação (Lead A-E)
    if (filters.classificacao) {
      const { coluna } = obterQualificacaoEColuna(lead.tipo_hospedagem, lead.faturamento_medio, lead.fonte)
      if (coluna !== filters.classificacao) {
        return false
      }
    }

    // Filtro por data inicial
    if (filters.dateFrom) {
      const leadDate = new Date(lead.created_at).toISOString().split('T')[0]
      if (leadDate < filters.dateFrom) {
        return false
      }
    }

    // Filtro por data final
    if (filters.dateTo) {
      const leadDate = new Date(lead.created_at).toISOString().split('T')[0]
      if (leadDate > filters.dateTo) {
        return false
      }
    }

    return true
  })
}
