'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts'

interface BarChartData {
  name: string
  aguardando: number
  emAtendimento: number
  encaminhados: number
  vendidos: number
  total: number
}

interface PieChartData {
  name: string
  value: number
  color: string
  [key: string]: any
}

interface BarChartProps {
  data: BarChartData[]
}

interface PieChartProps {
  data: PieChartData[]
}

export function LeadsPerSdrChart({ data }: BarChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>Sem dados para exibir</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 20, right: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={100} />
        <Tooltip 
          contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
          formatter={(value: any, name: any) => {
            const labels: Record<string, string> = {
              aguardando: 'Aguardando',
              emAtendimento: 'Em Atendimento',
              encaminhados: 'Encam. Reunião',
              vendidos: 'Vendidos (Lead E)'
            }
            return [value, labels[name] || name]
          }}
        />
        <Legend 
          formatter={(value) => {
            const labels: Record<string, string> = {
              aguardando: 'Aguardando',
              emAtendimento: 'Em Atendimento',
              encaminhados: 'Encam. Reunião',
              vendidos: 'Vendidos (Lead E)'
            }
            return labels[value] || value
          }}
        />
        <Bar dataKey="aguardando" stackId="a" fill="#64748b" name="aguardando" />
        <Bar dataKey="emAtendimento" stackId="a" fill="#3b82f6" name="emAtendimento" />
        <Bar dataKey="encaminhados" stackId="a" fill="#f59e0b" name="encaminhados" />
        <Bar dataKey="vendidos" stackId="a" fill="#10b981" name="vendidos" />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function StatusPieChart({ data }: PieChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>Sem dados para exibir</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}

export function QualificacaoPieChart({ data }: PieChartProps) {
  if (data.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-gray-400">
        <p>Sem dados para exibir</p>
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} (${((percent ?? 0) * 100).toFixed(0)}%)`}
          outerRadius={100}
          fill="#8884d8"
          dataKey="value"
        >
          {data.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }} />
      </PieChart>
    </ResponsiveContainer>
  )
}
