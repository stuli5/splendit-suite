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
      background: '#fff',
      borderRadius: 12,
      padding: '22px 26px',
      border: '1px solid #e8e8e8',
      cursor: 'pointer',
      transition: 'box-shadow 0.15s, border-color 0.15s',
    }}
      onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)'; (e.currentTarget as HTMLDivElement).style.borderColor = '#d0d0d0' }}
      onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.boxShadow = 'none'; (e.currentTarget as HTMLDivElement).style.borderColor = '#e8e8e8' }}
    >
      {/* Title row */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 10 }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: '#111', margin: 0, letterSpacing: '-0.01em' }}>
          {job.title}
        </h2>
        {salary && (
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, fontSize: '0.85rem', color: '#111', whiteSpace: 'nowrap', flexShrink: 0 }}>
            {salary} / mo
          </span>
        )}
      </div>

      {/* Work mode badge + location */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
        <span style={{
          fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
          background: `${modeColor}18`, color: modeColor,
          fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.03em',
        }}>
          {WORK_MODE_LABELS[job.workMode]}
        </span>
        <span style={{ fontSize: '0.78rem', color: '#666', fontFamily: 'JetBrains Mono, monospace' }}>
          {job.location}
        </span>
      </div>

      {/* Company + type */}
      <div style={{ fontSize: '0.78rem', color: '#999', fontFamily: 'JetBrains Mono, monospace', marginBottom: 12 }}>
        SplendIT · {JOB_TYPE_LABELS[job.type]}
      </div>

      {/* Description snippet */}
      <p style={{ fontSize: '0.82rem', color: '#555', lineHeight: 1.65, margin: 0, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
        {job.description}
      </p>

      {/* Tags */}
      {job.tags.length > 0 && (
        <div style={{ display: 'flex', gap: 5, marginTop: 14, flexWrap: 'wrap' }}>
          {job.tags.map(tag => (
            <span key={tag} style={{ fontSize: '0.68rem', padding: '3px 9px', borderRadius: 20, background: '#f4f4f4', color: '#555', fontFamily: 'JetBrains Mono, monospace' }}>
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
      padding: '5px 13px', borderRadius: 20, cursor: 'pointer',
      background: active ? '#111' : '#fff',
      color: active ? '#fff' : '#555',
      fontSize: '0.73rem', fontFamily: 'JetBrains Mono, monospace', fontWeight: active ? 600 : 400,
      border: active ? '1px solid #111' : '1px solid #e0e0e0',
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
    <main style={{ maxWidth: 760, margin: '0 auto', padding: '52px 24px' }}>
      {/* Hero */}
      <div style={{ marginBottom: 36 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: '2rem', color: '#111', marginBottom: 8, letterSpacing: '-0.03em' }}>
          Open Positions
        </h1>
        <p style={{ color: '#888', fontSize: '0.85rem', lineHeight: 1.7, fontFamily: 'JetBrains Mono, monospace' }}>
          We connect IT professionals with great companies. Join a project or a permanent role.
        </p>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 16 }}>
        <input
          type="search"
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search positions, skills, location..."
          style={{
            width: '100%', padding: '11px 16px', borderRadius: 9,
            border: '1px solid #e0e0e0', background: '#fff',
            fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace',
            color: '#111', outline: 'none', boxSizing: 'border-box',
          }}
        />
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 28, flexWrap: 'wrap' }}>
        {MODES.map(m => (
          <FilterBtn key={m} active={mode === m} onClick={() => setMode(m)}>
            {m === ALL ? 'All modes' : WORK_MODE_LABELS[m]}
          </FilterBtn>
        ))}
        <div style={{ width: 1, background: '#e8e8e8', margin: '0 4px' }} />
        {TYPES.map(t => (
          <FilterBtn key={t} active={type === t} onClick={() => setType(t)}>
            {t === ALL ? 'All types' : JOB_TYPE_LABELS[t]}
          </FilterBtn>
        ))}
      </div>

      {/* Results */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#bbb', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace' }}>
          Loading positions...
        </div>
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '80px 0', color: '#bbb', fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace' }}>
          {jobs.length === 0 ? 'No open positions at the moment. Check back soon!' : 'No positions match your filters.'}
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: '0.72rem', color: '#bbb', marginBottom: 4, fontFamily: 'JetBrains Mono, monospace' }}>
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
