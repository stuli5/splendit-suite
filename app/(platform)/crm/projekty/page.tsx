'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { getProjects, deleteProject } from '@/lib/projects'
import type { Project, ProjectPhase, ProjectStatus } from '@/lib/types'
import ProjectModal from '@/components/projects/ProjectModal'

const PHASE_COLORS: Record<ProjectPhase, string> = {
  contacted:    '#0091c7',
  presentation: '#6b46a8',
  interview:    '#00a87a',
  rejected:     '#e0457a',
  onboarding:   '#f59e0b',
  closed:       '#7ab8ae',
}

const PHASE_LABELS: Record<ProjectPhase, string> = {
  contacted:    'Contacted',
  presentation: 'Presentation',
  interview:    'Interview',
  rejected:     'Rejected',
  onboarding:   'Onboarding',
  closed:       'Closed',
}

const STATUS_COLORS: Record<ProjectStatus, string> = {
  'active':  '#00a87a',
  'on-hold': '#f59e0b',
  'closed':  '#7ab8ae',
}

const STATUS_LABELS: Record<ProjectStatus, string> = {
  'active':  'Active',
  'on-hold': 'On Hold',
  'closed':  'Closed',
}

export default function ProjektyPage() {
  const router = useRouter()
  const [projects,   setProjects]   = useState<Project[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState<Project | undefined>()
  const [filterStatus, setFilterStatus] = useState<ProjectStatus | 'all'>('all')

  async function load() {
    setLoading(true)
    setProjects(await getProjects())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(p: Project) {
    if (!confirm(`Delete project "${p.positionName}"?`)) return
    await deleteProject(p.id)
    load()
  }

  const filtered = projects.filter(p => {
    const matchSearch =
      p.positionName.toLowerCase().includes(search.toLowerCase()) ||
      p.companyName.toLowerCase().includes(search.toLowerCase()) ||
      p.responsible?.toLowerCase().includes(search.toLowerCase())
    const matchStatus = filterStatus === 'all' || p.status === filterStatus
    return matchSearch && matchStatus
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
            📁 Projects
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Active positions & recruitment orders
          </p>
        </div>
        <button
          onClick={() => { setEditing(undefined); setShowModal(true) }}
          style={{
            padding: '10px 20px', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          + New Project
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by position, company or responsible..."
          style={{
            flex: 1, minWidth: 260, padding: '10px 14px', borderRadius: 9,
            border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(255,255,255,0.8)',
            fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text)', outline: 'none',
          }}
        />
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', 'active', 'on-hold', 'closed'] as const).map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              style={{
                padding: '8px 14px', borderRadius: 8, border: 'none', cursor: 'pointer',
                fontSize: '0.75rem', fontWeight: 600, fontFamily: 'JetBrains Mono, monospace',
                background: filterStatus === s ? 'var(--primary)' : 'rgba(255,255,255,0.8)',
                color: filterStatus === s ? 'white' : 'var(--text-dim)',
                transition: 'all 0.15s',
              }}
            >
              {s === 'all' ? 'All' : STATUS_LABELS[s as ProjectStatus]}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--card-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
            Projects
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {filtered.length} records
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            {projects.length === 0
              ? 'No projects yet. Create the first one by clicking "+ New Project".'
              : 'No results for the search term.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,168,122,0.04)' }}>
                {['Position', 'Company', 'Cooperation', 'Salary', 'Phases', 'Status', 'Count', 'Responsible', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem',
                    color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--card-border)',
                  }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr
                  key={p.id}
                  onClick={() => router.push(`/crm/projekty/${p.id}`)}
                  style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--card-border)' : 'none', cursor: 'pointer' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,168,122,0.03)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* Position */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{p.positionName}</div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
                      {new Date(p.createdAt).toLocaleDateString('en-GB')}
                    </div>
                  </td>
                  {/* Company */}
                  <td style={{ padding: '13px 16px', fontSize: '0.82rem', color: 'var(--text)' }}>
                    {p.companyName}
                  </td>
                  {/* Cooperation */}
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 700,
                      color: p.cooperationType === 'HPP' ? '#00a87a' : p.cooperationType === 'BS' ? '#6b46a8' : '#0091c7',
                      background: p.cooperationType === 'HPP' ? '#00a87a18' : p.cooperationType === 'BS' ? '#6b46a818' : '#0091c718',
                      padding: '3px 10px', borderRadius: 20,
                    }}>
                      {p.cooperationType ?? '—'}
                    </span>
                  </td>
                  {/* Salary */}
                  <td style={{ padding: '13px 16px', fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                    {p.salary || '—'}
                  </td>
                  {/* Phases */}
                  <td style={{ padding: '13px 16px', maxWidth: 260 }}>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {p.phases.map(ph => (
                        <span key={ph} style={{
                          fontSize: '0.68rem', fontWeight: 600,
                          color: PHASE_COLORS[ph],
                          background: `${PHASE_COLORS[ph]}18`,
                          padding: '2px 8px', borderRadius: 20,
                        }}>
                          {PHASE_LABELS[ph]}
                        </span>
                      ))}
                    </div>
                  </td>
                  {/* Type */}
                  <td style={{ padding: '13px 16px', fontSize: '0.78rem', color: 'var(--text-muted)', textTransform: 'capitalize' }}>
                    {p.type}
                  </td>
                  {/* Status */}
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      color: STATUS_COLORS[p.status],
                      background: `${STATUS_COLORS[p.status]}18`,
                      padding: '3px 10px', borderRadius: 20,
                    }}>
                      {STATUS_LABELS[p.status]}
                    </span>
                  </td>
                  {/* Count */}
                  <td style={{ padding: '13px 16px', fontSize: '0.82rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                    {p.requiredCount}
                  </td>
                  {/* Responsible */}
                  <td style={{ padding: '13px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                    {p.responsible || '—'}
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '13px 16px' }} onClick={e => e.stopPropagation()}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => { setEditing(p); setShowModal(true) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#e0457a', fontWeight: 600 }}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <ProjectModal
          project={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
