'use client'

import { useEffect, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'
import Link from 'next/link'
import { getProjects } from '@/lib/projects'
import { getCRMCandidates } from '@/lib/crm-candidates'
import { getProjectCandidates } from '@/lib/project-candidates'
import { getMonthlyUsage, formatTokens, type MonthlyUsage } from '@/lib/ai-usage'

const modules = [
  { href: '/crm/kandidati',   icon: '👤', label: 'Candidates',      desc: 'Candidate management & pipeline',   color: '#00a87a' },
  { href: '/crm/spolecnosti', icon: '🏢', label: 'Companies',       desc: 'Clients & partner companies',       color: '#0091c7' },
  { href: '/crm/projekty',    icon: '📁', label: 'Projects',        desc: 'Active positions & orders',         color: '#2db8b0' },
  { href: '/ims',             icon: '🎯', label: 'IMS',             desc: 'Interview Management System',       color: '#6b46a8' },
  { href: '/meet-visualizer', icon: '🕸', label: 'Meet Visualizer', desc: 'Network & meeting visualizer',      color: '#2db8b0' },
  { href: '/deal-radar',      icon: '📡', label: 'Deal Radar',      desc: 'Pipeline deals & stages',           color: '#e0457a' },
  { href: '/bodyshop',        icon: '🏗', label: 'Bodyshop',        desc: 'Contractor management',             color: '#f59e0b' },
  { href: '/bot',             icon: '🤖', label: 'SplenditBot',     desc: 'Automation & AI assistant',         color: '#0091c7' },
]

interface AiInsights {
  headline:  string
  insights:  string[]
  alerts:    string[]
  focus:     string
}

export default function DashboardPage() {
  const [insights,  setInsights]  = useState<AiInsights | null>(null)
  const [loading,   setLoading]   = useState(false)
  const [stats,     setStats]     = useState<Record<string, number> | null>(null)
  const [aiUsage,   setAiUsage]   = useState<MonthlyUsage | null>(null)

  useEffect(() => {
    async function loadStats() {
      const [projects, candidates] = await Promise.all([getProjects(), getCRMCandidates()])
      const active = projects.filter(p => p.status === 'active')

      let inPipeline = 0
      for (const p of active.slice(0, 5)) {
        const pcs = await getProjectCandidates(p.id)
        inPipeline += pcs.length
      }

      const oneWeekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000
      const newWeek    = candidates.filter(c => c.createdAt > oneWeekAgo).length

      setStats({
        activeProjects:      active.length,
        totalCandidates:     candidates.length,
        candidatesInPipeline: inPipeline,
        interviews:          0,
        activeContracts:     0,
        newCandidatesWeek:   newWeek,
      })

      const usage = await getMonthlyUsage()
      setAiUsage(usage)
    }
    loadStats()
  }, [])

  async function handleAiInsights() {
    if (!stats) return
    setLoading(true)
    const res  = await authFetch('/api/ai/dashboard-insights', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ stats }),
    })
    const json = await res.json()
    if (json.headline) setInsights(json)
    setLoading(false)
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
            Dashboard
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            SplenditSuite — IT Recruitment Platform
          </p>
        </div>
        <button
          onClick={handleAiInsights}
          disabled={loading || !stats}
          style={{
            padding: '9px 20px', borderRadius: 9, border: 'none',
            background: loading ? 'rgba(107,70,168,0.2)' : 'rgba(107,70,168,0.12)',
            color: '#6b46a8', fontSize: '0.82rem', fontWeight: 700, cursor: (loading || !stats) ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? '✨ Analyzing...' : '✨ AI Daily Insights'}
        </button>
      </div>

      {/* Stats row */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Active Projects',    value: stats.activeProjects,       color: '#00a87a' },
            { label: 'Total Candidates',   value: stats.totalCandidates,      color: '#0091c7' },
            { label: 'In Pipeline',        value: stats.candidatesInPipeline, color: '#6b46a8' },
            { label: 'New This Week',      value: stats.newCandidatesWeek,    color: '#f59e0b' },
          ].map(s => (
            <div key={s.label} className="glass-card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: '1.6rem', fontWeight: 800, color: s.color, fontFamily: 'Syne, sans-serif' }}>{s.value}</div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* AI Insights */}
      {insights && (
        <div style={{
          background: 'rgba(107,70,168,0.06)', border: '1.5px solid rgba(107,70,168,0.2)',
          borderRadius: 12, padding: '20px 24px', marginBottom: 24,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#6b46a8' }}>
              ✨ AI Daily Insights
            </span>
            <button onClick={() => setInsights(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.8rem' }}>✕</button>
          </div>
          <p style={{ fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>{insights.headline}</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 14 }}>
            <div>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b46a8', letterSpacing: '0.05em', marginBottom: 8 }}>INSIGHTS</div>
              {insights.insights.map((ins, i) => (
                <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text)', marginBottom: 5 }}>• {ins}</div>
              ))}
            </div>
            <div>
              {insights.alerts.length > 0 && (
                <>
                  <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#e0457a', letterSpacing: '0.05em', marginBottom: 8 }}>ALERTS</div>
                  {insights.alerts.map((a, i) => (
                    <div key={i} style={{ fontSize: '0.78rem', color: '#e0457a', marginBottom: 5 }}>⚡ {a}</div>
                  ))}
                </>
              )}
            </div>
          </div>
          <div style={{ fontSize: '0.8rem', color: '#6b46a8', fontWeight: 600, borderTop: '1px solid rgba(107,70,168,0.15)', paddingTop: 12 }}>
            🎯 Focus today: {insights.focus}
          </div>
        </div>
      )}

      {/* AI Usage widget */}
      <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 24, display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: '1.1rem' }}>🤖</span>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.82rem', color: 'var(--text-dim)', letterSpacing: '0.05em' }}>
            AI USAGE — {new Date().toISOString().slice(0, 7)}
          </span>
        </div>
        {aiUsage ? (
          <>
            <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 2 }}>Calls</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#0091c7', fontFamily: 'Syne, sans-serif' }}>{aiUsage.calls}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 2 }}>Input tokens</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#00a87a', fontFamily: 'Syne, sans-serif' }}>{formatTokens(aiUsage.inputTokens)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 2 }}>Output tokens</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#2db8b0', fontFamily: 'Syne, sans-serif' }}>{formatTokens(aiUsage.outputTokens)}</div>
              </div>
              <div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 2 }}>Est. cost</div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#e0457a', fontFamily: 'Syne, sans-serif' }}>${aiUsage.cost.toFixed(4)}</div>
              </div>
            </div>
          </>
        ) : (
          <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>No AI calls recorded this month yet.</div>
        )}
      </div>

      {/* Module grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {modules.map((m) => (
          <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
            <div className="glass-card" style={{ padding: '24px 22px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{ fontSize: '1.4rem', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 10, background: `${m.color}18` }}>
                  {m.icon}
                </span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                  {m.label}
                </span>
              </div>
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{m.desc}</p>
              <div style={{ marginTop: 14, fontSize: '0.68rem', color: m.color, fontWeight: 600, letterSpacing: '0.05em' }}>OPEN →</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
