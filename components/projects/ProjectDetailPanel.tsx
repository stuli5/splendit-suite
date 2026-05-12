'use client'

import { useEffect, useState, useCallback } from 'react'
import type { Project, ProjectCandidate, CRMCandidate } from '@/lib/types'
import { getProjectCandidates, addCandidateToProject } from '@/lib/project-candidates'
import { getCRMCandidates } from '@/lib/crm-candidates'
import { useAuth } from '@/lib/auth-context'
import ProjectPipeline from './ProjectPipeline'
import ProjectModal from './ProjectModal'

const STATUS_COLOR: Record<string, string> = {
  active:   '#00a87a',
  'on-hold': '#f59e0b',
  closed:   '#e0457a',
}

const TYPE_LABEL: Record<string, string> = {
  recruitment: 'Recruitment',
  contracting: 'Contracting',
  other:       'Other',
}

type Tab = 'pipeline' | 'details'

interface Props {
  project:   Project
  onClose:   () => void
  onUpdated: (updated: Project) => void
}

export default function ProjectDetailPanel({ project: initialProject, onClose, onUpdated }: Props) {
  const { user } = useAuth()
  const [project,      setProject]      = useState(initialProject)
  const [tab,          setTab]          = useState<Tab>('pipeline')
  const [candidates,   setCandidates]   = useState<ProjectCandidate[]>([])
  const [loading,      setLoading]      = useState(true)
  const [showEdit,     setShowEdit]     = useState(false)
  const [showAdd,      setShowAdd]      = useState(false)
  const [addSearch,    setAddSearch]    = useState('')
  const [crmList,      setCrmList]      = useState<CRMCandidate[]>([])

  const loadCandidates = useCallback(async () => {
    setLoading(true)
    setCandidates(await getProjectCandidates(project.id))
    setLoading(false)
  }, [project.id])

  useEffect(() => { loadCandidates() }, [loadCandidates])
  useEffect(() => { if (showAdd) getCRMCandidates().then(setCrmList) }, [showAdd])

  function getActor() {
    if (!user) return undefined
    return { uid: user.uid, displayName: user.displayName ?? user.email ?? 'Unknown', email: user.email ?? '' }
  }

  async function handleAddCandidate(c: CRMCandidate) {
    if (candidates.some(pc => pc.candidateId === c.id)) return
    await addCandidateToProject({
      projectId:          project.id,
      candidateId:        c.id,
      candidateFirstName: c.firstName,
      candidateLastName:  c.lastName,
      candidatePosition:  c.position,
      ...(c.linkedIn ? { linkedIn: c.linkedIn } : {}),
      ...(c.gitHub   ? { gitHub:   c.gitHub   } : {}),
      phase: project.phases[0],
    }, getActor())
    setShowAdd(false)
    setAddSearch('')
    loadCandidates()
  }

  const addedIds    = new Set(candidates.map(c => c.candidateId))
  const filteredCrm = crmList.filter(c => {
    if (addedIds.has(c.id)) return false
    const q = addSearch.toLowerCase()
    return !q || `${c.firstName} ${c.lastName} ${c.position}`.toLowerCase().includes(q)
  })

  const statusColor = STATUS_COLOR[project.status] ?? '#aaa'

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 300,
      background: 'rgba(10,22,40,0.5)', backdropFilter: 'blur(3px)',
      display: 'flex', justifyContent: 'flex-end',
    }}>
      {/* Click backdrop to close */}
      <div style={{ flex: 1 }} onClick={onClose} />

      {/* Panel */}
      <div style={{
        width: '90%', maxWidth: 1060, background: '#f5f7fa',
        display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 48px rgba(0,0,0,0.2)', overflow: 'hidden',
      }}>

        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg, #0a1628 0%, #0f2e2a 100%)',
          padding: '18px 28px 0', flexShrink: 0,
        }}>
          {/* Breadcrumb row */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <button onClick={onClose} style={{
              background: 'none', border: 'none', cursor: 'pointer', padding: 0,
              color: 'rgba(255,255,255,0.55)', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem',
              display: 'flex', alignItems: 'center', gap: 4,
            }}>
              ← Projects
            </button>
            <span style={{ color: 'rgba(255,255,255,0.2)' }}>/</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'rgba(255,255,255,0.45)' }}>
              {project.companyName}
            </span>
            <div style={{ flex: 1 }} />
            <button onClick={() => setShowEdit(true)} style={{
              padding: '6px 18px', borderRadius: 7,
              border: '1px solid rgba(255,255,255,0.2)',
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.8)',
              fontFamily: 'Syne, sans-serif', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
            }}>
              Edit
            </button>
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 900, margin: '0 0 12px',
            fontSize: 'clamp(1.2rem, 3vw, 1.7rem)', color: '#fff', letterSpacing: '-0.02em',
          }}>
            {project.positionName}
          </h1>

          {/* Badges */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7, marginBottom: 16 }}>
            {[
              { label: project.status.toUpperCase(), color: statusColor, bg: `${statusColor}22` },
              { label: TYPE_LABEL[project.type],     color: 'rgba(255,255,255,0.65)', bg: 'rgba(255,255,255,0.1)' },
              { label: project.cooperationType,      color: 'rgba(255,255,255,0.65)', bg: 'rgba(255,255,255,0.1)' },
            ].map(b => (
              <span key={b.label} style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: b.bg, color: b.color,
                fontFamily: 'JetBrains Mono, monospace',
                border: `1px solid ${b.color}40`,
              }}>
                {b.label}
              </span>
            ))}
            {project.salary && (
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: 'rgba(0,168,122,0.18)', color: '#00a87a',
                fontFamily: 'JetBrains Mono, monospace', border: '1px solid rgba(0,168,122,0.3)',
              }}>
                {project.salary}
              </span>
            )}
            <span style={{
              fontSize: '0.7rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.5)',
              fontFamily: 'JetBrains Mono, monospace',
            }}>
              {candidates.length} / {project.requiredCount} required
            </span>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex' }}>
            {(['pipeline', 'details'] as Tab[]).map(t => (
              <button key={t} onClick={() => setTab(t)} style={{
                padding: '10px 22px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.82rem',
                color: tab === t ? '#fff' : 'rgba(255,255,255,0.4)',
                borderBottom: tab === t ? '2px solid #00a87a' : '2px solid transparent',
                transition: 'color 0.15s', textTransform: 'capitalize',
              }}>
                {t === 'pipeline' ? `Pipeline${!loading ? ` (${candidates.length})` : ''}` : 'Details'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
          {tab === 'pipeline' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: '#aaa' }}>
                  {candidates.length} candidate{candidates.length !== 1 ? 's' : ''} · drag cards to move between stages
                </span>
                <button onClick={() => setShowAdd(true)} style={{
                  padding: '8px 18px', borderRadius: 8, border: 'none',
                  background: 'linear-gradient(135deg, #00a87a, #0091c7)',
                  color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  fontSize: '0.8rem', cursor: 'pointer',
                }}>
                  + Add candidate
                </button>
              </div>
              {loading
                ? <div style={{ color: '#bbb', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', padding: '60px 0', textAlign: 'center' }}>Loading pipeline...</div>
                : <ProjectPipeline project={project} candidates={candidates} onChange={loadCandidates} />
              }
            </>
          )}

          {tab === 'details' && (
            <div style={{ maxWidth: 580, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                ['Company',        project.companyName],
                ['Status',         project.status],
                ['Type',           TYPE_LABEL[project.type]],
                ['Cooperation',    project.cooperationType],
                ['Required count', String(project.requiredCount)],
                ...(project.salary      ? [['Salary',      project.salary]]      : []),
                ...(project.responsible ? [['Responsible', project.responsible]] : []),
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', gap: 16, padding: '12px 16px', background: '#fff', borderRadius: 10, border: '1px solid #eee' }}>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', fontWeight: 600, color: '#bbb', minWidth: 120, letterSpacing: '0.04em' }}>
                    {label.toUpperCase()}
                  </span>
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: '#222', fontWeight: 600 }}>
                    {value}
                  </span>
                </div>
              ))}
              {project.description && (
                <div style={{ padding: '14px 16px', background: '#fff', borderRadius: 10, border: '1px solid #eee' }}>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', fontWeight: 600, color: '#bbb', marginBottom: 8, letterSpacing: '0.04em' }}>
                    DESCRIPTION
                  </div>
                  <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem', color: '#444', lineHeight: 1.7 }}>
                    {project.description}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Add Candidate ── */}
      {showAdd && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 400,
          display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(4px)',
        }}>
          <div style={{
            background: '#fff', borderRadius: 14, width: '100%', maxWidth: 460,
            maxHeight: '78vh', overflow: 'hidden', display: 'flex', flexDirection: 'column',
            boxShadow: '0 24px 64px rgba(0,0,0,0.2)',
          }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1rem' }}>Add candidate</span>
              <button onClick={() => { setShowAdd(false); setAddSearch('') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: '#aaa' }}>✕</button>
            </div>
            <div style={{ padding: '10px 16px', borderBottom: '1px solid #f0f0f0' }}>
              <input
                autoFocus
                value={addSearch}
                onChange={e => setAddSearch(e.target.value)}
                placeholder="Search by name or position..."
                style={{
                  width: '100%', padding: '9px 12px', borderRadius: 8,
                  border: '1px solid #ddd', fontFamily: 'JetBrains Mono, monospace',
                  fontSize: '0.82rem', outline: 'none', boxSizing: 'border-box',
                }}
              />
            </div>
            <div style={{ overflowY: 'auto', flex: 1 }}>
              {filteredCrm.length === 0 ? (
                <div style={{ padding: '40px', textAlign: 'center', color: '#bbb', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem' }}>
                  {addSearch ? 'No candidates found.' : 'All candidates already in pipeline.'}
                </div>
              ) : filteredCrm.slice(0, 60).map(c => (
                <button
                  key={c.id}
                  onClick={() => handleAddCandidate(c)}
                  style={{
                    width: '100%', padding: '11px 20px', background: 'none', border: 'none',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12,
                    borderBottom: '1px solid #f5f5f5', textAlign: 'left',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#f0faf8')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'none')}
                >
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: 'linear-gradient(135deg, #00a87a, #0091c7)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.68rem', fontWeight: 800, color: '#fff', fontFamily: 'Syne, sans-serif',
                  }}>
                    {`${c.firstName[0] ?? ''}${c.lastName[0] ?? ''}`.toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.84rem', color: '#111' }}>
                      {c.firstName} {c.lastName}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.7rem', color: '#aaa', marginTop: 1 }}>
                      {c.position}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Edit Project ── */}
      {showEdit && (
        <ProjectModal
          project={project}
          onClose={() => setShowEdit(false)}
          onSaved={() => {
            setShowEdit(false)
            onUpdated(project)
          }}
        />
      )}
    </div>
  )
}
