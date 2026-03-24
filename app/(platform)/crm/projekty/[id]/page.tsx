'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getProject } from '@/lib/projects'
import { getProjectCandidates, addCandidateToProject, updateCandidatePhase, removeCandidateFromProject } from '@/lib/project-candidates'
import { getCRMCandidates } from '@/lib/crm-candidates'
import type { Project, ProjectPhase, ProjectStatus, CooperationType, ProjectCandidate, CRMCandidate } from '@/lib/types'
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

const PHASE_ORDER: ProjectPhase[] = [
  'contacted', 'presentation', 'interview', 'onboarding', 'rejected', 'closed',
]

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

const COOP_COLORS: Record<CooperationType, string> = {
  HPP:  '#00a87a',
  BS:   '#6b46a8',
  both: '#0091c7',
}

function linkedInUrl(raw: string): string {
  if (raw.startsWith('http')) return raw
  const handle = raw.replace(/^.*linkedin\.com\/in\//i, '').replace(/\/$/, '')
  return `https://linkedin.com/in/${handle}`
}

function gitHubUrl(raw: string): string {
  if (raw.startsWith('http')) return raw
  const handle = raw.replace(/^.*github\.com\//i, '').replace(/\/$/, '')
  return `https://github.com/${handle}`
}

// ── Add Candidate Picker ──────────────────────────────────────────────────────

function AddCandidatePicker({
  phase, projectId, existingIds, onAdded, onClose,
}: {
  phase: ProjectPhase
  projectId: string
  existingIds: Set<string>
  onAdded: () => void
  onClose: () => void
}) {
  const [all,    setAll]    = useState<CRMCandidate[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { getCRMCandidates().then(setAll) }, [])

  const filtered = all
    .filter(c => !existingIds.has(c.id))
    .filter(c => {
      const q = search.toLowerCase()
      return (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q)  ||
        c.position.toLowerCase().includes(q)
      )
    })

  async function pick(c: CRMCandidate) {
    const entry: Omit<ProjectCandidate, 'id' | 'addedAt'> = {
      projectId,
      candidateId:        c.id,
      candidateFirstName: c.firstName,
      candidateLastName:  c.lastName,
      candidatePosition:  c.position,
      phase,
    }
    if (c.linkedIn) entry.linkedIn = c.linkedIn
    if (c.gitHub)   entry.gitHub   = c.gitHub
    await addCandidateToProject(entry)
    onAdded()
  }

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.97)', borderRadius: 14,
        width: '100%', maxWidth: 440, maxHeight: '70vh',
        overflow: 'hidden', display: 'flex', flexDirection: 'column',
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
      }}>
        <div style={{
          padding: '18px 20px', borderBottom: '1px solid rgba(0,168,122,0.12)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
            Add to <span style={{ color: PHASE_COLORS[phase] }}>{PHASE_LABELS[phase]}</span>
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-dim)' }}>✕</button>
        </div>

        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,168,122,0.08)' }}>
          <input
            autoFocus
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search candidate..."
            style={{
              width: '100%', padding: '9px 12px', borderRadius: 8,
              border: '1px solid rgba(0,168,122,0.25)', background: 'rgba(255,255,255,0.9)',
              fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
            }}
          />
        </div>

        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              {all.length === 0 ? 'No candidates in CRM yet.' : 'No results.'}
            </div>
          ) : (
            filtered.map(c => (
              <div
                key={c.id}
                onClick={() => pick(c)}
                style={{
                  padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10,
                  borderBottom: '1px solid rgba(0,168,122,0.06)',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0faf8')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <div style={{
                  width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '0.75rem', fontWeight: 700, color: 'white',
                }}>
                  {c.firstName[0]}{c.lastName[0]}
                </div>
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                    {c.firstName} {c.lastName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{c.position}</div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [project,    setProject]    = useState<Project | null>(null)
  const [pcList,     setPcList]     = useState<ProjectCandidate[]>([])
  const [loading,    setLoading]    = useState(true)
  const [showEdit,   setShowEdit]   = useState(false)
  const [addPhase,   setAddPhase]   = useState<ProjectPhase | null>(null)
  const [dragId,     setDragId]     = useState<string | null>(null)
  const [dragOver,   setDragOver]   = useState<ProjectPhase | null>(null)
  const [matching,   setMatching]   = useState(false)
  const [matches,    setMatches]    = useState<{ candidateId: string; score: number; label: string; reason: string }[]>([])

  async function load() {
    setLoading(true)
    const [p, pcs] = await Promise.all([getProject(id), getProjectCandidates(id)])
    setProject(p)
    setPcList(pcs)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleRemove(pcId: string) {
    await removeCandidateFromProject(pcId)
    setPcList(prev => prev.filter(p => p.id !== pcId))
  }

  async function handleMovePhase(pcId: string, phase: ProjectPhase) {
    await updateCandidatePhase(pcId, phase)
    setPcList(prev => prev.map(p => p.id === pcId ? { ...p, phase } : p))
  }

  async function handleAiMatch() {
    if (!project) return
    setMatching(true)
    setMatches([])
    const allCandidates = await getCRMCandidates()
    const alreadyIn     = new Set(pcList.map(p => p.candidateId))
    const available     = allCandidates.filter(c => !alreadyIn.has(c.id))
    if (!available.length) { setMatching(false); return }
    const res  = await fetch('/api/ai/candidate-match', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ project, candidates: available }),
    })
    const json = await res.json()
    if (json.matches) setMatches(json.matches)
    setMatching(false)
  }

  async function handleDrop(targetPhase: ProjectPhase) {
    if (!dragId) return
    const pc = pcList.find(p => p.id === dragId)
    if (!pc || pc.phase === targetPhase) { setDragId(null); setDragOver(null); return }
    setPcList(prev => prev.map(p => p.id === dragId ? { ...p, phase: targetPhase } : p))
    setDragId(null)
    setDragOver(null)
    await updateCandidatePhase(dragId, targetPhase)
  }

  if (loading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
        <div style={{
          width: 32, height: 32,
          border: '3px solid rgba(0,168,122,0.2)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!project) {
    return (
      <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
        Project not found.{' '}
        <button onClick={() => router.push('/crm/projekty')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
          Back to Projects
        </button>
      </div>
    )
  }

  const orderedPhases = PHASE_ORDER.filter(ph => project.phases.includes(ph))
  const existingIds   = new Set(pcList.map(p => p.candidateId))

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
        <button
          onClick={() => router.push('/crm/projekty')}
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}
        >
          Projects
        </button>
        <span style={{ color: 'var(--text-dim)' }}>›</span>
        <span style={{ color: 'var(--text)', fontWeight: 600 }}>{project.positionName}</span>
        <span style={{ color: 'var(--text-dim)' }}>—</span>
        <span style={{ color: 'var(--text-dim)' }}>{project.companyName}</span>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)', marginBottom: 6 }}>
            {project.positionName}
          </h1>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>{project.companyName}</span>
            <span style={{ color: 'var(--text-dim)' }}>·</span>
            <span style={{
              fontSize: '0.72rem', fontWeight: 600,
              color: STATUS_COLORS[project.status],
              background: `${STATUS_COLORS[project.status]}18`,
              padding: '3px 10px', borderRadius: 20,
            }}>
              {STATUS_LABELS[project.status]}
            </span>
            <span style={{
              fontSize: '0.72rem', fontWeight: 700,
              color: COOP_COLORS[project.cooperationType ?? 'HPP'],
              background: `${COOP_COLORS[project.cooperationType ?? 'HPP']}18`,
              padding: '3px 10px', borderRadius: 20,
            }}>
              {project.cooperationType ?? 'HPP'}
            </span>
            {project.salary && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>
                💰 {project.salary}
              </span>
            )}
            {project.responsible && (
              <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>👤 {project.responsible}</span>
            )}
          </div>
        </div>
        <button
          onClick={() => setShowEdit(true)}
          style={{
            padding: '9px 20px', borderRadius: 9, border: '1px solid rgba(0,168,122,0.3)',
            background: 'transparent', color: 'var(--primary)',
            fontSize: '0.82rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer',
          }}
        >
          Edit Project
        </button>
      </div>

      {/* Description */}
      {project.description && (
        <div className="glass-card" style={{ padding: '16px 24px', marginBottom: 24, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {project.description}
        </div>
      )}

      {/* Pipeline header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Pipeline</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: 10 }}>
            {orderedPhases.length} phases · {pcList.length} candidate{pcList.length !== 1 ? 's' : ''} · {project.requiredCount} open position{project.requiredCount !== 1 ? 's' : ''}
          </span>
        </div>
        <button
          onClick={handleAiMatch}
          disabled={matching}
          style={{
            padding: '7px 16px', borderRadius: 8, border: 'none', cursor: matching ? 'not-allowed' : 'pointer',
            background: matching ? 'rgba(107,70,168,0.2)' : 'rgba(107,70,168,0.12)',
            color: '#6b46a8', fontSize: '0.78rem', fontWeight: 700,
          }}
        >
          {matching ? '✨ Matching...' : '✨ AI Match Candidates'}
        </button>
      </div>

      {/* AI Match Results */}
      {matches.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#6b46a8' }}>
              ✨ AI Suggested Matches
            </span>
            <button onClick={() => setMatches([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem' }}>Dismiss</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matches.map(m => {
              const scoreColor = m.score >= 80 ? '#00a87a' : m.score >= 60 ? '#f59e0b' : '#e0457a'
              return (
                <div key={m.candidateId} style={{
                  display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px',
                  background: 'rgba(107,70,168,0.04)', borderRadius: 9,
                  border: '1px solid rgba(107,70,168,0.12)',
                }}>
                  <div style={{
                    minWidth: 42, height: 42, borderRadius: 9, display: 'flex', alignItems: 'center',
                    justifyContent: 'center', flexDirection: 'column',
                    background: `${scoreColor}18`, border: `1.5px solid ${scoreColor}40`,
                  }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{m.score}</span>
                    <span style={{ fontSize: '0.55rem', color: scoreColor, fontWeight: 600 }}>{m.label}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>
                      {pcList.find(p => p.candidateId === m.candidateId)?.candidateFirstName ?? m.candidateId}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{m.reason}</div>
                  </div>
                  <button
                    onClick={() => setAddPhase('contacted')}
                    style={{
                      padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer',
                      background: 'var(--primary)', color: 'white', fontSize: '0.72rem', fontWeight: 700,
                    }}
                  >
                    + Add
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Pipeline board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${orderedPhases.length}, minmax(200px, 1fr))`,
        gap: 12,
        overflowX: 'auto',
        paddingBottom: 8,
      }}>
        {orderedPhases.map(phase => {
          const phaseCandidates = pcList.filter(p => p.phase === phase)
          return (
            <div
              key={phase}
              onDragOver={e => { e.preventDefault(); setDragOver(phase) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(phase)}
              style={{
                background: dragOver === phase ? `${PHASE_COLORS[phase]}10` : 'rgba(255,255,255,0.7)',
                backdropFilter: 'blur(12px)',
                border: dragOver === phase
                  ? `1.5px solid ${PHASE_COLORS[phase]}80`
                  : `1.5px solid ${PHASE_COLORS[phase]}30`,
                borderRadius: 12,
                minHeight: 320,
                display: 'flex',
                flexDirection: 'column',
                transition: 'all 0.15s',
              }}
            >
              {/* Column header */}
              <div style={{
                padding: '12px 14px',
                borderBottom: `2px solid ${PHASE_COLORS[phase]}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{ fontSize: '0.72rem', fontWeight: 700, color: PHASE_COLORS[phase], letterSpacing: '0.05em', fontFamily: 'Syne, sans-serif' }}>
                  {PHASE_LABELS[phase].toUpperCase()}
                </span>
                <span style={{
                  fontSize: '0.68rem', fontWeight: 600,
                  background: `${PHASE_COLORS[phase]}18`,
                  color: PHASE_COLORS[phase],
                  padding: '2px 8px', borderRadius: 20,
                }}>
                  {phaseCandidates.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ flex: 1, padding: '10px 8px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {phaseCandidates.map(pc => (
                  <div
                    key={pc.id}
                    draggable
                    onDragStart={() => setDragId(pc.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null) }}
                    style={{
                      background: 'white',
                      borderRadius: 9,
                      padding: '10px 12px',
                      boxShadow: dragId === pc.id ? '0 8px 24px rgba(0,0,0,0.15)' : '0 2px 8px rgba(0,0,0,0.06)',
                      border: '1px solid rgba(0,168,122,0.1)',
                      cursor: 'grab',
                      opacity: dragId === pc.id ? 0.5 : 1,
                      transition: 'opacity 0.15s, box-shadow 0.15s',
                    }}
                  >
                    {/* Avatar + name */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                      <div style={{
                        width: 30, height: 30, borderRadius: '50%', flexShrink: 0,
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.68rem', fontWeight: 700, color: 'white',
                      }}>
                        {pc.candidateFirstName[0]}{pc.candidateLastName[0]}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pc.candidateFirstName} {pc.candidateLastName}
                        </div>
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {pc.candidatePosition}
                        </div>
                      </div>
                    </div>

                    {/* Profile links */}
                    {(pc.linkedIn || pc.gitHub) && (
                      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
                        {pc.linkedIn && (
                          <a href={linkedInUrl(pc.linkedIn)} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '0.68rem', fontWeight: 700, color: '#0077b5', background: '#0077b510', padding: '2px 8px', borderRadius: 5, textDecoration: 'none' }}>
                            in
                          </a>
                        )}
                        {pc.gitHub && (
                          <a href={gitHubUrl(pc.gitHub)} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: '0.75rem', color: '#24292e', background: '#24292e10', padding: '2px 8px', borderRadius: 5, textDecoration: 'none' }}>
                            🐙
                          </a>
                        )}
                      </div>
                    )}

                    {/* Remove */}
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 4 }}>
                      <button
                        onClick={() => handleRemove(pc.id)}
                        title="Remove from project"
                        style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e0457a', fontSize: '0.72rem', padding: '2px 4px', opacity: 0.6 }}
                        onMouseEnter={e => (e.currentTarget.style.opacity = '1')}
                        onMouseLeave={e => (e.currentTarget.style.opacity = '0.6')}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add button */}
                <button
                  onClick={() => setAddPhase(phase)}
                  style={{
                    width: '100%', padding: '7px', borderRadius: 8, cursor: 'pointer',
                    border: `1.5px dashed ${PHASE_COLORS[phase]}40`,
                    background: 'transparent', color: PHASE_COLORS[phase],
                    fontSize: '0.75rem', fontWeight: 600, marginTop: phaseCandidates.length > 0 ? 0 : 'auto',
                  }}
                >
                  + Add candidate
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Job Description */}
      {project.jobDescription && (
        <div className="glass-card" style={{ padding: '20px 24px', marginTop: 24 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 12 }}>
            Job Description
          </div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
            {project.jobDescription}
          </div>
        </div>
      )}

      {showEdit && (
        <ProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load() }}
        />
      )}

      {addPhase && (
        <AddCandidatePicker
          phase={addPhase}
          projectId={id}
          existingIds={existingIds}
          onAdded={() => { setAddPhase(null); load() }}
          onClose={() => setAddPhase(null)}
        />
      )}
    </div>
  )
}
