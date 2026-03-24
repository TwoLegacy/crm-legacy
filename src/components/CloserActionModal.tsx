'use client'

import { useState, useEffect } from 'react'
import { Lead } from '@/lib/leads'
import PremiumSelect from '@/components/ui/PremiumSelect'

interface CloserActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { valor?: number; tipo_venda?: 'TCV' | 'MRR'; meses_contrato?: number; motivo?: string }) => void
  type: 'GANHOU' | 'PERDEU' | 'NO_SHOW' | null
  leadName?: string
}

export default function CloserActionModal({ isOpen, onClose, onConfirm, type, leadName }: CloserActionModalProps) {
  const [valor, setValor] = useState('')
  const [tipoVenda, setTipoVenda] = useState<'TCV' | 'MRR'>('TCV')
  const [mesesContrato, setMesesContrato] = useState('12')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setValor('')
      setTipoVenda('TCV')
      setMesesContrato('12')
      setMotivo('')
      setError('')
    }
  }, [isOpen])

  if (!isOpen || !type) return null

  const handleSubmit = () => {
    if (type === 'GANHOU') {
      const numValor = parseFloat(valor.replace(/[^0-9,.]/g, '').replace(',', '.'))
      if (isNaN(numValor) || numValor <= 0) {
        setError('Insira um valor financeiro válido.')
        return
      }
      onConfirm({ 
        valor: numValor, 
        tipo_venda: tipoVenda, 
        meses_contrato: tipoVenda === 'MRR' ? parseInt(mesesContrato) : undefined 
      })
    } 
    else if (type === 'PERDEU') {
      if (!motivo.trim()) {
        setError('Por favor, descreva o motivo da perda.')
        return
      }
      onConfirm({ motivo })
    }
    else if (type === 'NO_SHOW') {
      onConfirm({})
    }
  }

  const titles = {
    GANHOU: 'Venda Fechada! 🎉',
    PERDEU: 'Venda Perdida',
    NO_SHOW: 'Confirmar No-Show'
  }

  const descriptions = {
    GANHOU: `Parabéns! Qual foi o valor fechado com ${leadName}?`,
    PERDEU: `Poxa... Por que perdemos a venda de ${leadName}?`,
    NO_SHOW: `Deseja marcar ${leadName} como No-Show e devolvê-lo para a fila do SDR?`
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl p-6">
        <h3 className="text-xl font-bold text-gray-900">{titles[type]}</h3>
        <p className="text-gray-500 mt-2 mb-6">{descriptions[type]}</p>

        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-600 text-sm rounded-lg border border-red-100">
            {error}
          </div>
        )}

        {type === 'GANHOU' && (
          <div className="mb-6 space-y-4">
            <div className="flex p-1 bg-gray-100 rounded-xl">
              <button
                type="button"
                onClick={() => setTipoVenda('TCV')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  tipoVenda === 'TCV' 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                TCV (Venda Total)
              </button>
              <button
                type="button"
                onClick={() => setTipoVenda('MRR')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${
                  tipoVenda === 'MRR' 
                    ? 'bg-white text-emerald-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                MRR (Recorrência)
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                Valor da Venda ({tipoVenda})
              </label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">R$</span>
                <input
                  type="number"
                  step="0.01"
                  value={valor}
                  onChange={e => setValor(e.target.value)}
                  placeholder="0,00"
                  className="w-full h-12 pl-12 pr-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            {tipoVenda === 'MRR' && (
              <div className="animate-in fade-in slide-in-from-top-1 duration-200">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ml-1">
                  Tempo de Contrato (Meses)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={mesesContrato}
                    onChange={e => setMesesContrato(e.target.value)}
                    className="w-full h-12 px-4 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none transition-all font-medium"
                    placeholder="Ex: 12"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm font-medium">meses</span>
                </div>
              </div>
            )}
          </div>
        )}

        {type === 'PERDEU' && (
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Motivo / Objeção</label>
            <PremiumSelect
              label=""
              className="mb-3"
              value={motivo}
              onChange={setMotivo}
              options={[
                { value: 'Achou caro', label: 'Achou muito caro' },
                { value: 'Fechou com concorrente', label: 'Fechou com a concorrência' },
                { value: 'Sem budget / Dinheiro', label: 'Sem dinheiro na hora' },
                { value: 'Decidiu postergar', label: 'Decidiu postergar a compra' },
                { value: 'Não viu valor', label: 'Não viu valor suficiente' },
                { value: 'Outro', label: 'Outro (Especifique nas regras extras depois)' },
              ]}
              placeholder="Selecione o motivo..."
            />
          </div>
        )}

        <div className="flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2.5 text-sm font-medium text-gray-600 bg-white border border-gray-200 rounded-xl hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            className={`px-5 py-2.5 text-sm font-medium text-white rounded-xl shadow-md transition-all ${
              type === 'GANHOU' ? 'bg-emerald-600 hover:bg-emerald-700' :
              type === 'PERDEU' ? 'bg-red-600 hover:bg-red-700' :
              'bg-orange-500 hover:bg-orange-600'
            }`}
          >
            Confirmar
          </button>
        </div>
      </div>
    </div>
  )
}
