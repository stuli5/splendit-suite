'use client'

import { useEffect, useState } from 'react'
import { getCRMCandidates } from '@/lib/crm-candidates'
import { computeFunnelMetrics, STAGE_ORDER } from '@/lib/crm-analytics'
import type { CRMCandidate } from '@/lib/types'
import type { FunnelMetrics } from '@/lib/crm-analytics'

const STAGE_LABELS: Record<string, string> = {
  new:       'New',
  screening: 'Screening',
  interview: 'Interview',
  offer:     'Offer',
}

const STAGE_COLORS: Record<string, string> = {
  new:       '#6b7280',
  screening: '#0091c7',
  interview: '#6b46a8',
  offer:     '#00a87a',
}

const SOURCE_COLORS: Record<string, string> = {
  linkedin: '#0077b5',
  recru:    '#f59e0b',
  manual:   '#6b46a8',
  portal:   '#00a87a',
  unknown:  '#9ca3af',
}

export default function AnalyticsPage() {
  const [candidates, setCandidates] = useState<CRMCandidate[]>([])
  const [loading,    setLoading]    = useState(true)
  const [metrics,    setMetrics]    = useState<FunnelMetrics | null>(null)

  useEffect(() => {
    getCRMCandidates().then(data => {
      setCandidates(data)
      setMetrics(computeFunnelMetrics(data))
      setLoading(false)
    })
  }, [])

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '60vh' }}>
        <span style={{ fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)', fontSize: '0.85rem' }}>
          Loading analytics…
        </span>
      </div>
    )
  }

  if (!metrics) return null

  const maxStageCount = Math.max(...metrics.stages.map(s => s.count), 1)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: 'var(--text)', margin: 0 }}>
          Funnel Analytics
        </h1>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
          {candidates.length} candidates total
        </p>
      </div>

      {/* ── Recruitment Funnel ───────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionTitle}>Recruitment Funnel</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {metrics.stages.map((sm, i) => (
            <div key={sm.stage}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <span style={{
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem',
                  fontWeight: 600, color: STAGE_COLORS[sm.stage], width: 80, flexShrink: 0,
                }}>
                  {STAGE_LABELS[sm.stage]}
                </span>
                <div style={{
                  flex: 1, height: 28, borderRadius: 6, background: 'rgba(0,0,0,0.05)',
                  overflow: 'hidden', position: 'relative',
                }}>
                  <div style={{
                    height: '100%',
                    width: `${(sm.count / maxStageCount) * 100}%`,
                    background: STAGE_COLORS[sm.stage],
                    borderRadius: 6,
                    transition: 'width 0.4s ease',
                    display: 'flex', alignItems: 'center', paddingLeft: 10,
                  }}>
                    {sm.count > 0 && (
                      <span style={{ color: '#fff', fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                        {sm.count}
                      </span>
                    )}
                  </div>
                </div>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-dim)', width: 60, textAlign: 'right' }}>
                  {sm.count} cand.
                </span>
                {i > 0 && (
                  <span style={{
                    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem',
                    color: sm.conversionRate >= 50 ? '#00a87a' : sm.conversionRate >= 25 ? '#f59e0b' : '#ef4444',
                    width: 56, textAlign: 'right', fontWeight: 600,
                  }}>
                    {sm.conversionRate}%
                  </span>
                )}
                {i === 0 && <span style={{ width: 56 }} />}
              </div>
            </div>
          ))}
        </div>
        <p style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 8 }}>
          Percentages show conversion from previous stage. Bars reflect cumulative candidate count per stage.
        </p>
      </section>

      {/* ── Source Breakdown ────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionTitle}>Source Breakdown</h2>
        {metrics.sources.length === 0 ? (
          <p style={emptyText}>No source data yet.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {metrics.sources.map(src => (
              <div key={src.source} style={{
                background: 'rgba(255,255,255,0.85)',
                border: `1.5px solid ${SOURCE_COLORS[src.source] ?? '#9ca3af'}22`,
                borderRadius: 12,
                padding: '16px 20px',
                minWidth: 130,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  width: 10, height: 10, borderRadius: '50%',
                  background: SOURCE_COLORS[src.source] ?? '#9ca3af',
                  marginBottom: 8,
                }} />
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 2 }}>
                  {src.source}
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text)' }}>
                  {src.count}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                  {src.percentage}% of total
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Time in Stage ───────────────────────────────────────────────────── */}
      <section style={{ marginBottom: 32 }}>
        <h2 style={sectionTitle}>Average Time in Stage</h2>
        {metrics.timeInStage.every(t => t.candidateCount === 0) ? (
          <p style={emptyText}>No stage history data yet. Time tracking activates for candidates going forward.</p>
        ) : (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {STAGE_ORDER.map(stage => {
              const t = metrics.timeInStage.find(x => x.stage === stage)
              if (!t) return null
              return (
                <div key={stage} style={{
                  background: 'rgba(255,255,255,0.85)',
                  border: `1.5px solid ${STAGE_COLORS[stage]}22`,
                  borderRadius: 12,
                  padding: '16px 20px',
                  minWidth: 140,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: STAGE_COLORS[stage], fontWeight: 600, marginBottom: 8 }}>
                    {STAGE_LABELS[stage]}
                  </div>
                  {t.candidateCount === 0 ? (
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-dim)' }}>—</div>
                  ) : (
                    <>
                      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.5rem', color: 'var(--text)' }}>
                        {t.avgDays}d
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                        avg · {t.candidateCount} cand.
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </section>

    </div>
  )
}

// ─── Shared styles ───────────────────────────────────────────────────────────

const sectionTitle: React.CSSProperties = {
  fontFamily: 'Syne, sans-serif',
  fontWeight: 700,
  fontSize: '0.95rem',
  color: 'var(--text)',
  margin: '0 0 14px',
}

const emptyText: React.CSSProperties = {
  fontFamily: 'JetBrains Mono, monospace',
  fontSize: '0.78rem',
  color: 'var(--text-dim)',
  margin: 0,
}
