'use client'

import { useEffect, useState } from 'react'
import { getDoc, doc, updateDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { CRMCandidate, CRMStage, Project, ProjectCandidate, ProjectPhase, Candidate as IMSCandidate } from '@/lib/types'
import { getCandidateProjectHistory } from '@/lib/project-candidates'
import { getProject } from '@/lib/projects'
import { getContractsByCandidate, getWorklogs, formatCurrency } from '@/lib/bodyshop'
import type { Contract, Worklog } from '@/lib/types'
import ActivityFeed from './ActivityFeed'

interface Props {
  candidate:      CRMCandidate
  onClose:        () => void
  onEdit:         (c: CRMCandidate) => void
  onDelete:       (c: CRMCandidate) => void
  onStageChange?: (c: CRMCandidate, stage: CRMStage) => void
}

const STAGE_COLORS: Record<CRMStage, string> = {
  new:       '#6b7280',
  screening: '#0091c7',
  interview: '#6b46a8',
  offer:     '#00a87a',
}

const STAGE_LABELS: Record<CRMStage, string> = {
  new:       'New',
  screening: 'Screening',
  interview: 'Interview',
  offer:     'Offer',
}

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

const NORMAL_PHASES: ProjectPhase[] = ['contacted', 'presentation', 'interview', 'onboarding', 'closed']
const STAGES: CRMStage[] = ['new', 'screening', 'interview', 'offer']

function linkedInUrl(raw: string): string {
  if (raw.startsWith('http')) return raw
  return `https://linkedin.com/in/${raw.replace(/^.*linkedin\.com\/in\//i, '').replace(/\/$/, '')}`
}

function gitHubUrl(raw: string): string {
  if (raw.startsWith('http')) return raw
  return `https://github.com/${raw.replace(/^.*github\.com\//i, '').replace(/\/$/, '')}`
}

type Assignment = { pc: ProjectCandidate; project: Project | null }
type ContractWithLogs = { contract: Contract; worklogs: Worklog[] }

export default function CandidateDetail({ candidate, onClose, onEdit, onDelete, onStageChange }: Props) {
  const stage    = candidate.stage ?? 'new'
  const initials = `${candidate.firstName[0] ?? ''}${candidate.lastName[0] ?? ''}`.toUpperCase()

  const [assignments,     setAssignments]     = useState<Assignment[]>([])
  const [pipelineLoading, setPipelineLoading] = useState(true)
  const [activeTab,       setActiveTab]       = useState<'overview' | 'evaluation' | 'activity'>('overview')
  const [imsData,         setImsData]         = useState<IMSCandidate | null>(null)
  const [imsLoading,      setImsLoading]      = useState(false)
  const [bodyshopContracts, setBodyshopContracts] = useState<ContractWithLogs[]>([])
  const [bodyshopLoading,   setBodyshopLoading]   = useState(true)

  // Lock body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [])

  useEffect(() => {
    let cancelled = false
    setPipelineLoading(true)
    async function load() {
      try {
        const pcs      = await getCandidateProjectHistory(candidate.id)
        const projects = await Promise.all(pcs.map(pc => getProject(pc.projectId)))
        if (!cancelled) setAssignments(pcs.map((pc, i) => ({ pc, project: projects[i] })))
      } finally {
        if (!cancelled) setPipelineLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [candidate.id])

  useEffect(() => {
    if (!candidate.imsId) return
    let cancelled = false
    setImsLoading(true)
    getDoc(doc(db, 'candidates', candidate.imsId))
      .then(snap => {
        if (!cancelled && snap.exists()) setImsData({ id: snap.id, ...snap.data() } as IMSCandidate)
      })
      .finally(() => { if (!cancelled) setImsLoading(false) })
    return () => { cancelled = true }
  }, [candidate.imsId])

  useEffect(() => {
    let cancelled = false
    setBodyshopLoading(true)
    getContractsByCandidate(candidate.id, `${candidate.firstName} ${candidate.lastName}`)
      .then(contracts => Promise.all(
        contracts.map(async contract => ({ contract, worklogs: await getWorklogs(contract.id) }))
      ))
      .then(results => { if (!cancelled) setBodyshopContracts(results) })
      .finally(() => { if (!cancelled) setBodyshopLoading(false) })
    return () => { cancelled = true }
  }, [candidate.id])

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 150,
        }}
      />

      {/* Panel */}
      <div style={{
        position: 'fixed',
        top: '50%', left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 'min(1040px, 96vw)',
        height: 'min(750px, 92vh)',
        background: '#fff',
        borderRadius: 16,
        boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        zIndex: 151,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
      }}>

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div style={{
          padding: '20px 28px 0',
          borderBottom: '1px solid #e5e7eb',
          background: 'linear-gradient(to right, rgba(0,168,122,0.03), rgba(0,145,199,0.03))',
          flexShrink: 0,
        }}>
          {/* Top row */}
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 16 }}>
            {/* Avatar */}
            <div style={{
              width: 56, height: 56, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #00a87a, #0091c7)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: '1.15rem', fontWeight: 800, color: '#fff',
              fontFamily: 'Syne, sans-serif',
              boxShadow: '0 2px 12px rgba(0,168,122,0.25)',
            }}>
              {initials}
            </div>

            {/* Name + meta */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                <span style={{
                  fontFamily: 'Syne, sans-serif', fontWeight: 800,
                  fontSize: '1.25rem', color: '#111', lineHeight: 1.2,
                }}>
                  {candidate.firstName} {candidate.lastName}
                </span>
                {/* Stage badge */}
                <span style={{
                  padding: '2px 10px', borderRadius: 20, fontSize: '0.7rem',
                  fontWeight: 700, fontFamily: 'Syne, sans-serif',
                  background: `${STAGE_COLORS[stage]}18`,
                  color: STAGE_COLORS[stage],
                  border: `1.5px solid ${STAGE_COLORS[stage]}40`,
                  textTransform: 'capitalize',
                }}>
                  {STAGE_LABELS[stage]}
                </span>
              </div>
              <div style={{ fontSize: '0.82rem', color: '#6b7280', marginTop: 4 }}>
                {candidate.position}
              </div>
              <div style={{ fontSize: '0.72rem', color: '#9ca3af', marginTop: 3 }}>
                Added {new Date(candidate.createdAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>

            {/* Action buttons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <button
                onClick={() => onEdit(candidate)}
                style={{
                  padding: '7px 16px', borderRadius: 8, border: '1px solid #d1d5db',
                  background: '#fff', color: '#374151', fontSize: '0.8rem',
                  fontFamily: 'Syne, sans-serif', fontWeight: 600, cursor: 'pointer',
                  transition: 'background 0.15s',
                }}
              >
                Edit
              </button>
              <button
                onClick={() => onDelete(candidate)}
                style={{
                  padding: '7px 16px', borderRadius: 8,
                  border: '1px solid rgba(224,69,122,0.35)',
                  background: 'rgba(224,69,122,0.05)', color: '#e0457a',
                  fontSize: '0.8rem', fontFamily: 'Syne, sans-serif',
                  fontWeight: 600, cursor: 'pointer', transition: 'background 0.15s',
                }}
              >
                Delete
              </button>
              <button
                onClick={onClose}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: '1.1rem', color: '#9ca3af', padding: '4px 6px',
                  lineHeight: 1, marginLeft: 4,
                }}
                aria-label="Close"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div style={{ display: 'flex', gap: 0 }}>
            {([
              { key: 'overview',    label: 'Overview' },
              { key: 'evaluation',  label: 'Evaluation', disabled: !candidate.imsId },
              { key: 'activity',    label: 'Activity' },
            ] as const).map(({ key, label, disabled }) => (
              <button
                key={key}
                onClick={() => !disabled && setActiveTab(key)}
                disabled={disabled}
                style={{
                  padding: '10px 18px', border: 'none', background: 'none',
                  cursor: disabled ? 'not-allowed' : 'pointer',
                  fontSize: '0.78rem', fontWeight: 700,
                  fontFamily: 'Syne, sans-serif', letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                  color: disabled ? '#d1d5db' : activeTab === key ? '#00a87a' : '#9ca3af',
                  borderBottom: activeTab === key ? '2px solid #00a87a' : '2px solid transparent',
                  transition: 'color 0.15s, border-color 0.15s',
                  marginBottom: -1,
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────────────── */}
        {activeTab === 'overview' ? (
          <div style={{
            flex: 1, display: 'flex', overflow: 'hidden',
          }}>
            {/* Left column — profile details */}
            <div style={{
              width: '54%', overflowY: 'auto',
              padding: '24px 24px 24px 28px',
              borderRight: '1px solid #f3f4f6',
            }}>

              {/* Contact */}
              <Section label="Contact">
                <InfoRow icon="✉" label="Email">
                  {candidate.email
                    ? <a href={`mailto:${candidate.email}`} style={linkStyle}>{candidate.email}</a>
                    : <Dim>—</Dim>
                  }
                </InfoRow>
                <InfoRow icon="☎" label="Phone">
                  {candidate.phone
                    ? <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.82rem' }}>{candidate.phone}</span>
                    : <Dim>—</Dim>
                  }
                </InfoRow>
              </Section>

              {/* Socials */}
              <Section label="Socials">
                <InfoRow icon="in" label="LinkedIn" iconColor="#0077b5">
                  {candidate.linkedIn
                    ? <a href={linkedInUrl(candidate.linkedIn)} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, color: '#0077b5' }}>
                        {candidate.linkedIn.replace(/^https?:\/\/(www\.)?/i, '')}
                      </a>
                    : <Dim>—</Dim>
                  }
                </InfoRow>
                <InfoRow icon="gh" label="GitHub" iconColor="#24292e">
                  {candidate.gitHub
                    ? <a href={gitHubUrl(candidate.gitHub)} target="_blank" rel="noopener noreferrer" style={{ ...linkStyle, color: '#24292e' }}>
                        {candidate.gitHub.replace(/^https?:\/\/(www\.)?/i, '')}
                      </a>
                    : <Dim>—</Dim>
                  }
                </InfoRow>
              </Section>

              {/* CV */}
              <Section label="CV / Resume">
                {candidate.cvUrl
                  ? (
                    <a
                      href={candidate.cvUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        display: 'inline-flex', alignItems: 'center', gap: 8,
                        padding: '9px 14px', borderRadius: 8,
                        background: 'rgba(0,168,122,0.06)',
                        border: '1px solid rgba(0,168,122,0.2)',
                        color: '#00a87a', fontSize: '0.8rem',
                        fontFamily: 'JetBrains Mono, monospace',
                        textDecoration: 'none',
                      }}
                    >
                      📎 {candidate.cvName ?? 'Download CV'}
                    </a>
                  )
                  : <Dim>No CV uploaded</Dim>
                }
              </Section>

              {/* Skills */}
              {candidate.skills && candidate.skills.length > 0 && (
                <Section label="Skills">
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                    {[...new Set(candidate.skills)].map(s => (
                      <span
                        key={s}
                        style={{
                          padding: '3px 10px', borderRadius: 20,
                          background: 'rgba(0,168,122,0.08)',
                          border: '1px solid rgba(0,168,122,0.22)',
                          fontSize: '0.72rem', color: '#00a87a',
                          fontFamily: 'JetBrains Mono, monospace',
                        }}
                      >
                        {s}
                      </span>
                    ))}
                  </div>
                </Section>
              )}

              {/* Note */}
              {candidate.note && (
                <Section label="Note">
                  <div style={{
                    padding: '12px 14px', borderRadius: 8,
                    background: 'rgba(107,114,128,0.04)',
                    border: '1px solid rgba(107,114,128,0.12)',
                    fontSize: '0.82rem', color: '#374151',
                    lineHeight: 1.6, whiteSpace: 'pre-wrap',
                    fontFamily: 'JetBrains Mono, monospace',
                  }}>
                    {candidate.note}
                  </div>
                </Section>
              )}

            </div>

            {/* Right column — pipeline & actions */}
            <div style={{
              width: '46%', overflowY: 'auto',
              padding: '24px 28px 24px 24px',
              background: '#fafafa',
            }}>

              {/* CRM Stage */}
              <Section label="CRM Stage">
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
                          padding: '5px 14px', borderRadius: 20,
                          background: active ? color : '#fff',
                          border: `1.5px solid ${active ? color : '#e5e7eb'}`,
                          color: active ? '#fff' : '#6b7280',
                          fontSize: '0.73rem', fontWeight: 700,
                          fontFamily: 'Syne, sans-serif',
                          cursor: onStageChange ? 'pointer' : 'default',
                          transition: 'all 0.15s',
                        }}
                      >
                        {STAGE_LABELS[s]}
                      </button>
                    )
                  })}
                </div>
              </Section>

              {/* IMS Result */}
              {candidate.imsId && (
                <Section label="Interview Result">
                  <a
                    href={`/ims#${candidate.imsId}`}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      padding: '9px 14px', borderRadius: 8,
                      background: 'rgba(0,145,199,0.07)',
                      border: '1px solid rgba(0,145,199,0.22)',
                      color: '#0091c7', fontSize: '0.8rem',
                      fontFamily: 'Syne, sans-serif', fontWeight: 700,
                      textDecoration: 'none',
                    }}
                  >
                    📋 View IMS Result →
                  </a>
                </Section>
              )}

              {/* Bodyshop */}
              {(bodyshopLoading || bodyshopContracts.length > 0) && (
                <Section label="Bodyshop">
                  {bodyshopLoading ? (
                    <Dim>Loading...</Dim>
                  ) : (
                    <BodyshopSection contracts={bodyshopContracts} />
                  )}
                </Section>
              )}

              {/* Project Pipeline */}
              <Section label="Project Pipeline">
                {pipelineLoading ? (
                  <Dim>Loading...</Dim>
                ) : assignments.length === 0 ? (
                  <Dim>Not assigned to any project</Dim>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {assignments.map(({ pc, project }) => {
                      const history      = [...(pc.phaseHistory ?? [])].sort((a, b) => a.ts - b.ts)
                      const historyPhases = new Set(history.map(h => h.phase))
                      const pendingPhases = pc.phase === 'rejected'
                        ? []
                        : NORMAL_PHASES.filter(p => !historyPhases.has(p))
                      const allSteps = [
                        ...history.map(h => ({ phase: h.phase, ts: h.ts as number | null, done: true })),
                        ...pendingPhases.map(p => ({ phase: p, ts: null, done: false })),
                      ]

                      return (
                        <div key={pc.id} style={{
                          padding: '14px 16px', borderRadius: 10,
                          background: '#fff',
                          border: '1px solid #e5e7eb',
                          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
                        }}>
                          {/* Project name */}
                          <div style={{
                            fontSize: '0.78rem', fontWeight: 700,
                            fontFamily: 'Syne, sans-serif', color: '#111',
                            marginBottom: 12,
                            display: 'flex', alignItems: 'center', gap: 6,
                          }}>
                            <span style={{
                              width: 7, height: 7, borderRadius: '50%',
                              background: PHASE_COLORS[pc.phase], flexShrink: 0,
                            }} />
                            {project?.positionName ?? 'Unknown project'}
                            {project?.companyName && (
                              <span style={{ fontWeight: 400, color: '#9ca3af' }}>
                                @ {project.companyName}
                              </span>
                            )}
                          </div>

                          {/* Timeline */}
                          <div style={{ position: 'relative', paddingLeft: 20 }}>
                            {allSteps.length > 1 && (
                              <div style={{
                                position: 'absolute', left: 5, top: 8,
                                height: 'calc(100% - 16px)',
                                width: 2, background: '#f3f4f6',
                              }} />
                            )}
                            {allSteps.map((step, i) => {
                              const color = PHASE_COLORS[step.phase]
                              return (
                                <div
                                  key={`${step.phase}-${i}`}
                                  style={{
                                    display: 'flex', alignItems: 'flex-start', gap: 10,
                                    marginBottom: i < allSteps.length - 1 ? 12 : 0,
                                    position: 'relative',
                                  }}
                                >
                                  <div style={{
                                    position: 'absolute', left: -20, top: 2,
                                    width: 12, height: 12, borderRadius: '50%',
                                    background: step.done ? color : '#fff',
                                    border: `2px solid ${step.done ? color : '#d1d5db'}`,
                                    boxShadow: step.done ? `0 0 0 3px ${color}22` : 'none',
                                    zIndex: 1, flexShrink: 0,
                                  }} />
                                  <div>
                                    <div style={{
                                      fontSize: '0.72rem',
                                      fontWeight: step.done ? 700 : 400,
                                      fontFamily: 'Syne, sans-serif',
                                      color: step.done ? color : '#d1d5db',
                                    }}>
                                      {PHASE_LABELS[step.phase]}
                                    </div>
                                    {step.ts != null && (
                                      <div style={{
                                        fontSize: '0.65rem', color: '#9ca3af',
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
              </Section>

            </div>
          </div>
        ) : activeTab === 'evaluation' ? (
          /* Evaluation tab */
          <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
            {imsLoading ? (
              <Dim>Loading evaluation...</Dim>
            ) : !imsData ? (
              <Dim>No evaluation data found.</Dim>
            ) : (
              <EvaluationPanel data={imsData} />
            )}
          </div>
        ) : (
          /* Activity tab */
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 28px' }}>
            <ActivityFeed entityType="candidate" entityId={candidate.id} />
          </div>
        )}
      </div>
    </>
  )
}

/* ── Sub-components ─────────────────────────────────────────────────────── */

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{
        fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af',
        letterSpacing: '0.09em', marginBottom: 10, textTransform: 'uppercase',
        fontFamily: 'Syne, sans-serif',
      }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function InfoRow({
  icon, label, iconColor = '#6b7280', children,
}: {
  icon: string; label: string; iconColor?: string; children: React.ReactNode
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '8px 0', borderBottom: '1px solid #f3f4f6',
    }}>
      <span style={{
        width: 28, fontSize: '0.72rem', fontWeight: 800,
        color: iconColor, fontFamily: 'Syne, sans-serif',
        flexShrink: 0, textAlign: 'center',
      }}>
        {icon}
      </span>
      <span style={{
        width: 70, fontSize: '0.72rem', color: '#9ca3af',
        fontFamily: 'Syne, sans-serif', fontWeight: 600,
        flexShrink: 0,
      }}>
        {label}
      </span>
      <div style={{ flex: 1, minWidth: 0, fontSize: '0.82rem', color: '#374151' }}>
        {children}
      </div>
    </div>
  )
}

function Dim({ children }: { children: React.ReactNode }) {
  return (
    <span style={{
      fontSize: '0.8rem', color: '#9ca3af',
      fontFamily: 'JetBrains Mono, monospace',
    }}>
      {children}
    </span>
  )
}

const linkStyle: React.CSSProperties = {
  color: '#0091c7', textDecoration: 'none', fontSize: '0.82rem',
  overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
  display: 'block',
}

/* ── BodyshopSection ─────────────────────────────────────────────────────── */

function BodyshopSection({ contracts }: { contracts: ContractWithLogs[] }) {
  const totals = contracts.reduce(
    (acc, { worklogs }) => {
      for (const w of worklogs) {
        acc.revenue += w.revenue
        acc.cost    += w.cost
        acc.profit  += w.profit
        acc.days    += w.daysWorked
      }
      return acc
    },
    { revenue: 0, cost: 0, profit: 0, days: 0 },
  )

  // Use currency from first contract (all contracts for one candidate are typically same currency)
  const currency = contracts[0]?.contract.currency ?? 'CZK'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {/* Summary strip */}
      {totals.days > 0 && (
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr 1fr',
          gap: 8, marginBottom: 4,
        }}>
          {[
            { label: 'Revenue', value: formatCurrency(totals.revenue, currency), color: '#00a87a' },
            { label: 'Cost',    value: formatCurrency(totals.cost,    currency), color: '#e0457a' },
            { label: 'Profit',  value: formatCurrency(totals.profit,  currency), color: totals.profit >= 0 ? '#0091c7' : '#e0457a' },
          ].map(({ label, value, color }) => (
            <div key={label} style={{
              padding: '8px 10px', borderRadius: 8, textAlign: 'center',
              background: `${color}08`, border: `1px solid ${color}22`,
            }}>
              <div style={{ fontSize: '0.62rem', color: '#9ca3af', fontFamily: 'Syne, sans-serif', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 3 }}>
                {label}
              </div>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', color }}>
                {value}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Per-contract cards */}
      {contracts.map(({ contract, worklogs }) => {
        const cRev    = worklogs.reduce((s, w) => s + w.revenue, 0)
        const cProfit = worklogs.reduce((s, w) => s + w.profit,  0)
        const cDays   = worklogs.reduce((s, w) => s + w.daysWorked, 0)
        const isActive = contract.status === 'active'

        return (
          <div key={contract.id} style={{
            padding: '12px 14px', borderRadius: 9,
            background: '#fff', border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 8 }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.75rem', color: '#111', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {contract.clientName}
                </div>
                <div style={{ fontSize: '0.66rem', color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace', marginTop: 2 }}>
                  {contract.startDate}{contract.endDate ? ` → ${contract.endDate}` : ' → ongoing'}
                </div>
              </div>
              <span style={{
                padding: '2px 8px', borderRadius: 20, fontSize: '0.62rem', fontWeight: 700,
                fontFamily: 'Syne, sans-serif', flexShrink: 0,
                background: isActive ? 'rgba(0,168,122,0.1)' : 'rgba(107,114,128,0.08)',
                color: isActive ? '#00a87a' : '#6b7280',
                border: `1px solid ${isActive ? 'rgba(0,168,122,0.25)' : 'rgba(107,114,128,0.2)'}`,
              }}>
                {isActive ? 'Active' : 'Ended'}
              </span>
            </div>

            <div style={{ display: 'flex', gap: 12, fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace' }}>
              <span style={{ color: '#6b7280' }}>{cDays}d worked</span>
              {cRev > 0 && <span style={{ color: '#00a87a' }}>↑ {formatCurrency(cRev, contract.currency)}</span>}
              {cProfit !== 0 && (
                <span style={{ color: cProfit >= 0 ? '#0091c7' : '#e0457a' }}>
                  profit {formatCurrency(cProfit, contract.currency)}
                </span>
              )}
              {cDays === 0 && <Dim>No worklogs yet</Dim>}
            </div>
          </div>
        )
      })}
    </div>
  )
}

/* ── EvaluationPanel ─────────────────────────────────────────────────────── */

const DIFF_COLORS: Record<string, string> = {
  easy:     '#00a87a',
  medium:   '#0091c7',
  hard:     '#6b46a8',
  critical: '#e0457a',
}

const STATUS_COLORS: Record<string, string> = {
  pending:   '#9ca3af',
  scheduled: '#0091c7',
  done:      '#6b7280',
  second:    '#6b46a8',
  hired:     '#00a87a',
  rejected:  '#e0457a',
}

function EvaluationPanel({ data }: { data: IMSCandidate }) {
  const pct        = data.maxPoints > 0 ? Math.round((data.totalPoints / data.maxPoints) * 100) : 0
  const scoreColor = pct >= 75 ? '#00a87a' : pct >= 50 ? '#0091c7' : pct >= 30 ? '#f59e0b' : '#e0457a'

  const [text,    setText]    = useState(data.finalConclusion ?? '')
  const [saving,  setSaving]  = useState(false)
  const [saved,   setSaved]   = useState(false)
  const dirty = text !== (data.finalConclusion ?? '')

  async function save() {
    setSaving(true)
    await updateDoc(doc(db, 'candidates', data.id), { finalConclusion: text, conclusionUpdated: Date.now() })
    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const diffStats = [
    { key: 'easy',     label: 'Easy',     val: data.easyScore },
    { key: 'medium',   label: 'Medium',   val: data.mediumScore },
    { key: 'hard',     label: 'Hard',     val: data.hardScore },
    { key: 'critical', label: 'Critical', val: data.criticalScore ?? 0 },
  ].filter(d => d.val > 0)

  return (
    <div style={{ maxWidth: 680 }}>

      {/* Score hero */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 28, marginBottom: 28,
        padding: '20px 24px', borderRadius: 12,
        background: `linear-gradient(135deg, ${scoreColor}0d, ${scoreColor}06)`,
        border: `1px solid ${scoreColor}28`,
      }}>
        {/* Ring */}
        <div style={{ position: 'relative', width: 86, height: 86, flexShrink: 0 }}>
          <svg width="86" height="86" viewBox="0 0 86 86">
            <circle cx="43" cy="43" r="36" fill="none" stroke="#f3f4f6" strokeWidth="8" />
            <circle
              cx="43" cy="43" r="36" fill="none"
              stroke={scoreColor} strokeWidth="8" strokeLinecap="round"
              strokeDasharray={`${2 * Math.PI * 36}`}
              strokeDashoffset={`${2 * Math.PI * 36 * (1 - pct / 100)}`}
              transform="rotate(-90 43 43)"
            />
          </svg>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: scoreColor, lineHeight: 1 }}>
              {pct}%
            </span>
            <span style={{ fontSize: '0.58rem', color: '#9ca3af', fontFamily: 'JetBrains Mono, monospace' }}>score</span>
          </div>
        </div>

        {/* Stats */}
        <div style={{ flex: 1 }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: '#111', marginBottom: 3 }}>
            {data.totalPoints} / {data.maxPoints} pts
          </div>
          <div style={{ fontSize: '0.76rem', color: '#6b7280', marginBottom: 10 }}>
            {data.position}{data.experience ? ` · ${data.experience}` : ''}
          </div>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {diffStats.map(d => (
              <span key={d.key} style={{
                padding: '2px 9px', borderRadius: 20, fontSize: '0.68rem', fontWeight: 700,
                background: `${DIFF_COLORS[d.key]}15`, color: DIFF_COLORS[d.key],
                border: `1px solid ${DIFF_COLORS[d.key]}30`, fontFamily: 'Syne, sans-serif',
              }}>
                {d.label}: {d.val}
              </span>
            ))}
          </div>
        </div>

        {/* Stars + status */}
        {data.rating && (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <div style={{ fontSize: '1.25rem', letterSpacing: 2, color: '#f59e0b' }}>
              {'★'.repeat(data.rating.stars)}
              <span style={{ color: '#e5e7eb' }}>{'★'.repeat(Math.max(0, 5 - data.rating.stars))}</span>
            </div>
            <span style={{
              padding: '2px 10px', borderRadius: 20, fontSize: '0.67rem', fontWeight: 700,
              background: `${STATUS_COLORS[data.rating.status] ?? '#9ca3af'}18`,
              color: STATUS_COLORS[data.rating.status] ?? '#9ca3af',
              border: `1px solid ${STATUS_COLORS[data.rating.status] ?? '#9ca3af'}30`,
              fontFamily: 'Syne, sans-serif', textTransform: 'capitalize',
            }}>
              {data.rating.status}
            </span>
          </div>
        )}
      </div>

      {/* Final Conclusion — editable */}
      <div>
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10,
        }}>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, color: '#9ca3af',
            letterSpacing: '0.09em', textTransform: 'uppercase', fontFamily: 'Syne, sans-serif',
          }}>
            Final Conclusion
          </span>
          {(dirty || saved) && (
            <button
              onClick={save}
              disabled={saving || saved}
              style={{
                padding: '4px 14px', borderRadius: 7, border: 'none',
                background: saved ? '#00a87a' : '#111',
                color: '#fff', fontSize: '0.73rem', fontWeight: 700,
                fontFamily: 'Syne, sans-serif', cursor: saving ? 'wait' : 'pointer',
                transition: 'background 0.2s',
              }}
            >
              {saved ? 'Saved ✓' : saving ? 'Saving...' : 'Save'}
            </button>
          )}
        </div>
        <textarea
          value={text}
          onChange={e => { setText(e.target.value); setSaved(false) }}
          placeholder="Write the final conclusion for this candidate..."
          rows={10}
          style={{
            width: '100%', boxSizing: 'border-box',
            padding: '14px 16px', borderRadius: 10,
            border: dirty ? '1.5px solid #00a87a' : '1px solid #e5e7eb',
            background: '#f9fafb',
            fontSize: '0.83rem', color: '#374151',
            lineHeight: 1.65, resize: 'vertical',
            fontFamily: 'JetBrains Mono, monospace',
            outline: 'none', transition: 'border-color 0.15s',
          }}
        />
      </div>
    </div>
  )
}
