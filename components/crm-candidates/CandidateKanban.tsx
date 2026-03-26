'use client'

import { useState } from 'react'
import { updateCRMCandidate } from '@/lib/crm-candidates'
import type { CRMCandidate, CRMStage } from '@/lib/types'

interface Props {
  candidates: CRMCandidate[]
  onSelect:   (c: CRMCandidate) => void
  onEdit:     (c: CRMCandidate) => void
  onRefresh:  () => void
}

const STAGES: CRMStage[] = ['new', 'screening', 'interview', 'offer']

const STAGE_LABEL: Record<CRMStage, string> = {
  new:       'New',
  screening: 'Screening',
  interview: 'Interview',
  offer:     'Offer',
}

const STAGE_COLOR: Record<CRMStage, string> = {
  new:       '#6b7280',
  screening: '#0091c7',
  interview: '#6b46a8',
  offer:     '#00a87a',
}

function prevStage(s: CRMStage): CRMStage | null {
  const idx = STAGES.indexOf(s)
  return idx > 0 ? STAGES[idx - 1] : null
}

function nextStage(s: CRMStage): CRMStage | null {
  const idx = STAGES.indexOf(s)
  return idx < STAGES.length - 1 ? STAGES[idx + 1] : null
}

interface KanbanCardProps {
  candidate: CRMCandidate
  onSelect:  (c: CRMCandidate) => void
  onMove:    (c: CRMCandidate, stage: CRMStage) => void
  moving:    string | null
}

function KanbanCard({ candidate, onSelect, onMove, moving }: KanbanCardProps) {
  const stage = candidate.stage ?? 'new'
  const prev  = prevStage(stage)
  const next  = nextStage(stage)
  const isMoving = moving === candidate.id
  const initials = `${candidate.firstName[0]}${candidate.lastName[0]}`

  return (
    <div
      onClick={() => onSelect(candidate)}
      style={{
        background: 'rgba(255,255,255,0.92)',
        border: '1px solid rgba(0,168,122,0.15)',
        borderRadius: 10,
        padding: '12px 12px 10px',
        cursor: 'pointer',
        opacity: isMoving ? 0.5 : 1,
        transition: 'box-shadow 0.15s, opacity 0.15s',
        boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={e => {
        if (!isMoving) (e.currentTarget as HTMLDivElement).style.boxShadow = '0 4px 16px rgba(0,168,122,0.18)'
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.06)'
      }}
    >
      {/* Avatar + name */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 8 }}>
        <div style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.72rem', fontWeight: 800, color: 'white',
          fontFamily: 'Syne, sans-serif',
        }}>
          {initials}
        </div>
        <div>
          <div style={{
            fontSize: '0.82rem', fontWeight: 700, color: 'var(--text)',
            fontFamily: 'Syne, sans-serif', lineHeight: 1.2,
          }}>
            {candidate.firstName} {candidate.lastName}
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 1 }}>
            {candidate.position}
          </div>
        </div>
      </div>

      {/* Email */}
      {candidate.email && (
        <div style={{
          fontSize: '0.72rem', color: 'var(--text-dim)',
          fontFamily: 'JetBrains Mono, monospace',
          marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>
          {candidate.email}
        </div>
      )}

      {/* Move buttons */}
      <div
        style={{ display: 'flex', gap: 6, justifyContent: 'flex-end' }}
        onClick={e => e.stopPropagation()}
      >
        {prev && (
          <button
            onClick={() => onMove(candidate, prev)}
            disabled={isMoving}
            title={`Move to ${STAGE_LABEL[prev]}`}
            style={{
              padding: '3px 8px', borderRadius: 6, border: `1px solid ${STAGE_COLOR[prev]}40`,
              background: `${STAGE_COLOR[prev]}10`, color: STAGE_COLOR[prev],
              fontSize: '0.65rem', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              cursor: isMoving ? 'not-allowed' : 'pointer',
            }}
          >
            ← {STAGE_LABEL[prev]}
          </button>
        )}
        {next && (
          <button
            onClick={() => onMove(candidate, next)}
            disabled={isMoving}
            title={`Move to ${STAGE_LABEL[next]}`}
            style={{
              padding: '3px 8px', borderRadius: 6, border: `1px solid ${STAGE_COLOR[next]}40`,
              background: `${STAGE_COLOR[next]}10`, color: STAGE_COLOR[next],
              fontSize: '0.65rem', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              cursor: isMoving ? 'not-allowed' : 'pointer',
            }}
          >
            {STAGE_LABEL[next]} →
          </button>
        )}
      </div>
    </div>
  )
}

export default function CandidateKanban({ candidates, onSelect, onEdit, onRefresh }: Props) {
  const [moving, setMoving] = useState<string | null>(null)

  async function handleMove(candidate: CRMCandidate, stage: CRMStage) {
    setMoving(candidate.id)
    try {
      await updateCRMCandidate(candidate.id, { ...candidate, stage })
      onRefresh()
    } finally {
      setMoving(null)
    }
  }

  return (
    <div style={{
      display: 'grid',
      gridTemplateColumns: 'repeat(4, 1fr)',
      gap: 14,
      alignItems: 'start',
    }}>
      {STAGES.map(stage => {
        const col = candidates.filter(c => (c.stage ?? 'new') === stage)
        const color = STAGE_COLOR[stage]

        return (
          <div key={stage} style={{
            borderRadius: 12,
            background: `${color}06`,
            border: `1px solid ${color}25`,
            overflow: 'hidden',
          }}>
            {/* Column header */}
            <div style={{
              padding: '12px 14px',
              borderBottom: `1px solid ${color}20`,
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              background: `${color}0d`,
            }}>
              <span style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '0.8rem', color,
                textTransform: 'uppercase', letterSpacing: '0.06em',
              }}>
                {STAGE_LABEL[stage]}
              </span>
              <span style={{
                width: 22, height: 22, borderRadius: '50%',
                background: `${color}20`, border: `1px solid ${color}40`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.7rem', fontWeight: 700, color,
                fontFamily: 'JetBrains Mono, monospace',
              }}>
                {col.length}
              </span>
            </div>

            {/* Cards */}
            <div style={{ padding: '10px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 80 }}>
              {col.length === 0 ? (
                <div style={{
                  padding: '20px 10px', textAlign: 'center',
                  fontSize: '0.72rem', color: `${color}80`,
                  fontFamily: 'JetBrains Mono, monospace',
                  borderRadius: 8, border: `1.5px dashed ${color}25`,
                }}>
                  No candidates
                </div>
              ) : (
                col.map(c => (
                  <KanbanCard
                    key={c.id}
                    candidate={c}
                    onSelect={onSelect}
                    onMove={handleMove}
                    moving={moving}
                  />
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
