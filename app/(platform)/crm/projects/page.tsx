'use client'

import { useEffect, useState } from 'react'
import { getProjects } from '@/lib/projects'
import type { Project, ProjectStatus } from '@/lib/types'
import { useSidebar } from '@/lib/sidebar-context'
import ProjectModal from '@/components/projects/ProjectModal'
import ProjectDetailPanel from '@/components/projects/ProjectDetailPanel'

const STATUS_COLOR: Record<ProjectStatus, string> = {
  active:   '#00a87a',
  'on-hold': '#f59e0b',
  closed:   '#e0457a',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  active:   'Active',
  'on-hold': 'On Hold',
  closed:   'Closed',
}

function timeAgo(ts: number): string {
  const days = Math.floor((Date.now() - ts) / 86_400_000)
  if (days === 0) return 'today'
  if (days < 30)  return `${days}d ago`
  return `${Math.floor(days / 30)}mo ago`
}

export default function ProjectsPage() {
  const [projects,  setProjects]  = useState<Project[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [filter,    setFilter]    = useState<ProjectStatus | 'all'>('all')
  const [showNew,   setShowNew]   = useState(false)
  const [selected,  setSelected]  = useState<Project | null>(null)
  const { setCollapsed } = useSidebar()

  async function load() {
    setLoading(true)
    setProjects(await getProjects())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  // Collapse sidebar when a project is open
  useEffect(() => {
    setCollapsed(selected !== null)
  }, [selected, setCollapsed])

  const filtered = projects.filter(p => {
    const q = search.toLowerCase()
    const matchesSearch = !q || p.positionName.toLowerCase().includes(q) || p.companyName.toLowerCase().includes(q)
    const matchesFilter = filter === 'all' || p.status === filter
    return matchesSearch && matchesFilter
  })

  const filterBtnStyle = (active: boolean): React.CSSProperties => ({
    padding: '6px 14px', borderRadius: 20, cursor: 'pointer', border: 'none',
    background: active ? 'var(--primary)' : 'rgba(0,168,122,0.08)',
    color: active ? '#fff' : 'var(--text-dim)',
    fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', fontWeight: active ? 700 : 500,
    transition: 'all 0.15s',
  })

  // Full-screen project detail
  if (selected) {
    return (
      <div style={{ margin: '-32px -36px', minHeight: '100vh' }}>
        <ProjectDetailPanel
          project={selected}
          onClose={() => setSelected(null)}
          onUpdated={updated => { setSelected(updated); load() }}
        />
      </div>
    )
  }

  return (
    <div>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)', margin: 0 }}>
            Projects
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4, marginBottom: 0 }}>
            Active positions & recruitment pipelines
          </p>
        </div>
        <button
          onClick={() => setShowNew(true)}
          style={{
            padding: '10px 22px', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          + New Project
        </button>
      </div>

      {/* Search + filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 24, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search projects..."
          style={{
            padding: '9px 14px', borderRadius: 9,
            border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(255,255,255,0.9)',
            fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: 'var(--text)',
            outline: 'none', width: 240,
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'active', 'on-hold', 'closed'] as const).map(s => (
            <button key={s} onClick={() => setFilter(s)} style={filterBtnStyle(filter === s)}>
              {s === 'all' ? 'All' : STATUS_LABELS[s]}
            </button>
          ))}
        </div>
      </div>

      {/* Projects list */}
      {loading ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace' }}>
          Loading projects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace' }}>
          {projects.length === 0 ? 'No projects yet. Create your first project.' : 'No projects match your search.'}
        </div>
      ) : (
        <div className="glass-card" style={{ overflow: 'hidden', padding: 0 }}>
          {/* Table header */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1.5fr 100px 110px 110px 90px 80px',
            padding: '10px 20px',
            background: 'rgba(0,168,122,0.04)',
            borderBottom: '1px solid rgba(0,168,122,0.1)',
          }}>
            {['Position', 'Company', 'Type', 'Cooperation', 'Salary', 'Required', 'Created'].map(h => (
              <span key={h} style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.62rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                {h}
              </span>
            ))}
          </div>

          {/* Rows */}
          {filtered.map((p, i) => {
            const color = STATUS_COLOR[p.status]
            return (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '2fr 1.5fr 100px 110px 110px 90px 80px',
                  padding: '14px 20px',
                  cursor: 'pointer',
                  borderBottom: i < filtered.length - 1 ? '1px solid rgba(0,0,0,0.05)' : 'none',
                  borderLeft: `3px solid ${color}`,
                  transition: 'background 0.12s',
                  alignItems: 'center',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,168,122,0.04)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                {/* Position + status */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
                  <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {p.positionName}
                  </span>
                  <span style={{
                    fontSize: '0.6rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20, flexShrink: 0,
                    background: `${color}18`, color, fontFamily: 'JetBrains Mono, monospace',
                    border: `1px solid ${color}30`,
                  }}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>

                {/* Company */}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {p.companyName}
                </span>

                {/* Type */}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>
                  {p.type}
                </span>

                {/* Cooperation */}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  {p.cooperationType}
                </span>

                {/* Salary */}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#6b46a8', fontWeight: 600 }}>
                  {p.salary ?? '—'}
                </span>

                {/* Required */}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'var(--text-dim)' }}>
                  {p.requiredCount} req.
                </span>

                {/* Created */}
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: '#bbb' }}>
                  {timeAgo(p.createdAt)}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {showNew && (
        <ProjectModal
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load() }}
        />
      )}
    </div>
  )
}
