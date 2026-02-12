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
  return lead.fonte?.toLowerCase() === 'comunidade' || lead.fonte?.toLowerCase() === 'lead e'
}

function isVsl(lead: Lead): boolean {
  return lead.fonte?.toLowerCase() === 'vsl'
}

function isSite(lead: Lead): boolean {
  return lead.fonte?.toLowerCase() === 'site'
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
    

    
    // Quiz (Fallback para tudo que não é Site ou VSL): conversão = encaminhados para reunião
    const leadsQuiz = leads.filter(l => !isSite(l) && !isVsl(l))
    const quizTotal = leadsQuiz.length
    const quizAtribuidos = leadsQuiz.filter(l => l.owner_sdr_id).length
    const quizEncaminhados = leadsQuiz.filter(l => l.status_sdr === 'ENCAMINHADO_REUNIAO').length
    const quizPerdidos = leadsQuiz.filter(l => l.status_sdr === 'LEAD_PERDIDO').length
    const quizTaxaConversao = quizAtribuidos > 0 ? ((quizEncaminhados / quizAtribuidos) * 100).toFixed(1) : '0'
    
    // Site: conversão = encaminhados para reunião
    const leadsSite = leads.filter(l => isSite(l))
    const siteTotal = leadsSite.length
    const siteAtribuidos = leadsSite.filter(l => l.owner_sdr_id).length
    const siteEncaminhados = leadsSite.filter(l => l.status_sdr === 'ENCAMINHADO_REUNIAO').length
    const sitePerdidos = leadsSite.filter(l => l.status_sdr === 'LEAD_PERDIDO').length
    const siteTaxaConversao = siteAtribuidos > 0 ? ((siteEncaminhados / siteAtribuidos) * 100).toFixed(1) : '0'

    // VSL: conversão = encaminhados para reunião
    const leadsVsl = leads.filter(l => isVsl(l))
    const vslTotal = leadsVsl.length
    const vslAtribuidos = leadsVsl.filter(l => l.owner_sdr_id).length
    const vslEncaminhados = leadsVsl.filter(l => l.status_sdr === 'ENCAMINHADO_REUNIAO').length
    const vslPerdidos = leadsVsl.filter(l => l.status_sdr === 'LEAD_PERDIDO').length
    const vslTaxaConversao = vslAtribuidos > 0 ? ((vslEncaminhados / vslAtribuidos) * 100).toFixed(1) : '0'

    return {
      total,
      atribuidos,
      naoAtribuidos,
      aguardando,
      emAtendimento,
      leadsPerdidos,
      // Quiz
      quizTotal,
      quizAtribuidos,
      quizEncaminhados,
      quizPerdidos,
      quizTaxaConversao,
      // Site
      siteTotal,
      siteAtribuidos,
      siteEncaminhados,
      sitePerdidos,
      siteTaxaConversao,
      // VSL
      vslTotal,
      vslAtribuidos,
      vslEncaminhados,
      vslPerdidos,
      vslTaxaConversao,
    }
  }, [leads])

  // Dados para gráfico de leads por SDR (com vendidos comunidade separado)
  const leadsPerSdr = useMemo(() => {
    const sdrMap = new Map<string, { 
      name: string
      total: number
      aguardando: number
      emAtendimento: number
      leadsPerdidos: number
      qualificacao: number
      pertoReuniao: number
      // Contadores por fonte
      totalQuiz: number
      totalSite: number
      totalVsl: number
      encaminhadosQuiz: number
      encaminhadosSite: number
      encaminhadosVsl: number
    }>()
    
    sdrs.forEach(sdr => {
      sdrMap.set(sdr.id, {
        name: sdr.name,
        total: 0,
        aguardando: 0,
        emAtendimento: 0,
        totalQuiz: 0,
        totalSite: 0,
        totalVsl: 0,
        encaminhadosQuiz: 0,
        encaminhadosSite: 0,
        encaminhadosVsl: 0,
        qualificacao: 0,
        pertoReuniao: 0,
        leadsPerdidos: 0
      })
    })

    leads.forEach(lead => {
      if (lead.owner_sdr_id && sdrMap.has(lead.owner_sdr_id)) {
        const sdr = sdrMap.get(lead.owner_sdr_id)!
        sdr.total++
        
        // Contador de perdidos (ambos os tipos)
        if (lead.status_sdr === 'LEAD_PERDIDO') sdr.leadsPerdidos++
        
        if (isSite(lead)) {
          sdr.totalSite++
          if (lead.status_sdr === 'ENCAMINHADO_REUNIAO') sdr.encaminhadosSite++
        } else if (isVsl(lead)) {
          sdr.totalVsl++
          if (lead.status_sdr === 'ENCAMINHADO_REUNIAO') sdr.encaminhadosVsl++
        } else {
          sdr.totalQuiz++
          if (lead.status_sdr === 'ENCAMINHADO_REUNIAO') sdr.encaminhadosQuiz++
        }

        if (lead.status_sdr === 'MEUS_LEADS') sdr.aguardando++
        if (['QUALIFICACAO', 'PERTO_REUNIAO'].includes(lead.status_sdr || '')) sdr.emAtendimento++
        if (lead.status_sdr === 'QUALIFICACAO') sdr.qualificacao++
        if (lead.status_sdr === 'PERTO_REUNIAO') sdr.pertoReuniao++
      }
    })

    return Array.from(sdrMap.values()).sort((a, b) => b.total - a.total)
  }, [leads, sdrs])

  // Dados para gráfico de pizza - Status
  const statusData = useMemo(() => [
    { name: 'Não Atribuídos', value: metrics.naoAtribuidos, color: '#9ca3af' },
    { name: 'Aguardando', value: metrics.aguardando, color: '#64748b' },
    { name: 'Em Qualificação', value: metrics.emAtendimento, color: '#3b82f6' },
    { name: 'Encam. Reunião', value: metrics.quizEncaminhados + metrics.siteEncaminhados + metrics.vslEncaminhados, color: '#f59e0b' },
    { name: 'Lead Perdido', value: metrics.leadsPerdidos, color: '#dc2626' },
  ].filter(d => d.value > 0), [metrics])

  // Dados para gráfico de pizza - Qualificação
  const qualificacaoData = useMemo(() => {
    const counts: Record<ColunaGlobal, number> = {
      'Lead D': 0,
      'Lead C': 0,
      'Lead B': 0,
      'Lead A': 0,
      'Lead E': 0,
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
            <p className="text-xs text-gray-500 uppercase tracking-wide">Enc. Reunião</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">{metrics.quizEncaminhados + metrics.siteEncaminhados + metrics.vslEncaminhados}</p>
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

        {/* Cards de Conversão (Quiz vs Site vs VSL) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {/* Card Quiz */}
          <div className="bg-gradient-to-r from-slate-500 to-slate-600 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/80 uppercase tracking-wide font-semibold">Leads Quiz (Níveis)</span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{metrics.quizTotal} leads</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/70 text-xs">Encam. Reunião</p>
                <p className="text-2xl font-bold text-white">{metrics.quizEncaminhados}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs">Taxa Conversão</p>
                <p className="text-3xl font-bold text-white">{metrics.quizTaxaConversao}%</p>
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
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{metrics.siteTotal}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/70 text-xs text-[10px]">Encam. Reunião</p>
                <p className="text-xl font-bold text-white">{metrics.siteEncaminhados}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs text-[10px]">Taxa Conversão</p>
                <p className="text-2xl font-bold text-white">{metrics.siteTaxaConversao}%</p>
              </div>
            </div>
          </div>

          {/* Card VSL */}
          <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-sm p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-white/80 uppercase tracking-wide font-semibold flex items-center gap-1">
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                Leads VSL
              </span>
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">{metrics.vslTotal}</span>
            </div>
            <div className="flex items-end justify-between">
              <div>
                <p className="text-white/70 text-xs text-[10px]">Encam. Reunião</p>
                <p className="text-xl font-bold text-white">{metrics.vslEncaminhados}</p>
              </div>
              <div className="text-right">
                <p className="text-white/70 text-xs text-[10px]">Taxa Conversão</p>
                <p className="text-2xl font-bold text-white">{metrics.vslTaxaConversao}%</p>
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
                  emAtendimento: s.emAtendimento,
                  encaminhados: s.encaminhadosQuiz + s.encaminhadosSite + s.encaminhadosVsl,
                  vendidos: 0, // Unificado em encaminhados para os novos SDR flows
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
                    <th className="text-center py-3 px-2 font-semibold text-red-600 text-xs">Perdidos</th>
                    <th className="text-center py-3 px-2 font-semibold text-slate-600 text-xs">Taxa Quiz</th>
                    <th className="text-center py-3 px-2 font-semibold text-orange-600 text-xs text-[10px]">Taxa Site</th>
                    <th className="text-center py-3 px-2 font-semibold text-blue-600 text-xs text-[10px]">Taxa VSL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {leadsPerSdr.map((sdr, index) => {
                    const totalEncaminhados = sdr.encaminhadosQuiz + sdr.encaminhadosSite + sdr.encaminhadosVsl
                    const taxaQuiz = sdr.totalQuiz > 0 ? ((sdr.encaminhadosQuiz / sdr.totalQuiz) * 100).toFixed(0) : '-'
                    const taxaSite = sdr.totalSite > 0 ? ((sdr.encaminhadosSite / sdr.totalSite) * 100).toFixed(0) : '-'
                    const taxaVsl = sdr.totalVsl > 0 ? ((sdr.encaminhadosVsl / sdr.totalVsl) * 100).toFixed(0) : '-'
                    
                    return (
                      <tr key={index} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
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
                            {totalEncaminhados}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center">
                          <span className="px-2 py-0.5 bg-red-100 text-red-700 rounded-full text-xs font-medium">
                            {sdr.leadsPerdidos}
                          </span>
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-slate-600">
                          {taxaQuiz !== '-' ? `${taxaQuiz}%` : '-'}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-orange-600">
                          {taxaSite !== '-' ? `${taxaSite}%` : '-'}
                        </td>
                        <td className="py-3 px-2 text-center font-semibold text-blue-700">
                          {taxaVsl !== '-' ? `${taxaVsl}%` : '-'}
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
