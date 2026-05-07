'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getPublishedJobs, formatSalary, JOB_TYPE_LABELS, WORK_MODE_LABELS, WORK_MODE_COLORS } from '@/lib/jobs'
import type { Job, WorkMode, JobType } from '@/lib/types'

// ── Job Card ──────────────────────────────────────────────────────────────────

function JobCard({ job }: { job: Job }) {
  const salary    = formatSalary(job)
  const modeColor = WORK_MODE_COLORS[job.workMode] ?? '#888'

  return (
    <div style={{
      background: 'rgba(255,255,255,0.85)',
      borderRadius: 14,
      padding: '24px 28px',
      border: '1px solid rgba(0,168,122,0.12)',
      boxShadow: '0 2px 14px rgba(0,0,0,0.05)',
      cursor: 'pointer',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
        <div style={{ flex: 1 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.05rem', color: '#0f2e2a', marginBottom: 6 }}>
            {job.title}
          </h2>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontSize: '0.78rem', color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>
              {job.location}
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#ccc' }} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: modeColor, fontFamily: 'JetBrains Mono, monospace' }}>
              {WORK_MODE_LABELS[job.workMode]}
            </span>
            <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#ccc' }} />
            <span style={{ fontSize: '0.75rem', color: '#888', fontFamily: 'JetBrains Mono, monospace' }}>
              {JOB_TYPE_LABELS[job.type]}
            </span>
          </div>
          <p style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.6, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
            {job.description}
          </p>
        </div>
        {salary && (
          <div style={{ textAlign: 'right', flexShrink: 0 }}>
            <div style={{ fontSize: '0.82rem', fontWeight: 700, color: '#00a87a', fontFamily: 'JetBrains Mono, monospace', whiteSpace: 'nowrap' }}>
              {salary}
            </div>
            <div style={{ fontSize: '0.65rem', color: '#aaa', marginTop: 2 }}>/ month</div>
          </div>
        )}
      </div>
      {job.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 6, marginTop: 14, flexWrap: 'wrap' }}>
          {job.tags.map(tag => (
            <span key={tag} style={{
              fontSize: '0.68rem', padding: '3px 9px', borderRadius: 20,
              background: 'rgba(0,168,122,0.07)', color: '#00a87a',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Filter Bar ────────────────────────────────────────────────────────────────

const ALL = 'all'
const MODES:  Array<WorkMode | 'all'> = ['all', 'remote', 'hybrid', 'onsite']
const TYPES:  Array<JobType  | 'all'> = ['all', 'full-time', 'part-time', 'contract', 'freelance']

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick} style={{
      padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
      background: active ? '#00a87a' : 'rgba(255,255,255,0.7)',
      color: active ? '#fff' : '#555',
      fontSize: '0.75rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: active ? 600 : 400,
      border: active ? 'none' : '1px solid rgba(0,168,122,0.15)',
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
    <main style={{ maxWidth: 900, margin: '0 auto', padding: '52px 24px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 44 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '2.2rem', color: '#0f2e2a', marginBottom: 10, letterSpacing: '-0.02em' }}>
          Open Positions
        </h1>
        <p style={{ color: '#666', fontSize: '0.9rem', lineHeight: 1.7, maxWidth: 560, fontFamily: 'JetBrains Mono, monospace' }}>
          We connect IT professionals with great companies. Join a project or a permanent role.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search positions, skills, location..."
          style={{
            width: '100%', padding: '12px 18px', borderRadius: 10,
            border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(255,255,255,0.9)',
            fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace',
            color: '#0f2e2a', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 28, flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <FilterBtn key={m} active={mode === m} onClick={() => setMode(m)}>
            {m === ALL ? 'All modes' : WORK_MODE_LABELS[m]}
          </FilterBtn>
        ))}
        <div style={{ width: 1, background: 'rgba(0,168,122,0.15)', margin: '0 4px' }} />
        {TYPES.map(t => (
          <FilterBtn key={t} active={type === t} onClick={() => setType(t)}>
            {t === ALL ? 'All types' : JOB_TYPE_LABELS[t]}
          </FilterBtn>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaa', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace' }}>
          Loading positions...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#aaa', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace' }}>
          {jobs.length === 0 ? 'No open positions at the moment. Check back soon!' : 'No positions match your filters.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div style={{ fontSize: '0.72rem', color: '#aaa', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
            {filtered.length} position{filtered.length !== 1 ? 's' : ''}
          </div>
          {filtered.map(job => (
            <Link key={job.id} href={`/careers/${job.slug}`} style={{ textDecoration: 'none' }}>
              <JobCard job={job} />
            </Link>
          ))}
        </div>
      )}
    </main>
  )
}
