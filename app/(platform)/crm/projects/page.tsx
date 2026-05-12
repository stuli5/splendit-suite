'use client'

import { useEffect, useState } from 'react'
import { getProjects } from '@/lib/projects'
import type { Project, ProjectStatus } from '@/lib/types'
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

  async function load() {
    setLoading(true)
    setProjects(await getProjects())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

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

      {/* Projects grid */}
      {loading ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace' }}>
          Loading projects...
        </div>
      ) : filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace' }}>
          {projects.length === 0 ? 'No projects yet. Create your first project.' : 'No projects match your search.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 12 }}>
          {filtered.map(p => {
            const color = STATUS_COLOR[p.status]
            return (
              <div
                key={p.id}
                onClick={() => setSelected(p)}
                className="glass-card"
                style={{
                  padding: '18px 20px', cursor: 'pointer',
                  borderLeft: `3px solid ${color}`,
                  transition: 'transform 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = 'translateY(-2px)'
                  el.style.boxShadow = `0 8px 28px rgba(0,0,0,0.1)`
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.transform = 'translateY(0)'
                  el.style.boxShadow = ''
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: 'var(--text)', margin: 0, lineHeight: 1.3 }}>
                    {p.positionName}
                  </h3>
                  <span style={{
                    fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20, flexShrink: 0,
                    background: `${color}18`, color, fontFamily: 'JetBrains Mono, monospace',
                    border: `1px solid ${color}30`,
                  }}>
                    {STATUS_LABELS[p.status]}
                  </span>
                </div>
                <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.76rem', color: 'var(--text-dim)', marginBottom: 12 }}>
                  {p.companyName}
                </div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(0,168,122,0.08)', color: 'var(--primary)', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>
                    {p.type}
                  </span>
                  <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(0,0,0,0.05)', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                    {p.cooperationType}
                  </span>
                  {p.salary && (
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: 20, background: 'rgba(107,70,168,0.08)', color: '#6b46a8', fontFamily: 'JetBrains Mono, monospace' }}>
                      {p.salary}
                    </span>
                  )}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: '#bbb' }}>
                    {timeAgo(p.createdAt)}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: 'var(--text-dim)' }}>
                    {p.phases.length} stages · {p.requiredCount} req.
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* New project modal */}
      {showNew && (
        <ProjectModal
          onClose={() => setShowNew(false)}
          onSaved={() => { setShowNew(false); load() }}
        />
      )}

      {/* Project detail panel */}
      {selected && (
        <ProjectDetailPanel
          project={selected}
          onClose={() => setSelected(null)}
          onUpdated={updated => { setSelected(updated); load() }}
        />
      )}
    </div>
  )
}
