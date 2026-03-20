'use client'

import { useEffect, useState, useRef } from 'react'
import { collection, getDocs } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Candidate } from '@/lib/types'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Stats {
  total: number
  avgScore: number
  highestScore: number
  lowestScore: number
  bestCandidate: Candidate | null
  byPosition: Record<string, number>
  scoreRanges: Record<string, number>
  all: Candidate[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= 85) return 'var(--primary)'
  if (score >= 70) return 'var(--secondary)'
  if (score >= 50) return '#f59e0b'
  return '#ef4444'
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ icon, value, label }: { icon: string; value: string; label: string }) {
  return (
    <div className="glass-card" style={{ padding: '24px 28px', textAlign: 'center', flex: 1, minWidth: 140 }}>
      <div style={{ fontSize: '2rem', marginBottom: 6 }}>{icon}</div>
      <div style={{
        fontFamily: 'JetBrains Mono, monospace',
        fontWeight: 800,
        fontSize: '2rem',
        color: 'var(--text)',
        marginBottom: 4,
      }}>{value}</div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>
        {label}
      </div>
    </div>
  )
}

// ─── Canvas Chart (no external dep) ──────────────────────────────────────────

const POSITION_COLORS: Record<string, string> = {
  'AI Engineer':                 '#00a87a',
  'Data Engineer':               '#0091c7',
  'Data Science':                '#6b46a8',
  'React & Node.js':             '#f59e0b',
  'DevOps Engineer':             '#ef4444',
  'Knowledge Graph Engineer':    '#10b981',
  'AI QA Engineer':              '#8b5cf6',
}

function ScatterChart({ candidates }: { candidates: Candidate[] }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !candidates.length) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const W = canvas.offsetWidth
    const H = 320
    canvas.width  = W
    canvas.height = H

    const PAD = { top: 20, right: 20, bottom: 50, left: 50 }
    const plotW = W - PAD.left - PAD.right
    const plotH = H - PAD.top  - PAD.bottom

    // background
    ctx.fillStyle = 'rgba(255,255,255,0.02)'
    ctx.roundRect(0, 0, W, H, 12)
    ctx.fill()

    // grid lines y
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (let y = 0; y <= 100; y += 20) {
      const yPx = PAD.top + plotH - (y / 100) * plotH
      ctx.beginPath()
      ctx.moveTo(PAD.left, yPx)
      ctx.lineTo(PAD.left + plotW, yPx)
      ctx.stroke()
      ctx.fillStyle = 'rgba(255,255,255,0.4)'
      ctx.font = '11px JetBrains Mono, monospace'
      ctx.textAlign = 'right'
      ctx.fillText(`${y}%`, PAD.left - 6, yPx + 4)
    }

    // axes
    ctx.strokeStyle = 'rgba(255,255,255,0.15)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(PAD.left, PAD.top)
    ctx.lineTo(PAD.left, PAD.top + plotH)
    ctx.lineTo(PAD.left + plotW, PAD.top + plotH)
    ctx.stroke()

    // dots
    candidates.forEach((c, i) => {
      const x = PAD.left + (i / Math.max(candidates.length - 1, 1)) * plotW
      const y = PAD.top + plotH - (c.score / 100) * plotH
      const color = POSITION_COLORS[c.position] ?? '#888'

      ctx.beginPath()
      ctx.arc(x, y, 6, 0, Math.PI * 2)
      ctx.fillStyle = color + 'cc'
      ctx.fill()
      ctx.strokeStyle = color
      ctx.lineWidth = 1.5
      ctx.stroke()
    })

    // x label
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.font = '11px JetBrains Mono, monospace'
    ctx.textAlign = 'center'
    ctx.fillText('Candidate #', PAD.left + plotW / 2, H - 8)

    // legend
    const positions = [...new Set(candidates.map(c => c.position))]
    let lx = PAD.left
    const ly = H - 2
    positions.forEach(pos => {
      const color = POSITION_COLORS[pos] ?? '#888'
      ctx.beginPath()
      ctx.arc(lx + 5, ly - 10, 5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()
      ctx.fillStyle = 'rgba(255,255,255,0.5)'
      ctx.font = '10px JetBrains Mono, monospace'
      ctx.textAlign = 'left'
      ctx.fillText(pos, lx + 14, ly - 6)
      lx += ctx.measureText(pos).width + 30
    })

  }, [candidates])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: 320, display: 'block' }}
    />
  )
}

// ─── Position Bar ─────────────────────────────────────────────────────────────

function PositionBar({ position, count, max }: { position: string; count: number; max: number }) {
  const color = POSITION_COLORS[position] ?? '#888'
  return (
    <div style={{ marginBottom: 10 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
        <span style={{ fontSize: '0.78rem', color: 'var(--text)', fontWeight: 600 }}>{position}</span>
        <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
      </div>
      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
        <div style={{
          width: `${(count / max) * 100}%`,
          height: '100%',
          background: color,
          borderRadius: 4,
          transition: 'width 0.5s ease',
        }} />
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IMSStatisticsPage() {
  const [stats, setStats]   = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState<string | null>(null)

  useEffect(() => {
    async function load() {
      try {
        const snap = await getDocs(collection(db, 'candidates'))
        if (snap.empty) { setStats(null); return }

        let total = 0, totalScore = 0
        let highest = 0, lowest = 100
        let best: Candidate | null = null
        const byPosition: Record<string, number> = {}
        const scoreRanges: Record<string, number> = { '0–30': 0, '30–50': 0, '50–70': 0, '70–85': 0, '85–100': 0 }
        const all: Candidate[] = []

        snap.forEach(d => {
          const c = { id: d.id, ...d.data() } as Candidate
          total++
          totalScore += c.score ?? 0
          byPosition[c.position] = (byPosition[c.position] ?? 0) + 1
          const s = c.score ?? 0
          if (s < 30) scoreRanges['0–30']++
          else if (s < 50) scoreRanges['30–50']++
          else if (s < 70) scoreRanges['50–70']++
          else if (s < 85) scoreRanges['70–85']++
          else scoreRanges['85–100']++
          if (s > highest) { highest = s; best = c }
          if (s < lowest) lowest = s
          all.push(c)
        })

        all.sort((a, b) => a.timestamp - b.timestamp)
        setStats({ total, avgScore: Math.round(totalScore / total), highestScore: highest, lowestScore: lowest, bestCandidate: best, byPosition, scoreRanges, all })
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Failed to load statistics')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <Link href="/ims" style={{
          padding: '7px 16px',
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          color: 'var(--text-dim)',
          textDecoration: 'none',
          fontSize: '0.8rem',
        }}>← Back</Link>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)', marginBottom: 2 }}>
            IMS Statistics
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>Interview performance analytics</p>
        </div>
      </div>

      {loading && (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
          Loading statistics...
        </div>
      )}

      {error && (
        <div className="glass-card" style={{ padding: 20, color: '#ef4444', fontSize: '0.82rem' }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && !stats && (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '3rem', opacity: 0.3, marginBottom: 12 }}>📊</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>No data yet</div>
        </div>
      )}

      {stats && (
        <>
          {/* Summary */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            <StatCard icon="👥" value={String(stats.total)}          label="Total Candidates" />
            <StatCard icon="📊" value={`${stats.avgScore}%`}         label="Average Score" />
            <StatCard icon="🏆" value={`${stats.highestScore}%`}     label="Highest Score" />
            <StatCard icon="📉" value={`${stats.lowestScore}%`}      label="Lowest Score" />
          </div>

          {/* Top Candidate */}
          {stats.bestCandidate && (
            <div className="glass-card" style={{
              padding: '20px 24px',
              marginBottom: 20,
              borderColor: 'rgba(0,168,122,0.3)',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              flexWrap: 'wrap',
            }}>
              <span style={{ fontSize: '1.6rem' }}>🌟</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>
                  Top Candidate
                </div>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: 'var(--text)' }}>
                  {stats.bestCandidate.name}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
                  {stats.bestCandidate.position}
                </div>
              </div>
              <div style={{
                padding: '10px 22px',
                background: scoreColor(stats.bestCandidate.score),
                borderRadius: 10,
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: 800,
                fontSize: '1.3rem',
                color: '#fff',
              }}>
                {Math.round(stats.bestCandidate.score)}%
              </div>
            </div>
          )}

          {/* Charts row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {/* Score distribution */}
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 16 }}>
                Score Distribution
              </div>
              {Object.entries(stats.scoreRanges).map(([range, count]) => {
                const max = Math.max(...Object.values(stats.scoreRanges))
                return (
                  <div key={range} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace' }}>{range}%</span>
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>{count}</span>
                    </div>
                    <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                      <div style={{
                        width: max > 0 ? `${(count / max) * 100}%` : '0%',
                        height: '100%',
                        background: 'var(--primary)',
                        borderRadius: 4,
                      }} />
                    </div>
                  </div>
                )
              })}
            </div>

            {/* By position */}
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 16 }}>
                Candidates by Position
              </div>
              {Object.entries(stats.byPosition).sort((a, b) => b[1] - a[1]).map(([pos, count]) => (
                <PositionBar key={pos} position={pos} count={count} max={Math.max(...Object.values(stats.byPosition))} />
              ))}
            </div>
          </div>

          {/* Scatter chart */}
          <div className="glass-card" style={{ padding: '20px 24px' }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 16 }}>
              Candidates Performance Overview
            </div>
            <ScatterChart candidates={stats.all} />
          </div>
        </>
      )}
    </div>
  )
}
