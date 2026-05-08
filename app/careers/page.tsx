'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPublishedJobs, formatSalary, JOB_TYPE_LABELS, WORK_MODE_LABELS } from '@/lib/jobs'
import type { Job, WorkMode, JobType } from '@/lib/types'

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const salary = formatSalary(job)

  return (
    <div style={{
      background: '#fff',
      borderRadius: 14,
      padding: '24px 28px',
      border: '1px solid #ebebeb',
      cursor: 'pointer',
      transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.18s',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 24,
    }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = '0 6px 28px rgba(0,168,122,0.1)'
        el.style.borderColor = 'rgba(0,168,122,0.3)'
        el.style.transform = 'translateY(-1px)'
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLDivElement
        el.style.boxShadow = 'none'
        el.style.borderColor = '#ebebeb'
        el.style.transform = 'translateY(0)'
      }}
    >
      {/* Left */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: '#111', margin: '0 0 8px', letterSpacing: '-0.01em' }}>
          {job.title}
        </h2>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
          <span style={{
            fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
            background: 'rgba(0,168,122,0.1)', color: '#00a87a',
            fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.03em',
          }}>
            {WORK_MODE_LABELS[job.workMode]}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'JetBrains Mono, monospace' }}>
            {job.location}
          </span>
          <span style={{ fontSize: '0.75rem', color: '#bbb', fontFamily: 'JetBrains Mono, monospace' }}>
            {JOB_TYPE_LABELS[job.type]}
          </span>
        </div>

        {job.tags.length > 0 && (
          <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
            {job.tags.slice(0, 5).map(tag => (
              <span key={tag} style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, background: '#f5f5f5', color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Right */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10, flexShrink: 0 }}>
        {salary && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.88rem', color: '#111' }}>
            {salary} / mo
          </span>
        )}
        <span style={{
          fontSize: '0.75rem', fontWeight: 600, padding: '7px 16px', borderRadius: 8,
          background: 'linear-gradient(135deg, #00a87a, #0091c7)',
          color: '#fff', fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap',
        }}>
          View job →
        </span>
      </div>
    </div>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

const ALL = 'all'
const MODES: Array<WorkMode | 'all'> = ['all', 'remote', 'hybrid', 'onsite']
const TYPES: Array<JobType  | 'all'> = ['all', 'full-time', 'part-time', 'contract', 'freelance']

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
      background: active ? '#0f1923' : 'rgba(255,255,255,0.08)',
      color: active ? '#fff' : 'rgba(255,255,255,0.6)',
      fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: active ? 600 : 400,
      border: active ? '1px solid #0f1923' : '1px solid rgba(255,255,255,0.15)',
      transition: 'all 0.15s',
    }}>
      {children}
    </button>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function CareersPage() {
  const [jobs,    setJobs]    = useState<Job[]>([])
  const [loading, setLoading] = useState(true)
  const [search,  setSearch]  = useState('')
  const [mode,    setMode]    = useState<WorkMode | 'all'>(ALL)
  const [type,    setType]    = useState<JobType | 'all'>(ALL)

  useEffect(() => {
    getPublishedJobs()
      .then(setJobs)
      .finally(() => setLoading(false))
  }, [])

  const filtered = jobs.filter(j => {
    const q = search.toLowerCase()
    const matchesSearch = !q
      || j.title.toLowerCase().includes(q)
      || j.description.toLowerCase().includes(q)
      || j.tags.some(t => t.toLowerCase().includes(q))
      || j.location.toLowerCase().includes(q)
    const matchesMode = mode === ALL || j.workMode === mode
    const matchesType = type === ALL || j.type === type
    return matchesSearch && matchesMode && matchesType
  })

  return (
    <main style={{ margin: 0, padding: 0, background: 'linear-gradient(135deg, #0a1628 0%, #0f2e2a 60%, #0a1e2e 100%)', minHeight: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Ambient glow blobs */}
      <div style={{ position: 'fixed', top: -120, right: '8%', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,168,122,0.12) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />
      <div style={{ position: 'fixed', bottom: -100, left: '3%', width: 500, height: 500, borderRadius: '50%', background: 'radial-gradient(circle, rgba(0,145,199,0.10) 0%, transparent 70%)', pointerEvents: 'none', zIndex: 0 }} />

      {/* ── Hero ── */}
      <div style={{
        padding: '72px 28px 80px',
        position: 'relative',
        zIndex: 1,
      }}>

        <div style={{ maxWidth: 760, margin: '0 auto', position: 'relative' }}>
          <div style={{ marginBottom: 16 }}>
            <span style={{
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', fontWeight: 600,
              color: '#00a87a', letterSpacing: '0.12em', textTransform: 'uppercase',
            }}>
              IT Consulting & Staffing · Prague
            </span>
          </div>

          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 900,
            fontSize: 'clamp(2.2rem, 5vw, 3.4rem)',
            color: '#fff', margin: '0 0 20px', letterSpacing: '-0.03em', lineHeight: 1.1,
          }}>
            Work on what<br />
            <span style={{ color: '#00a87a' }}>actually matters.</span>
          </h1>

          <p style={{
            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.88rem',
            color: 'rgba(255,255,255,0.55)', lineHeight: 1.8, margin: '0 0 36px', maxWidth: 480,
          }}>
            We place top IT professionals into the best projects and companies across Central Europe.
            Remote-first, contract or permanent — find your next role here.
          </p>

          {/* Search in hero */}
          <div style={{ position: 'relative', maxWidth: 500 }}>
            <span style={{ position: 'absolute', left: 16, top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
            <input
              type="search"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search positions, skills, location..."
              style={{
                width: '100%', padding: '14px 16px 14px 44px', borderRadius: 10,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.07)',
                fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace',
                color: '#fff', outline: 'none', boxSizing: 'border-box',
                backdropFilter: 'blur(10px)',
              }}
            />
          </div>

          {/* Filters inside hero */}
          <div style={{ display: 'flex', gap: 6, marginTop: 16, flexWrap: 'wrap' }}>
            {MODES.map(m => (
              <FilterBtn key={m} active={mode === m} onClick={() => setMode(m)}>
                {m === ALL ? 'All modes' : WORK_MODE_LABELS[m]}
              </FilterBtn>
            ))}
            <div style={{ width: 1, background: 'rgba(255,255,255,0.1)', margin: '0 4px' }} />
            {TYPES.map(t => (
              <FilterBtn key={t} active={type === t} onClick={() => setType(t)}>
                {t === ALL ? 'All types' : JOB_TYPE_LABELS[t]}
              </FilterBtn>
            ))}
          </div>
        </div>
      </div>

      {/* ── Listings ── */}
      <div style={{ maxWidth: 760, margin: '0 auto', padding: '40px 28px 60px', position: 'relative', zIndex: 1 }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#bbb', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace' }}>
            Loading positions...
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 0', color: '#bbb', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace' }}>
            {jobs.length === 0 ? 'No open positions at the moment. Check back soon!' : 'No positions match your filters.'}
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            <div style={{ fontSize: '0.72rem', color: '#bbb', marginBottom: 16, fontFamily: 'JetBrains Mono, monospace' }}>
              {filtered.length} open position{filtered.length !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {filtered.map(job => (
                <Link key={job.id} href={`/careers/${job.slug}`} style={{ textDecoration: 'none' }}>
                  <JobCard job={job} />
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

    </main>
  )
}
