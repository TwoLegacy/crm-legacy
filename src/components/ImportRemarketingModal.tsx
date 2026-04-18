'use client'

import { useState, useRef } from 'react'
import Papa from 'papaparse'
import * as XLSX from 'xlsx'
import { FonteRemarketing, importRemarketingLeads } from '@/lib/remarketing'

interface ImportRemarketingModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (result: { inserted: number; duplicates: number }) => void
  userId: string
}

interface ParsedRow {
  nome: string
  whatsapp: string
  cidade_estado: string
  email?: string
  instagram?: string
  nome_empresa?: string
  faturamento_estimado?: string
  link_perfil?: string
}

type ImportStep = 'upload' | 'preview' | 'importing' | 'result'

const FONTES_REMARKETING: { value: FonteRemarketing; label: string }[] = [
  { value: 'google_maps', label: 'Google Maps' },
  { value: 'indicacao', label: 'Indicação' },
  { value: 'linkedin', label: 'LinkedIn' },
  { value: 'outros', label: 'Outros' },
]

// Mapeamento flexível de colunas (case-insensitive)
const COLUMN_MAP: Record<string, keyof ParsedRow> = {
  nome: 'nome',
  name: 'nome',
  telefone: 'whatsapp',
  whatsapp: 'whatsapp',
  phone: 'whatsapp',
  celular: 'whatsapp',
  cidade_estado: 'cidade_estado',
  cidade: 'cidade_estado',
  city: 'cidade_estado',
  localidade: 'cidade_estado',
  email: 'email',
  'e-mail': 'email',
  instagram: 'instagram',
  insta: 'instagram',
  empresa: 'nome_empresa',
  nome_empresa: 'nome_empresa',
  company: 'nome_empresa',
  faturamento: 'faturamento_estimado',
  faturamento_estimado: 'faturamento_estimado',
  revenue: 'faturamento_estimado',
  link: 'link_perfil',
  link_perfil: 'link_perfil',
  perfil: 'link_perfil',
  maps: 'link_perfil',
  url: 'link_perfil',
}

function normalizeHeader(header: string): string {
  return header
    .toLowerCase()
    .trim()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove acentos
    .replace(/\s+/g, '_')
}

function mapRow(rawRow: Record<string, string>): ParsedRow | null {
  const mapped: Partial<ParsedRow> = {}

  for (const [rawKey, value] of Object.entries(rawRow)) {
    const normalized = normalizeHeader(rawKey)
    const targetField = COLUMN_MAP[normalized]
    if (targetField && value && value.trim()) {
      mapped[targetField] = value.trim()
    }
  }

  // Validação: nome e whatsapp obrigatórios
  if (!mapped.nome || !mapped.whatsapp) return null

  return mapped as ParsedRow
}

export default function ImportRemarketingModal({ isOpen, onClose, onSuccess, userId }: ImportRemarketingModalProps) {
  const [step, setStep] = useState<ImportStep>('upload')
  const [fonteRemarketing, setFonteRemarketing] = useState<FonteRemarketing>('google_maps')
  const [fileName, setFileName] = useState('')
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [invalidRows, setInvalidRows] = useState<number[]>([])
  const [totalRawRows, setTotalRawRows] = useState(0)
  const [importing, setImporting] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<{ inserted: number; duplicates: number; errors: string[] } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!isOpen) return null

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setError(null)
    setFileName(file.name)

    const extension = file.name.split('.').pop()?.toLowerCase()

    if (extension === 'csv') {
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => processRawData(results.data as Record<string, string>[]),
        error: () => setError('Erro ao ler o arquivo CSV'),
      })
    } else if (extension === 'xlsx' || extension === 'xls') {
      const reader = new FileReader()
      reader.onload = (evt) => {
        try {
          const wb = XLSX.read(evt.target?.result, { type: 'binary' })
          const ws = wb.Sheets[wb.SheetNames[0]]
          const data = XLSX.utils.sheet_to_json<Record<string, string>>(ws)
          processRawData(data)
        } catch {
          setError('Erro ao ler o arquivo Excel')
        }
      }
      reader.readAsBinaryString(file)
    } else {
      setError('Formato não suportado. Use CSV ou XLSX.')
    }
  }

  const processRawData = (rawData: Record<string, string>[]) => {
    if (rawData.length === 0) {
      setError('O arquivo está vazio')
      return
    }

    if (rawData.length > 5000) {
      setError(`Limite de 5.000 linhas excedido. O arquivo tem ${rawData.length.toLocaleString()} linhas.`)
      return
    }

    setTotalRawRows(rawData.length)
    const valid: ParsedRow[] = []
    const invalid: number[] = []

    rawData.forEach((row, index) => {
      const mapped = mapRow(row)
      if (mapped) {
        valid.push(mapped)
      } else {
        invalid.push(index + 2) // +2 porque linha 1 é header, e index é 0-based
      }
    })

    if (valid.length === 0) {
      setError('Nenhuma linha válida encontrada. Verifique se o arquivo tem as colunas "nome" e "telefone/whatsapp".')
      return
    }

    setParsedRows(valid)
    setInvalidRows(invalid)
    setStep('preview')
  }

  const handleImport = async () => {
    setStep('importing')
    setImporting(true)
    setProgress(10)

    try {
      setProgress(30)
      const importResult = await importRemarketingLeads(parsedRows, fonteRemarketing, userId)
      setProgress(100)
      setResult(importResult)
      setStep('result')
      onSuccess({ inserted: importResult.inserted, duplicates: importResult.duplicates })
    } catch (err) {
      setError('Erro durante a importação. Tente novamente.')
      setStep('preview')
    } finally {
      setImporting(false)
    }
  }

  const handleClose = () => {
    setStep('upload')
    setFileName('')
    setParsedRows([])
    setInvalidRows([])
    setTotalRawRows(0)
    setResult(null)
    setError(null)
    setProgress(0)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
              <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Importar Leads Remarketing</h2>
              <p className="text-xs text-gray-500">CSV ou XLSX · Máx. 5.000 linhas</p>
            </div>
          </div>
          <button onClick={handleClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-xl flex items-start gap-2">
              <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              {error}
            </div>
          )}

          {/* STEP 1: Upload */}
          {step === 'upload' && (
            <div className="space-y-5">
              {/* Fonte Remarketing */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Fonte dos leads *</label>
                <div className="grid grid-cols-2 gap-2">
                  {FONTES_REMARKETING.map(f => (
                    <button
                      key={f.value}
                      onClick={() => setFonteRemarketing(f.value)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                        fonteRemarketing === f.value
                          ? 'bg-blue-50 border-blue-300 text-blue-700 ring-1 ring-blue-200'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropzone */}
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-gray-300 rounded-2xl p-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 transition-all"
              >
                <svg className="w-12 h-12 mx-auto text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <p className="text-gray-600 font-medium">Clique para selecionar o arquivo</p>
                <p className="text-xs text-gray-400 mt-1">Formatos aceitos: .csv, .xlsx</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              {/* Instruções */}
              <div className="bg-gray-50 rounded-xl p-4 text-sm">
                <p className="font-medium text-gray-700 mb-2">Colunas esperadas:</p>
                <div className="grid grid-cols-2 gap-1 text-gray-500">
                  <span>• <strong>nome</strong> (obrigatório)</span>
                  <span>• <strong>telefone</strong> ou <strong>whatsapp</strong> (obrigatório)</span>
                  <span>• <strong>cidade_estado</strong> ou <strong>cidade</strong> (obrigatório)</span>
                  <span>• email (opcional)</span>
                  <span>• instagram (opcional)</span>
                  <span>• empresa (opcional)</span>
                  <span>• faturamento (opcional)</span>
                  <span>• link / maps (opcional)</span>
                </div>
              </div>
            </div>
          )}

          {/* STEP 2: Preview */}
          {step === 'preview' && (
            <div className="space-y-4">
              {/* Resumo */}
              <div className="flex items-center gap-4">
                <div className="flex-1 bg-blue-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-blue-700">{parsedRows.length}</p>
                  <p className="text-xs text-blue-500">Leads válidos</p>
                </div>
                {invalidRows.length > 0 && (
                  <div className="flex-1 bg-amber-50 rounded-xl p-3 text-center">
                    <p className="text-2xl font-bold text-amber-700">{invalidRows.length}</p>
                    <p className="text-xs text-amber-500">Linhas ignoradas</p>
                  </div>
                )}
                <div className="flex-1 bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-2xl font-bold text-gray-600">{totalRawRows}</p>
                  <p className="text-xs text-gray-400">Total no arquivo</p>
                </div>
              </div>

              {/* Arquivo selecionado */}
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                {fileName} · Fonte: <span className="font-medium text-gray-700">{FONTES_REMARKETING.find(f => f.value === fonteRemarketing)?.label}</span>
              </div>

              {/* Tabela de preview (5 primeiras linhas) */}
              <div className="border rounded-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50 border-b">
                      <tr>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">#</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Nome</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">WhatsApp</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Cidade/UF</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Empresa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {parsedRows.slice(0, 5).map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50">
                          <td className="px-3 py-2 text-gray-400">{idx + 1}</td>
                          <td className="px-3 py-2 font-medium text-gray-900">{row.nome}</td>
                          <td className="px-3 py-2 text-gray-600">{row.whatsapp}</td>
                          <td className="px-3 py-2 text-gray-600">{row.cidade_estado || '—'}</td>
                          <td className="px-3 py-2 text-gray-600">{row.nome_empresa || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedRows.length > 5 && (
                  <div className="px-3 py-2 bg-gray-50 border-t text-xs text-gray-400 text-center">
                    ... e mais {parsedRows.length - 5} leads
                  </div>
                )}
              </div>

              {/* Linhas inválidas */}
              {invalidRows.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                  <strong>Linhas ignoradas</strong> (sem nome ou telefone): {invalidRows.slice(0, 10).join(', ')}
                  {invalidRows.length > 10 && ` e mais ${invalidRows.length - 10}...`}
                </div>
              )}
            </div>
          )}

          {/* STEP 3: Importing */}
          {step === 'importing' && (
            <div className="py-10 text-center space-y-4">
              <div className="w-16 h-16 mx-auto border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin" />
              <p className="font-medium text-gray-700">Importando {parsedRows.length} leads...</p>
              <div className="w-full bg-gray-200 rounded-full h-2 max-w-xs mx-auto">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-700"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-gray-400">Isso pode levar alguns segundos</p>
            </div>
          )}

          {/* STEP 4: Result */}
          {step === 'result' && result && (
            <div className="space-y-4">
              <div className="text-center py-4">
                <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h3 className="text-xl font-bold text-gray-900">Importação concluída!</h3>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex-1 bg-green-50 rounded-xl p-4 text-center">
                  <p className="text-3xl font-bold text-green-700">{result.inserted}</p>
                  <p className="text-sm text-green-600">Leads importados</p>
                </div>
                {result.duplicates > 0 && (
                  <div className="flex-1 bg-amber-50 rounded-xl p-4 text-center">
                    <p className="text-3xl font-bold text-amber-700">{result.duplicates}</p>
                    <p className="text-sm text-amber-600">Duplicatas ignoradas</p>
                  </div>
                )}
              </div>

              {result.errors.length > 0 && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 max-h-32 overflow-y-auto">
                  <strong className="block mb-1">Erros encontrados:</strong>
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 bg-gray-50/50 flex items-center justify-end gap-3">
          {step === 'upload' && (
            <button
              onClick={handleClose}
              className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all text-sm font-medium"
            >
              Cancelar
            </button>
          )}

          {step === 'preview' && (
            <>
              <button
                onClick={() => {
                  setStep('upload')
                  setParsedRows([])
                  setInvalidRows([])
                  setFileName('')
                  setError(null)
                }}
                className="px-5 py-2.5 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all text-sm font-medium"
              >
                Voltar
              </button>
              <button
                onClick={handleImport}
                disabled={importing}
                className="px-6 py-2.5 rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-all text-sm font-medium shadow-sm disabled:opacity-50"
              >
                Confirmar importação de {parsedRows.length} leads
              </button>
            </>
          )}

          {step === 'result' && (
            <button
              onClick={handleClose}
              className="px-6 py-2.5 rounded-xl bg-[#8B0000] text-white hover:bg-[#6B0000] transition-all text-sm font-medium shadow-sm"
            >
              Fechar
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
