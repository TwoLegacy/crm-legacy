'use client'

import { useState } from 'react'
import { RemarketingLead, FonteRemarketing, updateRemarketingLead } from '@/lib/remarketing'

interface LeadRemarketingDetailModalProps {
  lead: RemarketingLead | null
  onClose: () => void
  onUpdate: (updated: RemarketingLead) => void
}

const FONTE_LABELS: Record<FonteRemarketing, string> = {
  google_maps: 'Google Maps',
  indicacao: 'Indicação',
  linkedin: 'LinkedIn',
  outros: 'Outros',
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function LeadRemarketingDetailModal({ lead, onClose, onUpdate }: LeadRemarketingDetailModalProps) {
  const [editing, setEditing] = useState(false)
  const [loading, setLoading] = useState(false)
  const [editForm, setEditForm] = useState({
    email: '',
    instagram: '',
    nome_empresa: '',
    faturamento_estimado: '',
  })

  if (!lead) return null

  const isTransferred = !!lead.transferido_at
  const whatsappLink = `https://wa.me/55${lead.whatsapp.replace(/\D/g, '')}`

  const startEditing = () => {
    setEditForm({
      email: lead.email || '',
      instagram: lead.instagram || '',
      nome_empresa: lead.nome_empresa || '',
      faturamento_estimado: lead.faturamento_estimado || '',
    })
    setEditing(true)
  }

  const handleSave = async () => {
    setLoading(true)
    try {
      const updated = await updateRemarketingLead(lead.id, {
        email: editForm.email.trim() || null,
        instagram: editForm.instagram.trim() || null,
        nome_empresa: editForm.nome_empresa.trim() || null,
        faturamento_estimado: editForm.faturamento_estimado.trim() || null,
      })
      onUpdate(updated)
      setEditing(false)
    } catch {
      // silently fail
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
          <div>
            <h2 className="text-lg font-bold text-gray-900">{lead.nome}</h2>
            {lead.nome_empresa && (
              <p className="text-sm text-gray-500">{lead.nome_empresa}</p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isTransferred && (
              <span className="text-[10px] font-medium px-2 py-1 rounded-full bg-emerald-100 text-emerald-700">
                ✓ No Funil
              </span>
            )}
            <button onClick={onClose} className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {/* Dados principais (sempre visíveis) */}
          <div className="grid grid-cols-2 gap-4">
            <InfoItem label="Telefone">
              <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="text-green-700 hover:underline font-medium">
                {lead.whatsapp}
              </a>
            </InfoItem>
            <InfoItem label="Cidade/UF">{lead.cidade_estado}</InfoItem>
            <InfoItem label="Fonte">{FONTE_LABELS[lead.fonte_remarketing]}</InfoItem>
            <InfoItem label="Status">
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                lead.status_remarketing === 'PROSPECTADO' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
              }`}>
                {lead.status_remarketing === 'PROSPECTADO' ? 'Prospectado' : 'Para Prospectar'}
              </span>
            </InfoItem>
          </div>

          {/* Dados editáveis */}
          {editing ? (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">E-mail</label>
                  <input
                    type="email"
                    value={editForm.email}
                    onChange={(e) => setEditForm(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Instagram</label>
                  <input
                    type="text"
                    value={editForm.instagram}
                    onChange={(e) => setEditForm(prev => ({ ...prev, instagram: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Empresa</label>
                  <input
                    type="text"
                    value={editForm.nome_empresa}
                    onChange={(e) => setEditForm(prev => ({ ...prev, nome_empresa: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Faturamento</label>
                  <input
                    type="text"
                    value={editForm.faturamento_estimado}
                    onChange={(e) => setEditForm(prev => ({ ...prev, faturamento_estimado: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100 focus:border-blue-300"
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => setEditing(false)}
                  className="px-4 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-50 transition-all"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading}
                  className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm hover:bg-blue-700 transition-all disabled:opacity-50"
                >
                  {loading ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3 pt-3 border-t border-gray-100">
              <div className="grid grid-cols-2 gap-4">
                <InfoItem label="E-mail">{lead.email || '—'}</InfoItem>
                <InfoItem label="Instagram">{lead.instagram || '—'}</InfoItem>
                <InfoItem label="Empresa">{lead.nome_empresa || '—'}</InfoItem>
                <InfoItem label="Faturamento">{lead.faturamento_estimado || '—'}</InfoItem>
              </div>
              {!isTransferred && (
                <button
                  onClick={startEditing}
                  className="text-xs text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  ✏️ Editar campos
                </button>
              )}
            </div>
          )}

          {/* Histórico */}
          <div className="pt-3 border-t border-gray-100">
            <p className="text-xs font-medium text-gray-500 mb-2">Histórico</p>
            <div className="space-y-1.5">
              <HistoryItem label="Importado/Criado em" value={formatDate(lead.created_at)} />
              {lead.prospectado_at && (
                <HistoryItem label="Prospectado em" value={formatDate(lead.prospectado_at)} />
              )}
              {lead.transferido_at && (
                <HistoryItem label="Enviado ao funil em" value={formatDate(lead.transferido_at)} />
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-100 transition-all text-sm font-medium"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}

function InfoItem({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium text-gray-400 mb-0.5">{label}</p>
      <p className="text-sm text-gray-900">{children}</p>
    </div>
  )
}

function HistoryItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center gap-2 text-xs">
      <div className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
      <span className="text-gray-500">{label}:</span>
      <span className="text-gray-700 font-medium">{value}</span>
    </div>
  )
}
