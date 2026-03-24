'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getProject } from '@/lib/projects'
import { getProjectCandidates, addCandidateToProject, updateCandidatePhase, updateProjectCandidate, removeCandidateFromProject } from '@/lib/project-candidates'
import { getCRMCandidates } from '@/lib/crm-candidates'
import type { Project, ProjectPhase, ProjectStatus, CooperationType, ProjectCandidate, CRMCandidate } from '@/lib/types'
import ProjectModal from '@/components/projects/ProjectModal'

// ── Constants ─────────────────────────────────────────────────────────────────

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

function linkedInUrl(raw: string) {
  if (raw.startsWith('http')) return raw
  return `https://linkedin.com/in/${raw.replace(/^.*linkedin\.com\/in\//i, '').replace(/\/$/, '')}`
}
function gitHubUrl(raw: string) {
  if (raw.startsWith('http')) return raw
  return `https://github.com/${raw.replace(/^.*github\.com\//i, '').replace(/\/$/, '')}`
}

function timeAgo(ts: number): string {
  const diff = Date.now() - ts
  const d = Math.floor(diff / 86400000)
  if (d === 0) return 'Today'
  if (d === 1) return 'Yesterday'
  if (d < 7)   return `${d}d ago`
  if (d < 30)  return `${Math.floor(d / 7)}w ago`
  return `${Math.floor(d / 30)}mo ago`
}

// ── Candidate Drawer ──────────────────────────────────────────────────────────

function CandidateDrawer({
  pc,
  project,
  onClose,
  onUpdated,
  onRemoved,
}: {
  pc: ProjectCandidate
  project: Project
  onClose: () => void
  onUpdated: (updated: ProjectCandidate) => void
  onRemoved: () => void
}) {
  const [note,        setNote]        = useState(pc.note ?? '')
  const [savingNote,  setSavingNote]  = useState(false)
  const [phase,       setPhase]       = useState<ProjectPhase>(pc.phase)
  const [fitScore,    setFitScore]    = useState<{ score: number; label: string; reason: string } | null>(null)
  const [loadingFit,  setLoadingFit]  = useState(false)
  const noteChanged = note !== (pc.note ?? '')
  const phaseColor = PHASE_COLORS[phase]

  async function saveNote() {
    setSavingNote(true)
    await updateProjectCandidate(pc.id, { note })
    setSavingNote(false)
    onUpdated({ ...pc, note, phase })
  }

  async function handlePhaseChange(newPhase: ProjectPhase) {
    setPhase(newPhase)
    await updateCandidatePhase(pc.id, newPhase)
    const newEntry = { phase: newPhase, ts: Date.now() }
    onUpdated({
      ...pc,
      note,
      phase: newPhase,
      phaseHistory: [...(pc.phaseHistory ?? [{ phase: pc.phase, ts: pc.addedAt }]), newEntry],
    })
  }

  async function handleFitScore() {
    setLoadingFit(true)
    const res  = await fetch('/api/ai/fit-score', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ candidate: { firstName: pc.candidateFirstName, lastName: pc.candidateLastName, position: pc.candidatePosition }, project }),
    })
    const json = await res.json()
    if (json.score !== undefined) setFitScore(json)
    setLoadingFit(false)
  }

  const scoreColor: string = fitScore
    ? fitScore.score >= 80 ? '#00a87a' : fitScore.score >= 60 ? '#f59e0b' : '#e0457a'
    : '#7ab8ae'

  const orderedPhases = PHASE_ORDER.filter(ph => project.phases.includes(ph))

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.25)', zIndex: 200, backdropFilter: 'blur(2px)' }}
      />

      {/* Drawer panel */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
        background: 'rgba(250,254,252,0.98)',
        borderLeft: '1px solid rgba(0,168,122,0.15)',
        boxShadow: '-12px 0 48px rgba(0,0,0,0.12)',
        zIndex: 201,
        display: 'flex', flexDirection: 'column',
        animation: 'slideIn 0.22s ease-out',
      }}>
        <style>{`
          @keyframes slideIn { from { transform: translateX(100%); opacity: 0 } to { transform: translateX(0); opacity: 1 } }
        `}</style>

        {/* Header */}
        <div style={{
          padding: '20px 24px',
          borderBottom: '1px solid rgba(0,168,122,0.1)',
          display: 'flex', alignItems: 'flex-start', gap: 14,
        }}>
          {/* Avatar */}
          <div style={{
            width: 52, height: 52, borderRadius: 14, flexShrink: 0,
            background: `linear-gradient(135deg, ${phaseColor}, ${phaseColor}99)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1rem', fontWeight: 800, color: 'white',
            boxShadow: `0 4px 14px ${phaseColor}40`,
          }}>
            {pc.candidateFirstName[0]}{pc.candidateLastName[0]}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.05rem', color: 'var(--text)' }}>
              {pc.candidateFirstName} {pc.candidateLastName}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 3 }}>
              {pc.candidatePosition}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{
                fontSize: '0.68rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20,
                background: `${phaseColor}18`, color: phaseColor,
              }}>
                {PHASE_LABELS[phase]}
              </span>
              <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', padding: '3px 0' }}>
                Added {timeAgo(pc.addedAt)}
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '1.1rem', padding: 4, flexShrink: 0 }}
          >
            ✕
          </button>
        </div>

        {/* Scrollable content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* Quick links */}
          {(pc.linkedIn || pc.gitHub) && (
            <div style={{ display: 'flex', gap: 8 }}>
              {pc.linkedIn && (
                <a href={linkedInUrl(pc.linkedIn)} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, textDecoration: 'none',
                  background: '#0077b510', color: '#0077b5',
                  fontSize: '0.78rem', fontWeight: 700, border: '1px solid #0077b520',
                }}>
                  LinkedIn →
                </a>
              )}
              {pc.gitHub && (
                <a href={gitHubUrl(pc.gitHub)} target="_blank" rel="noopener noreferrer" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  padding: '7px 14px', borderRadius: 8, textDecoration: 'none',
                  background: '#24292e10', color: '#24292e',
                  fontSize: '0.78rem', fontWeight: 700, border: '1px solid #24292e20',
                }}>
                  🐙 GitHub
                </a>
              )}
            </div>
          )}

          {/* AI Fit Score */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em', marginBottom: 10 }}>
              AI FIT SCORE
            </div>
            {fitScore ? (
              <div style={{
                padding: '14px 16px', borderRadius: 10,
                background: `${scoreColor}0e`, border: `1.5px solid ${scoreColor}30`,
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                  background: `${scoreColor}18`, border: `2px solid ${scoreColor}40`,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                }}>
                  <span style={{ fontSize: '1rem', fontWeight: 800, color: scoreColor, lineHeight: 1 }}>{fitScore.score}</span>
                  <span style={{ fontSize: '0.55rem', color: scoreColor, fontWeight: 600 }}>{fitScore.label}</span>
                </div>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                  {fitScore.reason}
                </span>
              </div>
            ) : (
              <button
                onClick={handleFitScore}
                disabled={loadingFit}
                style={{
                  width: '100%', padding: '10px', borderRadius: 9,
                  border: '1.5px dashed rgba(107,70,168,0.3)',
                  background: loadingFit ? 'rgba(107,70,168,0.06)' : 'transparent',
                  color: '#6b46a8', fontSize: '0.8rem', fontWeight: 700,
                  cursor: loadingFit ? 'not-allowed' : 'pointer',
                }}
              >
                {loadingFit ? '✨ Calculating...' : '✨ Calculate AI Fit Score'}
              </button>
            )}
          </div>

          {/* Move phase */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em', marginBottom: 10 }}>
              PIPELINE STAGE
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {orderedPhases.map(ph => (
                <button
                  key={ph}
                  onClick={() => handlePhaseChange(ph)}
                  style={{
                    padding: '6px 14px', borderRadius: 20, cursor: 'pointer',
                    border: `1.5px solid ${PHASE_COLORS[ph]}`,
                    background: phase === ph ? PHASE_COLORS[ph] : `${PHASE_COLORS[ph]}10`,
                    color: phase === ph ? 'white' : PHASE_COLORS[ph],
                    fontSize: '0.72rem', fontWeight: 700,
                    transition: 'all 0.15s',
                  }}
                >
                  {PHASE_LABELS[ph]}
                </button>
              ))}
            </div>
          </div>

          {/* Phase Timeline */}
          {(() => {
            const history = (pc.phaseHistory && pc.phaseHistory.length > 0)
              ? [...pc.phaseHistory].sort((a, b) => a.ts - b.ts)
              : [{ phase: pc.phase, ts: pc.addedAt }]
            return (
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em', marginBottom: 12 }}>
                  TIMELINE
                </div>
                <div style={{ position: 'relative', paddingLeft: 20 }}>
                  <div style={{
                    position: 'absolute', left: 6, top: 8, bottom: 8,
                    width: 1.5, background: 'rgba(0,168,122,0.12)',
                  }} />
                  {history.map((entry, i) => {
                    const c = PHASE_COLORS[entry.phase]
                    return (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10, position: 'relative' }}>
                        <div style={{
                          position: 'absolute', left: -14, width: 13, height: 13,
                          borderRadius: '50%', background: c,
                          boxShadow: `0 0 0 3px ${c}25`,
                          flexShrink: 0,
                        }} />
                        <div style={{
                          flex: 1, padding: '8px 12px', borderRadius: 8,
                          background: `${c}08`, border: `1px solid ${c}20`,
                          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                        }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 700, color: c }}>
                            {PHASE_LABELS[entry.phase]}
                          </span>
                          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1, flexShrink: 0 }}>
                            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                              {new Date(entry.ts).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })}
                            </span>
                            <span style={{ fontSize: '0.62rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace', opacity: 0.7 }}>
                              {new Date(entry.ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })()}

          {/* Notes */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 700, color: 'var(--text-dim)', letterSpacing: '0.06em', marginBottom: 10 }}>
              NOTES
            </div>
            <textarea
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Add notes about this candidate..."
              rows={4}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 9,
                border: noteChanged ? '1.5px solid rgba(0,168,122,0.5)' : '1px solid rgba(0,168,122,0.2)',
                background: 'rgba(255,255,255,0.9)', resize: 'vertical',
                fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text)', outline: 'none', lineHeight: 1.6,
                boxSizing: 'border-box',
                transition: 'border-color 0.15s',
              }}
            />
            {noteChanged && (
              <button
                onClick={saveNote}
                disabled={savingNote}
                style={{
                  marginTop: 8, padding: '7px 16px', borderRadius: 8, border: 'none',
                  background: 'var(--primary)', color: 'white',
                  fontSize: '0.78rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                {savingNote ? 'Saving...' : 'Save Note'}
              </button>
            )}
          </div>
        </div>

        {/* Footer — remove */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(0,168,122,0.1)' }}>
          <button
            onClick={onRemoved}
            style={{
              width: '100%', padding: '10px', borderRadius: 9,
              border: '1px solid rgba(224,69,122,0.25)',
              background: 'rgba(224,69,122,0.04)',
              color: '#e0457a', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'rgba(224,69,122,0.1)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'rgba(224,69,122,0.04)')}
          >
            Remove from project
          </button>
        </div>
      </div>
    </>
  )
}

// ── Candidate Card ─────────────────────────────────────────────────────────────

function CandidateCard({
  pc,
  fitScores,
  isDragging,
  onDragStart,
  onDragEnd,
  onClick,
}: {
  pc: ProjectCandidate
  fitScores: Record<string, { score: number; label: string }>
  isDragging: boolean
  onDragStart: () => void
  onDragEnd: () => void
  onClick: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const color    = PHASE_COLORS[pc.phase]
  const fit      = fitScores[pc.candidateId]
  const fitColor = fit
    ? fit.score >= 80 ? '#00a87a' : fit.score >= 60 ? '#f59e0b' : '#e0457a'
    : null

  return (
    <div
      draggable
      onDragStart={e => { e.stopPropagation(); onDragStart() }}
      onDragEnd={onDragEnd}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
      style={{
        background: '#fff',
        borderRadius: 8,
        border: '1px solid rgba(0,0,0,0.08)',
        boxShadow: isDragging
          ? '0 16px 40px rgba(0,0,0,0.16)'
          : hovered
            ? '0 4px 20px rgba(0,0,0,0.10)'
            : '0 1px 3px rgba(0,0,0,0.06)',
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isDragging ? 0.45 : 1,
        transform: hovered && !isDragging ? 'translateY(-2px)' : 'none',
        transition: 'box-shadow 0.18s, transform 0.14s, border-color 0.18s',
        overflow: 'hidden',
        position: 'relative',
      }}
    >
      {/* Phase accent bar — full-width top */}
      <div style={{ height: 3, background: `linear-gradient(90deg, ${color}, ${color}99)` }} />

      {/* Drag handle — visible on hover */}
      {hovered && !isDragging && (
        <div style={{
          position: 'absolute', top: '50%', right: 8,
          transform: 'translateY(-50%)',
          color: 'rgba(0,0,0,0.18)', fontSize: '0.7rem',
          letterSpacing: '-1px', lineHeight: 1, userSelect: 'none',
          pointerEvents: 'none',
        }}>
          ⠿
        </div>
      )}

      {/* Main content */}
      <div style={{ padding: '10px 12px 8px' }}>

        {/* Row 1: avatar + name + score */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          {/* Avatar */}
          <div style={{
            width: 36, height: 36, borderRadius: 8, flexShrink: 0,
            background: `linear-gradient(135deg, ${color}dd, ${color}77)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '0.78rem', fontWeight: 800, color: 'white',
            letterSpacing: '-0.5px',
            boxShadow: `0 2px 8px ${color}40`,
          }}>
            {pc.candidateFirstName[0]}{pc.candidateLastName[0]}
          </div>

          {/* Name + position */}
          <div style={{ flex: 1, minWidth: 0, paddingTop: 1 }}>
            <div style={{
              fontSize: '0.82rem', fontWeight: 700,
              color: 'var(--text)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              lineHeight: 1.3,
            }}>
              {pc.candidateFirstName} {pc.candidateLastName}
            </div>
            <div style={{
              fontSize: '0.68rem', color: 'var(--text-dim)',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              marginTop: 2, lineHeight: 1.3,
            }}>
              {pc.candidatePosition}
            </div>
          </div>

          {/* Fit score badge */}
          {fit && fitColor && (
            <div style={{
              flexShrink: 0, textAlign: 'center',
              background: `${fitColor}12`,
              border: `1.5px solid ${fitColor}35`,
              borderRadius: 7, padding: '3px 7px', minWidth: 34,
            }}>
              <div style={{ fontSize: '0.78rem', fontWeight: 800, color: fitColor, lineHeight: 1 }}>
                {fit.score}
              </div>
              <div style={{ fontSize: '0.52rem', fontWeight: 700, color: fitColor, letterSpacing: '0.02em', marginTop: 1 }}>
                {fit.label.toUpperCase()}
              </div>
            </div>
          )}
        </div>

        {/* Note preview */}
        {pc.note && (
          <div style={{
            marginTop: 9,
            padding: '6px 9px',
            background: 'rgba(0,0,0,0.025)',
            borderRadius: 6,
            borderLeft: `2px solid ${color}50`,
          }}>
            <div style={{
              fontSize: '0.67rem', color: 'var(--text-muted)', lineHeight: 1.5,
              fontStyle: 'italic',
              overflow: 'hidden', display: '-webkit-box',
              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as const,
            }}>
              {pc.note}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{
        padding: '5px 12px 8px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderTop: '1px solid rgba(0,0,0,0.05)',
        marginTop: 2,
      }}>
        {/* Profile badges */}
        <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
          {pc.linkedIn && (
            <span style={{
              fontSize: '0.6rem', fontWeight: 700,
              color: '#0077b5', background: 'rgba(0,119,181,0.08)',
              padding: '2px 6px', borderRadius: 4,
              letterSpacing: '0.02em',
            }}>
              in
            </span>
          )}
          {pc.gitHub && (
            <span style={{
              fontSize: '0.62rem',
              color: '#24292e', background: 'rgba(36,41,46,0.07)',
              padding: '2px 5px', borderRadius: 4,
            }}>
              GH
            </span>
          )}
          {!pc.linkedIn && !pc.gitHub && (
            <span style={{ fontSize: '0.6rem', color: 'rgba(0,0,0,0.2)' }}>—</span>
          )}
        </div>

        {/* Date + open indicator */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <span style={{ fontSize: '0.6rem', color: 'rgba(0,0,0,0.3)', fontFamily: 'JetBrains Mono, monospace' }}>
            {timeAgo(pc.addedAt)}
          </span>
          <span style={{
            fontSize: '0.6rem',
            color: hovered ? color : 'rgba(0,0,0,0.2)',
            transition: 'color 0.15s',
            fontWeight: 700,
          }}>
            ›
          </span>
        </div>
      </div>
    </div>
  )
}

// ── Add Candidate Picker ───────────────────────────────────────────────────────

function AddCandidatePicker({ phase, projectId, existingIds, onAdded, onClose }: {
  phase: ProjectPhase; projectId: string; existingIds: Set<string>; onAdded: () => void; onClose: () => void
}) {
  const [all,    setAll]    = useState<CRMCandidate[]>([])
  const [search, setSearch] = useState('')

  useEffect(() => { getCRMCandidates().then(setAll) }, [])

  const filtered = all
    .filter(c => !existingIds.has(c.id))
    .filter(c => {
      const q = search.toLowerCase()
      return c.firstName.toLowerCase().includes(q) || c.lastName.toLowerCase().includes(q) || c.position.toLowerCase().includes(q)
    })

  async function pick(c: CRMCandidate) {
    const entry: Omit<ProjectCandidate, 'id' | 'addedAt'> = {
      projectId, candidateId: c.id,
      candidateFirstName: c.firstName, candidateLastName: c.lastName,
      candidatePosition: c.position, phase,
    }
    if (c.linkedIn) entry.linkedIn = c.linkedIn
    if (c.gitHub)   entry.gitHub   = c.gitHub
    await addCandidateToProject(entry)
    onAdded()
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 300, backdropFilter: 'blur(4px)' }}>
      <div style={{ background: 'rgba(255,255,255,0.97)', borderRadius: 14, width: '100%', maxWidth: 440, maxHeight: '70vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid rgba(0,168,122,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
            Add to <span style={{ color: PHASE_COLORS[phase] }}>{PHASE_LABELS[phase]}</span>
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.1rem', color: 'var(--text-dim)' }}>✕</button>
        </div>
        <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(0,168,122,0.08)' }}>
          <input
            autoFocus value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search candidate..."
            style={{ width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid rgba(0,168,122,0.25)', background: 'rgba(255,255,255,0.9)', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const }}
          />
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>
          {filtered.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              {all.length === 0 ? 'No candidates in CRM yet.' : 'No results.'}
            </div>
          ) : filtered.map(c => (
            <div key={c.id} onClick={() => pick(c)}
              style={{ padding: '12px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, borderBottom: '1px solid rgba(0,168,122,0.06)' }}
              onMouseEnter={e => (e.currentTarget.style.background = '#f0faf8')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', fontWeight: 700, color: 'white' }}>
                {c.firstName[0]}{c.lastName[0]}
              </div>
              <div>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{c.firstName} {c.lastName}</div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{c.position}</div>
              </div>
            </div>
          ))}
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
  const [drawerPc,   setDrawerPc]   = useState<ProjectCandidate | null>(null)
  const [matching,   setMatching]   = useState(false)
  const [matches,    setMatches]    = useState<{ candidateId: string; score: number; label: string; reason: string }[]>([])
  const [fitScores,  setFitScores]  = useState<Record<string, { score: number; label: string }>>({})

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
    if (drawerPc?.id === pcId) setDrawerPc(null)
  }

  async function handleDrop(targetPhase: ProjectPhase) {
    if (!dragId) return
    const pc = pcList.find(p => p.id === dragId)
    if (!pc || pc.phase === targetPhase) { setDragId(null); setDragOver(null); return }
    setPcList(prev => prev.map(p => p.id === dragId ? { ...p, phase: targetPhase } : p))
    if (drawerPc?.id === dragId) setDrawerPc(prev => prev ? { ...prev, phase: targetPhase } : null)
    setDragId(null)
    setDragOver(null)
    await updateCandidatePhase(dragId, targetPhase)
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

  function handleDrawerUpdated(updated: ProjectCandidate) {
    setPcList(prev => prev.map(p => p.id === updated.id ? updated : p))
    setDrawerPc(updated)
    // Cache fit score if recalculated via drawer
  }

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: 300 }}>
      <div style={{ width: 32, height: 32, border: '3px solid rgba(0,168,122,0.2)', borderTopColor: 'var(--primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
    </div>
  )

  if (!project) return (
    <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-dim)' }}>
      Project not found.{' '}
      <button onClick={() => router.push('/crm/projekty')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}>
        Back to Projects
      </button>
    </div>
  )

  const orderedPhases = PHASE_ORDER.filter(ph => project.phases.includes(ph))
  const existingIds   = new Set(pcList.map(p => p.candidateId))

  return (
    <div>
      {/* Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16, fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace' }}>
        <button onClick={() => router.push('/crm/projekty')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--primary)', padding: 0, fontFamily: 'inherit', fontSize: 'inherit' }}>
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
            <span style={{ fontSize: '0.72rem', fontWeight: 600, color: STATUS_COLORS[project.status], background: `${STATUS_COLORS[project.status]}18`, padding: '3px 10px', borderRadius: 20 }}>
              {STATUS_LABELS[project.status]}
            </span>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: COOP_COLORS[project.cooperationType ?? 'HPP'], background: `${COOP_COLORS[project.cooperationType ?? 'HPP']}18`, padding: '3px 10px', borderRadius: 20 }}>
              {project.cooperationType ?? 'HPP'}
            </span>
            {project.salary && <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace' }}>💰 {project.salary}</span>}
            {project.responsible && <span style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>👤 {project.responsible}</span>}
          </div>
        </div>
        <button onClick={() => setShowEdit(true)} style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid rgba(0,168,122,0.3)', background: 'transparent', color: 'var(--primary)', fontSize: '0.82rem', fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer' }}>
          Edit Project
        </button>
      </div>

      {project.description && (
        <div className="glass-card" style={{ padding: '16px 24px', marginBottom: 24, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.6 }}>
          {project.description}
        </div>
      )}

      {/* Pipeline header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <div>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>Pipeline</span>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginLeft: 10 }}>
            {orderedPhases.length} phases · {pcList.length} candidate{pcList.length !== 1 ? 's' : ''} · {project.requiredCount} open
          </span>
        </div>
        <button
          onClick={handleAiMatch} disabled={matching}
          style={{ padding: '7px 16px', borderRadius: 8, border: 'none', cursor: matching ? 'not-allowed' : 'pointer', background: matching ? 'rgba(107,70,168,0.2)' : 'rgba(107,70,168,0.12)', color: '#6b46a8', fontSize: '0.78rem', fontWeight: 700 }}
        >
          {matching ? '✨ Matching...' : '✨ AI Match Candidates'}
        </button>
      </div>

      {/* AI Match Results */}
      {matches.length > 0 && (
        <div className="glass-card" style={{ padding: '16px 20px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#6b46a8' }}>✨ AI Suggested Matches</span>
            <button onClick={() => setMatches([])} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.75rem' }}>Dismiss</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {matches.map(m => {
              const sc = m.score >= 80 ? '#00a87a' : m.score >= 60 ? '#f59e0b' : '#e0457a'
              return (
                <div key={m.candidateId} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'rgba(107,70,168,0.04)', borderRadius: 9, border: '1px solid rgba(107,70,168,0.12)' }}>
                  <div style={{ minWidth: 42, height: 42, borderRadius: 9, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', background: `${sc}18`, border: `1.5px solid ${sc}40` }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: sc, lineHeight: 1 }}>{m.score}</span>
                    <span style={{ fontSize: '0.55rem', color: sc, fontWeight: 600 }}>{m.label}</span>
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{m.candidateId}</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{m.reason}</div>
                  </div>
                  <button onClick={() => setAddPhase('contacted')} style={{ padding: '5px 12px', borderRadius: 7, border: 'none', cursor: 'pointer', background: 'var(--primary)', color: 'white', fontSize: '0.72rem', fontWeight: 700 }}>
                    + Add
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Project Phase Timeline */}
      {(() => {
        // For each phase find the earliest timestamp any candidate reached it
        const phaseFirstTs: Partial<Record<ProjectPhase, number>> = {}
        for (const pc of pcList) {
          const entries = pc.phaseHistory && pc.phaseHistory.length > 0
            ? pc.phaseHistory
            : [{ phase: pc.phase, ts: pc.addedAt }]
          for (const e of entries) {
            if (phaseFirstTs[e.phase] === undefined || e.ts < phaseFirstTs[e.phase]!) {
              phaseFirstTs[e.phase] = e.ts
            }
          }
        }

        // Build nodes: project created + each active phase in order
        type Node = { label: string; ts: number; color: string; reached: boolean }
        const nodes: Node[] = [
          { label: 'Created', ts: project.createdAt, color: '#7ab8ae', reached: true },
          ...orderedPhases.map(ph => ({
            label: PHASE_LABELS[ph],
            ts: phaseFirstTs[ph] ?? 0,
            color: PHASE_COLORS[ph],
            reached: phaseFirstTs[ph] !== undefined,
          })),
        ]

        // Progress: how many nodes are reached (excl. created)
        const reachedCount = nodes.filter(n => n.reached).length
        const progressPct  = nodes.length > 1 ? Math.round(((reachedCount - 1) / (nodes.length - 1)) * 100) : 0

        function fmtDate(ts: number) {
          const d = new Date(ts)
          return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: '2-digit' })
        }
        function fmtTime(ts: number) {
          return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
        }

        return (
          <div style={{ padding: '18px 24px', marginBottom: 20, overflow: 'hidden' }}>
            {/* Track */}
            <div style={{ position: 'relative', height: 56, display: 'flex', alignItems: 'center' }}>
              {/* Background rail */}
              <div style={{
                position: 'absolute', left: 0, right: 0, top: '50%', transform: 'translateY(-50%)',
                height: 3, background: 'rgba(0,168,122,0.1)', borderRadius: 2,
              }} />
              {/* Progress fill */}
              <div style={{
                position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)',
                height: 3, width: `${progressPct}%`, borderRadius: 2,
                background: 'linear-gradient(90deg, #00a87a, #0091c7)',
                transition: 'width 0.6s ease',
              }} />
              {/* Nodes */}
              {nodes.map((node, i) => {
                const pct = nodes.length === 1 ? 0 : (i / (nodes.length - 1)) * 100
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    left: `${pct}%`,
                    transform: 'translateX(-50%)',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 0,
                  }}>
                    {/* Date + time above */}
                    <div style={{
                      display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1,
                      marginBottom: 4, opacity: node.reached ? 1 : 0.4,
                    }}>
                      <span style={{
                        fontSize: '0.58rem', fontFamily: 'JetBrains Mono, monospace',
                        color: node.reached ? node.color : 'var(--text-dim)',
                        fontWeight: 700, whiteSpace: 'nowrap',
                      }}>
                        {node.reached && node.ts ? fmtDate(node.ts) : '—'}
                      </span>
                      {node.reached && node.ts ? (
                        <span style={{
                          fontSize: '0.55rem', fontFamily: 'JetBrains Mono, monospace',
                          color: node.reached ? node.color : 'var(--text-dim)',
                          fontWeight: 500, whiteSpace: 'nowrap', opacity: 0.7,
                        }}>
                          {fmtTime(node.ts)}
                        </span>
                      ) : null}
                    </div>
                    {/* Dot */}
                    <div style={{
                      width: node.reached ? 14 : 10,
                      height: node.reached ? 14 : 10,
                      borderRadius: '50%',
                      background: node.reached ? node.color : 'rgba(0,0,0,0.1)',
                      border: node.reached ? `2px solid white` : '2px solid rgba(0,0,0,0.08)',
                      boxShadow: node.reached ? `0 0 0 3px ${node.color}30` : 'none',
                      transition: 'all 0.2s',
                      zIndex: 1,
                    }} />
                    {/* Label below */}
                    <div style={{
                      fontSize: '0.6rem', fontWeight: 700, whiteSpace: 'nowrap', marginTop: 4,
                      color: node.reached ? node.color : 'rgba(0,0,0,0.25)',
                      letterSpacing: '0.03em',
                    }}>
                      {node.label}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )
      })()}

      {/* Pipeline board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${orderedPhases.length}, minmax(220px, 1fr))`,
        gap: 10, overflowX: 'auto', paddingBottom: 8, alignItems: 'start',
      }}>
        {orderedPhases.map(phase => {
          const phaseCandidates = pcList.filter(p => p.phase === phase)
          const isDragTarget    = dragOver === phase
          const color           = PHASE_COLORS[phase]
          const fillPct         = project.requiredCount > 0
            ? Math.min(100, Math.round((phaseCandidates.length / project.requiredCount) * 100))
            : null

          return (
            <div
              key={phase}
              onDragOver={e => { e.preventDefault(); setDragOver(phase) }}
              onDragLeave={() => setDragOver(null)}
              onDrop={() => handleDrop(phase)}
              style={{
                background: isDragTarget ? `${color}06` : 'rgba(246,249,248,0.9)',
                border: `1px solid ${isDragTarget ? color + '50' : 'rgba(0,0,0,0.07)'}`,
                borderRadius: 10,
                minHeight: 320,
                display: 'flex', flexDirection: 'column',
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              {/* Column header */}
              <div style={{ padding: '12px 12px 10px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: color, flexShrink: 0,
                    }} />
                    <span style={{
                      fontSize: '0.68rem', fontWeight: 700, color: 'rgba(0,0,0,0.5)',
                      letterSpacing: '0.08em', fontFamily: 'JetBrains Mono, monospace',
                    }}>
                      {PHASE_LABELS[phase].toUpperCase()}
                    </span>
                  </div>
                  <span style={{
                    fontSize: '0.7rem', fontWeight: 700,
                    background: `${color}18`, color,
                    padding: '2px 9px', borderRadius: 20,
                    minWidth: 24, textAlign: 'center',
                  }}>
                    {phaseCandidates.length}
                  </span>
                </div>

                {/* Fill bar */}
                {fillPct !== null && (
                  <div style={{ height: 3, background: 'rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
                    <div style={{
                      height: '100%', borderRadius: 2,
                      width: `${fillPct}%`,
                      background: fillPct >= 100 ? color : `${color}80`,
                      transition: 'width 0.3s ease',
                    }} />
                  </div>
                )}
              </div>

              {/* Divider */}
              <div style={{ height: 1, background: `${color}25`, margin: '0 12px' }} />

              {/* Cards */}
              <div style={{ flex: 1, padding: '8px 8px 10px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {phaseCandidates.map(pc => (
                  <CandidateCard
                    key={pc.id}
                    pc={pc}
                    fitScores={fitScores}
                    isDragging={dragId === pc.id}
                    onDragStart={() => setDragId(pc.id)}
                    onDragEnd={() => { setDragId(null); setDragOver(null) }}
                    onClick={() => setDrawerPc(pc)}
                  />
                ))}

                {/* Add button */}
                <button
                  onClick={() => setAddPhase(phase)}
                  style={{
                    width: '100%', padding: '7px 0', borderRadius: 7, cursor: 'pointer',
                    border: `1px dashed rgba(0,0,0,0.13)`,
                    background: 'transparent',
                    color: 'rgba(0,0,0,0.3)',
                    fontSize: '0.72rem', fontWeight: 500,
                    marginTop: phaseCandidates.length > 0 ? 2 : 0,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = color
                    e.currentTarget.style.color = color
                    e.currentTarget.style.background = `${color}06`
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = 'rgba(0,0,0,0.13)'
                    e.currentTarget.style.color = 'rgba(0,0,0,0.3)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  + Add
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Job Description */}
      {project.jobDescription && (
        <div className="glass-card" style={{ padding: '20px 24px', marginTop: 24 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 12 }}>Job Description</div>
          <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{project.jobDescription}</div>
        </div>
      )}

      {/* Modals & Drawer */}
      {showEdit && (
        <ProjectModal project={project} onClose={() => setShowEdit(false)} onSaved={() => { setShowEdit(false); load() }} />
      )}
      {addPhase && (
        <AddCandidatePicker
          phase={addPhase} projectId={id} existingIds={existingIds}
          onAdded={() => { setAddPhase(null); load() }}
          onClose={() => setAddPhase(null)}
        />
      )}
      {drawerPc && project && (
        <CandidateDrawer
          pc={drawerPc}
          project={project}
          onClose={() => setDrawerPc(null)}
          onUpdated={handleDrawerUpdated}
          onRemoved={() => handleRemove(drawerPc.id)}
        />
      )}
    </div>
  )
}
