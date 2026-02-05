'use client'

import { useState, useEffect, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { getAllLeads, getAllSdrs, Lead, Profile } from '@/lib/leads'
import { obterQualificacaoEColuna, ColunaGlobal, CORES_COLUNAS } from '@/lib/kanban'
import { useAuth } from '@/contexts/AuthContext'
import Sidebar from '@/components/Sidebar'

// Dynamic imports for charts (SSR disabled)
const LeadsPerSdrChart = dynamic(
  () => import('@/components/DashboardCharts').then((mod) => mod.LeadsPerSdrChart),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000]"></div></div> }
)

const StatusPieChart = dynamic(
  () => import('@/components/DashboardCharts').then((mod) => mod.StatusPieChart),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000]"></div></div> }
)

const QualificacaoPieChart = dynamic(
  () => import('@/components/DashboardCharts').then((mod) => mod.QualificacaoPieChart),
  { ssr: false, loading: () => <div className="h-full flex items-center justify-center"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000]"></div></div> }
)

// Helper para verificar se um lead é da comunidade
function isComunidade(lead: Lead): boolean {
  return lead.fonte?.toLowerCase() === 'comunidade'
}

export default function AdminDashboardPage() {
  const router = useRouter()
  const { user, profile, loading: authLoading } = useAuth()
  
  const [leads, setLeads] = useState<Lead[]>([])
  const [sdrs, setSdrs] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [isClient, setIsClient] = useState(false)

  useEffect(() => {
    setIsClient(true)
  }, [])

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      router.replace('/login')
      return
    }

    if (!profile) return

    if (profile.role !== 'admin') {
      router.replace('/sdr/kanban')
      return
    }

    const fetchData = async () => {
      setLoading(true)
      try {
        const [leadsData, sdrsData] = await Promise.all([
          getAllLeads(),
          getAllSdrs()
        ])
        setLeads(leadsData)
        setSdrs(sdrsData)
      } catch (err) {
        console.error('Erro ao carregar dados:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [user, profile, authLoading, router])

  // Métricas calculadas (separadas por tipo)
  const metrics = useMemo(() => {
    const total = leads.length
    const atribuidos = leads.filter(l => l.owner_sdr_id).length
    const naoAtribuidos = leads.filter(l => !l.owner_sdr_id).length
    const aguardando = leads.filter(l => l.status_sdr === 'MEUS_LEADS').length
    const emAtendimento = leads.filter(l => ['QUALIFICACAO', 'PERTO_REUNIAO'].includes(l.status_sdr || '')).length
    const leadsPerdidos = leads.filter(l => l.status_sdr === 'LEAD_PERDIDO').length
    
    // Helper para verificar fonte
    const isSite = (lead: Lead) => lead.fonte?.toLowerCase() === 'site'
    
    // Geral (níveis, excluindo comunidade e site): conversão = encaminhados para reunião
    const leadsGeral = leads.filter(l => !isComunidade(l) && !isSite(l))
    const geralTotal = leadsGeral.length
    const geralAtribuidos = leadsGeral.filter(l => l.owner_sdr_id).length
    const geralEncaminhados = leadsGeral.filter(l => l.status_sdr === 'ENCAMINHADO_REUNIAO').length
    const geralPerdidos = leadsGeral.filter(l => l.status_sdr === 'LEAD_PERDIDO').length
    const geralTaxaConversao = geralAtribuidos > 0 ? ((geralEncaminhados / geralAtribuidos) * 100).toFixed(1) : '0'
    
    // Site: conversão = encaminhados para reunião
    const leadsSite = leads.filter(l => isSite(l))
    const siteTotal = leadsSite.length
    const siteAtribuidos = leadsSite.filter(l => l.owner_sdr_id).length
    const siteEncaminhados = leadsSite.filter(l => l.status_sdr === 'ENCAMINHADO_REUNIAO').length
    const sitePerdidos = leadsSite.filter(l => l.status_sdr === 'LEAD_PERDIDO').length
    const siteTaxaConversao = siteAtribuidos > 0 ? ((siteEncaminhados / siteAtribuidos) * 100).toFixed(1) : '0'
    
    // Comunidade: conversão = vendidos
    const leadsComunidade = leads.filter(l => isComunidade(l))
    const comunidadeTotal = leadsComunidade.length
    const comunidadeAtribuidos = leadsComunidade.filter(l => l.owner_sdr_id).length
    const comunidadeVendidos = leadsComunidade.filter(l => l.status_sdr === 'VENDEU').length
    const comunidadePerdidos = leadsComunidade.filter(l => l.status_sdr === 'LEAD_PERDIDO').length
    const comunidadeTaxaConversao = comunidadeAtribuidos > 0 ? ((comunidadeVendidos / comunidadeAtribuidos) * 100).toFixed(1) : '0'

    return {
      total,
      atribuidos,
      naoAtribuidos,
      aguardando,
      emAtendimento,
      leadsPerdidos,
      // Geral
      geralTotal,
      geralAtribuidos,
      geralEncaminhados,
      geralPerdidos,
      geralTaxaConversao,
      // Site
      siteTotal,
      siteAtribuidos,
      siteEncaminhados,
      sitePerdidos,
      siteTaxaConversao,
      // Comunidade
      comunidadeTotal,
      comunidadeAtribuidos,
      comunidadeVendidos,
      comunidadePerdidos,
      comunidadeTaxaConversao,
    }
  }, [leads])

  // Dados para gráfico de leads por SDR (com vendidos comunidade separado)
  const leadsPerSdr = useMemo(() => {
    const sdrMap = new Map<string, { 
      name: string
      total: number
      aguardando: number
      emAtendimento: number
      qualificacao: number
      pertoReuniao: number
      encaminhados: number
      vendidosComunidade: number
      leadsPerdidos: number
      // Separação para cálculos
      totalGeral: number
      totalComunidade: number
    }>()
    
    sdrs.forEach(sdr => {
      sdrMap.set(sdr.id, {
        name: sdr.name,
        total: 0,
        aguardando: 0,
        emAtendimento: 0,
        encaminhados: 0,
        vendidosComunidade: 0,
        leadsPerdidos: 0,
        totalGeral: 0,
        totalComunidade: 0,
        // Novos contadores
        qualificacao: 0,
        pertoReuniao: 0
      })
    })

    leads.forEach(lead => {
      if (lead.owner_sdr_id && sdrMap.has(lead.owner_sdr_id)) {
        const sdr = sdrMap.get(lead.owner_sdr_id)!
        sdr.total++
        
        // Contador de perdidos (ambos os tipos)
        if (lead.status_sdr === 'LEAD_PERDIDO') sdr.leadsPerdidos++
        
        if (isComunidade(lead)) {
          sdr.totalComunidade++
          if (lead.status_sdr === 'MEUS_LEADS') sdr.aguardando++
          // Mapeia novos status para "Atendimento" (ou cria colunas separadas se preferir, aqui somando para manter compatibilidade visual)
          if (['QUALIFICACAO', 'PERTO_REUNIAO'].includes(lead.status_sdr || '')) sdr.emAtendimento++
          if (lead.status_sdr === 'VENDEU') sdr.vendidosComunidade++
        } else {
          sdr.totalGeral++
          if (lead.status_sdr === 'MEUS_LEADS') sdr.aguardando++
          if (lead.status_sdr === 'QUALIFICACAO') sdr.qualificacao++
          if (lead.status_sdr === 'PERTO_REUNIAO') sdr.pertoReuniao++
          // Soma ambos para "emAtendimento" no gráfico antigo se necessário, ou exibiremos separado no tooltip
          if (['QUALIFICACAO', 'PERTO_REUNIAO'].includes(lead.status_sdr || '')) sdr.emAtendimento++
          
          if (lead.status_sdr === 'ENCAMINHADO_REUNIAO') sdr.encaminhados++
        }
      }
    })

    return Array.from(sdrMap.values()).sort((a, b) => b.total - a.total)
  }, [leads, sdrs])

  // Dados para gráfico de pizza - Status
  const statusData = useMemo(() => [
    { name: 'Não Atribuídos', value: metrics.naoAtribuidos, color: '#9ca3af' },
    { name: 'Aguardando', value: metrics.aguardando, color: '#64748b' },
    { name: 'Em Qualificação', value: metrics.emAtendimento, color: '#3b82f6' },
    { name: 'Encam. Reunião', value: metrics.geralEncaminhados, color: '#f59e0b' },
    { name: 'Vendidos (Comun.)', value: metrics.comunidadeVendidos, color: '#10b981' },
    { name: 'Lead Perdido', value: metrics.leadsPerdidos, color: '#dc2626' },
  ].filter(d => d.value > 0), [metrics])

  // Dados para gráfico de pizza - Qualificação
  const qualificacaoData = useMemo(() => {
    const counts: Record<ColunaGlobal, number> = {
      'Nível 1': 0,
      'Nível 2': 0,
      'Nível 3': 0,
      'Nível 4': 0,
      'Comunidade': 0,
    }

    leads.forEach(lead => {
      const { coluna } = obterQualificacaoEColuna(lead.tipo_hospedagem, lead.faturamento_medio, lead.fonte)
      counts[coluna]++
    })

    return Object.entries(counts)
      .filter(([_, value]) => value > 0)
      .map(([name, value]) => ({
        name,
        value,
        color: CORES_COLUNAS[name as ColunaGlobal]
      }))
  }, [leads])

  if (loading || authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#8B0000] mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <Sidebar>
      <div className="min-h-screen bg-gray-50 p-4 md:p-6">
        {/* Header */}
        <header className="mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">Métricas e KPIs de atendimento</p>
        </header>

        {/* Cards de Métricas Gerais */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Total Leads</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">{metrics.total}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Atribuídos</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.atribuidos}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Aguardando</p>
            <p className="text-2xl font-bold text-gray-500 mt-1">{metrics.aguardando}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Em Qualificação</p>
            <p className="text-2xl font-bold text-blue-600 mt-1">{metrics.emAtendimento}</p>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <p className="text-xs text-gray-500 uppercase tracking-wide">Não Atribuídos</p>
            <p className="text-2xl font-bold text-gray-500 mt-1">{metrics.naoAtribuidos}</p>
          </div>
        </div>

        {/* Cards de Conversão (Geral vs Site vs Comunidade) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Card Geral */}
          <div className="bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/80 uppercase tracking-wide font-semibold">Leads Gerais (Níveis)</span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{metrics.geralTotal} leads</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/70 text-xs">Encam. Reunião</p>
                <p className="text-2xl font-bold text-white">{metrics.geralEncaminhados}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">Taxa Conversão</p>
                <p className="text-3xl font-bold text-white">{metrics.geralTaxaConversao}%</p>
              </div>
            </div>
          </div>

          {/* Card Site */}
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/80 uppercase tracking-wide font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                </svg>
                Leads do Site
              </span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{metrics.siteTotal} leads</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/70 text-xs">Encam. Reunião</p>
                <p className="text-2xl font-bold text-white">{metrics.siteEncaminhados}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">Taxa Conversão</p>
                <p className="text-3xl font-bold text-white">{metrics.siteTaxaConversao}%</p>
              </div>
            </div>
          </div>

          {/* Card Comunidade */}
          <div className="bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/80 uppercase tracking-wide font-semibold">Leads Comunidade</span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{metrics.comunidadeTotal} leads</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/70 text-xs">Vendidos</p>
                <p className="text-2xl font-bold text-white">{metrics.comunidadeVendidos}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">Taxa Conversão</p>
                <p className="text-3xl font-bold text-white">{metrics.comunidadeTaxaConversao}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          {/* Gráfico de Barras - Leads por SDR */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Leads por SDR</h2>
            <div className="h-80">
              {isClient ? (
                <LeadsPerSdrChart data={leadsPerSdr.map(s => ({
                  name: s.name,
                  aguardando: s.aguardando,
                  emAtendimento: s.emAtendimento, // Soma de Qualif + Perto
                  encaminhados: s.encaminhados,
                  vendidos: s.vendidosComunidade,
                  total: s.total
                }))} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000]"></div>
                </div>
              )}
            </div>
          </div>

          {/* Gráfico de Pizza - Status */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Status</h2>
            <div className="h-80">
              {isClient ? (
                <StatusPieChart data={statusData} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000]"></div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Segunda linha de gráficos */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Gráfico de Pizza - Qualificação */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Distribuição por Qualificação</h2>
            <div className="h-80">
              {isClient ? (
                <QualificacaoPieChart data={qualificacaoData} />
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#8B0000]"></div>
                </div>
              )}
            </div>
          </div>

          {/* Tabela de Performance por SDR */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-4">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Performance por SDR</h2>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-semibold text-gray-700">SDR</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-700">Total</th>
                    <th className="text-center py-3 px-2 font-semibold text-gray-500 text-xs">Aguar.</th>
                    <th className="text-center py-3 px-2 font-semibold text-blue-600 text-xs">Atend.</th>
                    <th className="text-center py-3 px-2 font-semibold text-amber-600 text-xs">Enc. Reunião</th>
                    <th className="text-center py-3 px-2 font-semibold text-emerald-600 text-xs">Vend. Comun.</th>
                    <th className="text-center py-3 px-2 font-semibold text-red-600 text-xs">Perdidos</th>
                    <th className="text-center py-3 px-2 font-semibold text-amber-600 text-xs">Taxa Geral</th>
                    <th className="text-center py-3 px-2 font-semibold text-emerald-600 text-xs">Taxa Comun.</th>
                  </tr>
                </thead>
                <tbody>
                  {leadsPerSdr.map((sdr, index) => {
                    const taxaGeral = sdr.totalGeral > 0 ? ((sdr.encaminhados / sdr.totalGeral) * 100).toFixed(0) : '-'
                    const taxaComunidade = sdr.totalComunidade > 0 ? ((sdr.vendidosComunidade / sdr.totalComunidade) * 100).toFixed(0) : '-'
                    
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="py-3 px-2 font-medium text-gray-900">{sdr.name}</td>
                        <td className="py-3 px-2 text-center text-gray-600">{sdr.total}</td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full text-xs font-medium">
                            {sdr.aguardando}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded-full text-xs font-medium">
                            {sdr.emAtendimento}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full text-xs font-medium">
                            {sdr.encaminhados}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full text-xs font-medium">
                            {sdr.vendidosComunidade}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            {sdr.leadsPerdidos}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-amber-600">
                          {taxaGeral !== '-' ? `${taxaGeral}%` : '-'}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-emerald-600">
                          {taxaComunidade !== '-' ? `${taxaComunidade}%` : '-'}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </Sidebar>
  )
}
