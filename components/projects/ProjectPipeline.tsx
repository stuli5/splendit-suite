'use client'

import { useState } from 'react'
import Link from 'next/link'
import type { Project, ProjectCandidate, ProjectPhase } from '@/lib/types'
import { updateCandidatePhase, removeCandidateFromProject } from '@/lib/project-candidates'
import { useAuth } from '@/lib/auth-context'

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

function timeAgo(ts: number): string {
  const d = Date.now() - ts
  const days = Math.floor(d / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return '1d'
  if (days < 30)  return `${days}d`
  return `${Math.floor(days / 30)}mo`
}

function Avatar({ firstName, lastName }: { firstName: string; lastName: string }) {
  const initials = `${firstName[0] ?? ''}${lastName[0] ?? ''}`.toUpperCase()
  return (
    <div style={{
      width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
      background: 'linear-gradient(135deg, #00a87a, #0091c7)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: '0.68rem', fontWeight: 800, color: '#fff',
      fontFamily: 'Syne, sans-serif',
    }}>
      {initials}
    </div>
  )
}

interface Props {
  project:    Project
  candidates: ProjectCandidate[]
  onChange:   () => void
}

async function handleRemove(
  pc: ProjectCandidate,
  actor: { uid: string; displayName: string; email: string } | undefined,
  onChange: () => void,
) {
  if (!confirm(`Remove ${pc.candidateFirstName} ${pc.candidateLastName} from this project?`)) return
  await removeCandidateFromProject(pc.id, actor
    ? { actor, entityName: `${pc.candidateFirstName} ${pc.candidateLastName}` }
    : undefined)
  onChange()
}

export default function ProjectPipeline({ project, candidates, onChange }: Props) {
  const { user } = useAuth()
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dropPhase,  setDropPhase]  = useState<ProjectPhase | null>(null)

  function getActor() {
    if (!user) return undefined
    return { uid: user.uid, displayName: user.displayName ?? user.email ?? 'Unknown', email: user.email ?? '' }
  }

  async function handleDrop(phase: ProjectPhase) {
    if (!draggingId) return
    const pc = candidates.find(c => c.id === draggingId)
    if (!pc || pc.phase === phase) { setDraggingId(null); setDropPhase(null); return }
    const actor = getActor()
    await updateCandidatePhase(draggingId, phase, actor
      ? { actor, entityName: `${pc.candidateFirstName} ${pc.candidateLastName}` }
      : undefined)
    setDraggingId(null)
    setDropPhase(null)
    onChange()
  }

  return (
    <div style={{ display: 'flex', gap: 10, overflowX: 'auto', paddingBottom: 12, alignItems: 'flex-start' }}>
      {project.phases.map(phase => {
        const cards = candidates.filter(c => c.phase === phase)
        const color = PHASE_COLORS[phase]
        const isOver = dropPhase === phase

        return (
          <div
            key={phase}
            onDragOver={e => { e.preventDefault(); setDropPhase(phase) }}
            onDragLeave={() => setDropPhase(null)}
            onDrop={() => handleDrop(phase)}
            style={{
              minWidth: 205, width: 205, flexShrink: 0, borderRadius: 12,
              border: isOver ? `2px solid ${color}` : '1px solid rgba(0,0,0,0.08)',
              background: isOver ? `${color}0a` : 'rgba(255,255,255,0.75)',
              backdropFilter: 'blur(8px)',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            {/* Column header */}
            <div style={{
              padding: '11px 14px 10px', display: 'flex', alignItems: 'center', gap: 8,
              borderBottom: `2px solid ${color}`,
            }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: '#111', flex: 1 }}>
                {PHASE_LABELS[phase]}
              </span>
              <span style={{
                fontFamily: 'JetBrains Mono, monospace', fontSize: '0.68rem', color: '#aaa', fontWeight: 600,
                background: 'rgba(0,0,0,0.06)', borderRadius: 10, padding: '1px 7px',
              }}>
                {cards.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ padding: 8, display: 'flex', flexDirection: 'column', gap: 6, minHeight: 60 }}>
              {cards.map(c => (
                <div
                  key={c.id}
                  draggable
                  onDragStart={() => setDraggingId(c.id)}
                  onDragEnd={() => { setDraggingId(null); setDropPhase(null) }}
                  style={{
                    background: '#fff', borderRadius: 9, padding: '10px 12px',
                    border: '1px solid rgba(0,0,0,0.07)',
                    cursor: 'grab', display: 'flex', alignItems: 'center', gap: 10,
                    opacity: draggingId === c.id ? 0.45 : 1,
                    boxShadow: draggingId === c.id ? '0 4px 16px rgba(0,0,0,0.12)' : '0 1px 3px rgba(0,0,0,0.05)',
                    transition: 'opacity 0.15s, box-shadow 0.15s',
                    position: 'relative',
                  }}
                >
                  <Avatar firstName={c.candidateFirstName} lastName={c.candidateLastName} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.78rem', color: '#111',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {c.candidateFirstName} {c.candidateLastName}
                    </div>
                    <div style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.64rem', color: '#bbb', marginTop: 2 }}>
                      {timeAgo(c.addedAt)}
                    </div>
                  </div>
                  {/* Action buttons */}
                  <div
                    style={{ display: 'flex', flexDirection: 'column', gap: 3, flexShrink: 0 }}
                    onMouseDown={e => e.stopPropagation()}
                  >
                    <Link
                      href={`/crm/candidates?open=${c.candidateId}`}
                      draggable={false}
                      title="Open candidate"
                      onClick={e => e.stopPropagation()}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: 5,
                        background: 'rgba(0,145,199,0.1)', color: '#0091c7',
                        textDecoration: 'none', fontSize: '0.7rem',
                        transition: 'background 0.15s',
                      }}
                    >
                      ↗
                    </Link>
                    <button
                      draggable={false}
                      title="Remove from project"
                      onClick={e => { e.stopPropagation(); handleRemove(c, getActor(), onChange) }}
                      style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        width: 22, height: 22, borderRadius: 5, border: 'none',
                        background: 'rgba(224,69,122,0.1)', color: '#e0457a',
                        cursor: 'pointer', fontSize: '0.75rem',
                        transition: 'background 0.15s',
                      }}
                    >
                      ×
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )
      })}
    </div>
  )
}
