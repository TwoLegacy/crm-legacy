'use client'

import { useState, useEffect } from 'react'
import { Lead } from '@/lib/leads'
import PremiumSelect from '@/components/ui/PremiumSelect'

interface CloserActionModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (data: { valor?: number; motivo?: string }) => void
  type: 'GANHOU' | 'PERDEU' | 'NO_SHOW' | null
  leadName?: string
}

export default function CloserActionModal({ isOpen, onClose, onConfirm, type, leadName }: CloserActionModalProps) {
  const [valor, setValor] = useState('')
  const [motivo, setMotivo] = useState('')
  const [error, setError] = useState('')

  useEffect(() => {
    if (isOpen) {
      setValor('')
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
      onConfirm({ valor: numValor })
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
          <div className="mb-6">
            <label className="block text-sm font-semibold text-gray-700 mb-2">Valor da Venda (R$)</label>
            <input
              type="number"
              value={valor}
              onChange={e => setValor(e.target.value)}
              placeholder="Ex: 1500.00"
              className="w-full h-11 px-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
            />
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
