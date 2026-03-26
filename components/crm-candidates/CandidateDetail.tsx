'use client'

import { useEffect, useState } from 'react'
import type { CRMCandidate, CRMStage, Project, ProjectCandidate, ProjectPhase } from '@/lib/types'
import { getCandidateProjectHistory } from '@/lib/project-candidates'
import { getProject } from '@/lib/projects'
import ActivityFeed from './ActivityFeed'

interface Props {
  candidate:     CRMCandidate
  onClose:       () => void
  onEdit:        (c: CRMCandidate) => void
  onDelete:      (c: CRMCandidate) => void
  onStageChange?: (c: CRMCandidate, stage: CRMStage) => void
}

const STAGE_COLORS: Record<CRMStage, string> = {
  new:       '#6b7280',
  screening: '#0091c7',
  interview: '#6b46a8',
  offer:     '#00a87a',
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

const SECTION_LABEL: React.CSSProperties = {
  fontSize: '0.65rem', fontWeight: 700, color: 'var(--text-dim)',
  letterSpacing: '0.08em', marginBottom: 8, textTransform: 'uppercase',
}

const INFO_ROW: React.CSSProperties = {
  fontSize: '0.82rem', color: 'var(--text)', fontFamily: 'JetBrains Mono, monospace',
  padding: '6px 0', borderBottom: '1px solid rgba(0,168,122,0.08)',
  display: 'flex', alignItems: 'center', gap: 8,
}

const STAGES: CRMStage[] = ['new', 'screening', 'interview', 'offer']

const NORMAL_PHASES: ProjectPhase[] = ['contacted', 'presentation', 'interview', 'onboarding', 'closed']

const PHASE_COLORS: Record<ProjectPhase, string> = {
  contacted:    '#6b7280',
  presentation: '#0091c7',
  interview:    '#6b46a8',
  rejected:     '#e0457a',
  onboarding:   '#00a87a',
  closed:       '#374151',
}

const PHASE_LABELS: Record<ProjectPhase, string> = {
  contacted:    'Contacted',
  presentation: 'Presentation',
  interview:    'Interview',
  rejected:     'Rejected',
  onboarding:   'Onboarding',
  closed:       'Closed',
}

type Assignment = { pc: ProjectCandidate; project: Project | null }

export default function CandidateDetail({ candidate, onClose, onEdit, onDelete, onStageChange }: Props) {
  const stage    = candidate.stage ?? 'new'
  const initials = `${candidate.firstName[0]}${candidate.lastName[0]}`

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [pipelineLoading, setPipelineLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setPipelineLoading(true)
    async function load() {
      try {
        const pcs = await getCandidateProjectHistory(candidate.id)
        const projects = await Promise.all(pcs.map(pc => getProject(pc.projectId)))
        if (!cancelled) setAssignments(pcs.map((pc, i) => ({ pc, project: projects[i] })))
      } finally {
        if (!cancelled) setPipelineLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [candidate.id])

  return (
    <>
      {/* Backdrop overlay (semi-transparent, clicking closes) */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.15)',
          zIndex: 150,
        }}
      />

      {/* Drawer */}
      <div style={{
        position: 'fixed', top: 0, right: 0, bottom: 0, width: 400,
        background: 'rgba(255,255,255,0.98)',
        boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
        zIndex: 151, display: 'flex', flexDirection: 'column',
        borderLeft: '1px solid rgba(0,168,122,0.15)',
        backdropFilter: 'blur(12px)',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '1px solid rgba(0,168,122,0.12)',
          background: 'linear-gradient(135deg, rgba(0,168,122,0.05), rgba(0,145,199,0.05))',
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {/* Avatar */}
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.1rem', fontWeight: 800, color: 'white',
                fontFamily: 'Syne, sans-serif',
              }}>
                {initials}
              </div>
              <div>
                <div style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800,
                  fontSize: '1.1rem', color: 'var(--text)', lineHeight: 1.2,
                }}>
                  {candidate.firstName} {candidate.lastName}
                </div>
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 3 }}>
                  {candidate.position}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                fontSize: '1.1rem', color: 'var(--text-dim)', padding: '2px 4px',
                lineHeight: 1, flexShrink: 0,
              }}
              aria-label="Close"
            >
              ✕
            </button>
          </div>

          {/* Stage pills + date */}
          <div style={{ marginTop: 14 }}>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {STAGES.map(s => {
                const active = stage === s
                const color  = STAGE_COLORS[s]
                return (
                  <button
                    key={s}
                    onClick={() => onStageChange?.(candidate, s)}
                    disabled={!onStageChange}
                    style={{
                      padding: '3px 12px', borderRadius: 20,
                      background: active ? color : 'transparent',
                      border: `1.5px solid ${active ? color : `${color}50`}`,
                      color: active ? 'white' : color,
                      fontSize: '0.72rem', fontWeight: 700,
                      fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em',
                      textTransform: 'capitalize',
                      cursor: onStageChange ? 'pointer' : 'default',
                      transition: 'all 0.15s',
                    }}
                  >
                    {s}
                  </button>
                )
              })}
            </div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 6 }}>
              Added {new Date(candidate.createdAt).toLocaleDateString('en-GB')}
            </div>
          </div>
        </div>

        {/* Body */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px' }}>

          {/* Contact */}
          <div style={{ marginBottom: 24 }}>
            <div style={SECTION_LABEL}>Contact</div>
            {candidate.email ? (
              <div style={INFO_ROW}>
                <span style={{ fontSize: '0.85rem' }}>✉️</span>
                <a
                  href={`mailto:${candidate.email}`}
                  style={{ color: 'var(--secondary)', textDecoration: 'none', fontSize: '0.82rem' }}
                >
                  {candidate.email}
                </a>
              </div>
            ) : (
              <div style={{ ...INFO_ROW, color: 'var(--text-dim)' }}>
                <span style={{ fontSize: '0.85rem' }}>✉️</span> No email
              </div>
            )}
            {candidate.phone ? (
              <div style={{ ...INFO_ROW, borderBottom: 'none' }}>
                <span style={{ fontSize: '0.85rem' }}>📞</span>
                <span>{candidate.phone}</span>
              </div>
            ) : (
              <div style={{ ...INFO_ROW, borderBottom: 'none', color: 'var(--text-dim)' }}>
                <span style={{ fontSize: '0.85rem' }}>📞</span> No phone
              </div>
            )}
          </div>

          {/* Profiles */}
          <div style={{ marginBottom: 24 }}>
            <div style={SECTION_LABEL}>Profiles</div>
            {candidate.linkedIn ? (
              <div style={INFO_ROW}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: '#0077b5' }}>in</span>
                <a
                  href={linkedInUrl(candidate.linkedIn)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#0077b5', textDecoration: 'none', fontSize: '0.8rem' }}
                >
                  {candidate.linkedIn.replace(/^https?:\/\/(www\.)?/i, '')}
                </a>
              </div>
            ) : (
              <div style={INFO_ROW}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-dim)' }}>in</span>
                <span style={{ color: 'var(--text-dim)' }}>No LinkedIn</span>
              </div>
            )}
            {candidate.gitHub ? (
              <div style={{ ...INFO_ROW, borderBottom: 'none' }}>
                <span style={{ fontSize: '0.9rem' }}>🐙</span>
                <a
                  href={gitHubUrl(candidate.gitHub)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#24292e', textDecoration: 'none', fontSize: '0.8rem' }}
                >
                  {candidate.gitHub.replace(/^https?:\/\/(www\.)?/i, '')}
                </a>
              </div>
            ) : (
              <div style={{ ...INFO_ROW, borderBottom: 'none' }}>
                <span style={{ fontSize: '0.9rem' }}>🐙</span>
                <span style={{ color: 'var(--text-dim)' }}>No GitHub</span>
              </div>
            )}
          </div>

          {/* CV */}
          {candidate.cvUrl && (
            <div style={{ marginBottom: 24 }}>
              <div style={SECTION_LABEL}>CV</div>
              <a
                href={candidate.cvUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 14px', borderRadius: 9,
                  background: 'rgba(0,168,122,0.06)',
                  border: '1px solid rgba(0,168,122,0.2)',
                  color: 'var(--primary)',
                  fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace',
                  textDecoration: 'none', maxWidth: '100%',
                  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                }}
              >
                <span style={{ fontSize: '1rem', flexShrink: 0 }}>📎</span>
                {candidate.cvName ?? 'Download CV'}
              </a>
            </div>
          )}

          {/* Skills */}
          {candidate.skills && candidate.skills.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={SECTION_LABEL}>Skills</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                {[...new Set(candidate.skills)].map(s => (
                  <span
                    key={s}
                    style={{
                      padding: '3px 10px', borderRadius: 20,
                      background: 'rgba(0,168,122,0.08)',
                      border: '1px solid rgba(0,168,122,0.25)',
                      fontSize: '0.73rem', color: 'var(--primary)',
                      fontFamily: 'JetBrains Mono, monospace',
                    }}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Pipeline */}
          {(pipelineLoading || assignments.length > 0) && (
            <div style={{ marginBottom: 24 }}>
              <div style={SECTION_LABEL}>Pipeline</div>
              {pipelineLoading ? (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
                  Loading...
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {assignments.map(({ pc, project }) => {
                    const history = [...(pc.phaseHistory ?? [])].sort((a, b) => a.ts - b.ts)
                    const historyPhases = new Set(history.map(h => h.phase))
                    const pendingPhases = pc.phase === 'rejected'
                      ? []
                      : NORMAL_PHASES.filter(p => !historyPhases.has(p))
                    const allSteps = [
                      ...history.map(h => ({ phase: h.phase, ts: h.ts as number | null, done: true as boolean })),
                      ...pendingPhases.map(p => ({ phase: p, ts: null, done: false })),
                    ]
                    return (
                      <div key={pc.id} style={{
                        padding: '12px 14px', borderRadius: 10,
                        background: 'rgba(0,168,122,0.03)',
                        border: '1px solid rgba(0,168,122,0.12)',
                      }}>
                        {/* Project header */}
                        <div style={{
                          fontSize: '0.75rem', fontWeight: 700,
                          fontFamily: 'Syne, sans-serif', color: 'var(--text)',
                          marginBottom: 14,
                          display: 'flex', alignItems: 'center', gap: 6,
                        }}>
                          <span style={{ fontSize: '0.7rem' }}>📋</span>
                          {project?.positionName ?? 'Unknown project'}
                          {project?.companyName && (
                            <span style={{ fontWeight: 400, color: 'var(--text-dim)' }}>
                              @ {project.companyName}
                            </span>
                          )}
                        </div>

                        {/* Vertical timeline */}
                        <div style={{ position: 'relative', paddingLeft: 22 }}>
                          {/* Connecting line */}
                          {allSteps.length > 1 && (
                            <div style={{
                              position: 'absolute', left: 6, top: 8,
                              height: `calc(100% - 16px)`,
                              width: 2, background: 'rgba(0,168,122,0.18)',
                            }} />
                          )}

                          {allSteps.map((step, i) => {
                            const color = PHASE_COLORS[step.phase]
                            return (
                              <div
                                key={`${step.phase}-${i}`}
                                style={{
                                  display: 'flex', alignItems: 'flex-start', gap: 10,
                                  marginBottom: i < allSteps.length - 1 ? 14 : 0,
                                  position: 'relative',
                                }}
                              >
                                {/* Node */}
                                <div style={{
                                  position: 'absolute', left: -22, top: 1,
                                  width: 14, height: 14, borderRadius: '50%',
                                  background: step.done ? color : 'rgba(255,255,255,0.95)',
                                  border: `2px solid ${step.done ? color : 'rgba(107,114,128,0.25)'}`,
                                  boxShadow: step.done ? `0 0 0 3px ${color}22` : 'none',
                                  zIndex: 1,
                                  flexShrink: 0,
                                }} />
                                {/* Label + time */}
                                <div>
                                  <div style={{
                                    fontSize: '0.73rem',
                                    fontWeight: step.done ? 700 : 400,
                                    fontFamily: 'Syne, sans-serif',
                                    color: step.done ? color : 'rgba(107,114,128,0.4)',
                                    textTransform: 'capitalize',
                                    letterSpacing: '0.02em',
                                    lineHeight: 1.3,
                                  }}>
                                    {PHASE_LABELS[step.phase]}
                                  </div>
                                  {step.ts != null && (
                                    <div style={{
                                      fontSize: '0.67rem', color: 'var(--text-dim)',
                                      fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
                                    }}>
                                      {new Date(step.ts).toLocaleString('en-GB', {
                                        day: '2-digit', month: 'short',
                                        hour: '2-digit', minute: '2-digit',
                                      })}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Note */}
          {candidate.note && (
            <div style={{ marginBottom: 24 }}>
              <div style={SECTION_LABEL}>Note</div>
              <div style={{
                padding: '12px 14px', borderRadius: 8,
                background: 'rgba(0,168,122,0.04)',
                border: '1px solid rgba(0,168,122,0.12)',
                fontSize: '0.82rem', color: 'var(--text)',
                lineHeight: 1.6, whiteSpace: 'pre-wrap',
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {candidate.note}
              </div>
            </div>
          )}

          {/* IMS Result */}
          {candidate.imsId && (
            <div style={{ marginBottom: 24 }}>
              <div style={SECTION_LABEL}>Interview Result</div>
              <a
                href={`/ims#${candidate.imsId}`}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  padding: '10px 16px', borderRadius: 9,
                  background: 'rgba(0,145,199,0.08)',
                  border: '1px solid rgba(0,145,199,0.25)',
                  color: 'var(--secondary)',
                  fontSize: '0.82rem', fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  textDecoration: 'none',
                  transition: 'background 0.15s',
                }}
              >
                📋 View IMS Result →
              </a>
            </div>
          )}

          {/* Activity */}
          <div style={{ marginBottom: 24 }}>
            <div style={SECTION_LABEL}>Activity</div>
            <ActivityFeed entityType="candidate" entityId={candidate.id} />
          </div>
        </div>

        {/* Footer */}
        <div style={{
          padding: '14px 20px',
          borderTop: '1px solid rgba(0,168,122,0.12)',
          display: 'flex', gap: 10,
        }}>
          <button
            onClick={() => onEdit(candidate)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', fontSize: '0.82rem', fontFamily: 'Syne, sans-serif',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(candidate)}
            style={{
              flex: 1, padding: '9px 0', borderRadius: 9,
              border: '1px solid rgba(224,69,122,0.4)',
              background: 'rgba(224,69,122,0.06)',
              color: '#e0457a', fontSize: '0.82rem', fontFamily: 'Syne, sans-serif',
              fontWeight: 700, cursor: 'pointer',
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </>
  )
}
