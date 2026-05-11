'use client'

import type { CRMCandidate } from '@/lib/types'

interface BirthdayCandidate {
  candidate: CRMCandidate
  daysUntil: number   // 0 = today, positive = upcoming
}

interface Props {
  candidates: CRMCandidate[]
  onClose: () => void
  onOpenCandidate: (c: CRMCandidate) => void
}

/** How many days ahead to notify */
const ALERT_DAYS = 7

function getDaysUntilBirthday(dateOfBirth: string): number {
  const now = new Date()
  const dob = new Date(dateOfBirth)
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const next = new Date(now.getFullYear(), dob.getMonth(), dob.getDate())
  if (next < todayMidnight) next.setFullYear(now.getFullYear() + 1)
  const diffMs = next.getTime() - todayMidnight.getTime()
  return Math.round(diffMs / (1000 * 60 * 60 * 24))
}

export function getUpcomingBirthdays(candidates: CRMCandidate[]): BirthdayCandidate[] {
  return candidates
    .filter(c => Boolean(c.dateOfBirth))
    .map(c => ({ candidate: c, daysUntil: getDaysUntilBirthday(c.dateOfBirth!) }))
    .filter(({ daysUntil }) => daysUntil <= ALERT_DAYS)
    .sort((a, b) => a.daysUntil - b.daysUntil)
}

function formatBirthdayDate(dateOfBirth: string): string {
  const d = new Date(dateOfBirth)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
}

export default function BirthdayAlert({ candidates, onClose, onOpenCandidate }: Props) {
  const upcoming = getUpcomingBirthdays(candidates)
  if (upcoming.length === 0) return null

  return (
    <div style={{
      position: 'fixed', inset: 0,
      background: 'rgba(0,0,0,0.45)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 300, backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.98)',
        borderRadius: 18,
        width: '100%', maxWidth: 460,
        boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px',
          background: 'linear-gradient(135deg, #ff8c42, #e0457a)',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: '1.1rem', color: 'white',
            }}>
              Upcoming Birthdays
            </div>
            <div style={{ fontSize: '0.72rem', color: 'rgba(255,255,255,0.8)', marginTop: 2 }}>
              Don&apos;t forget to send a gift!
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.2)', border: 'none',
              borderRadius: 8, width: 32, height: 32,
              cursor: 'pointer', color: 'white', fontSize: '1rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            ✕
          </button>
        </div>

        {/* List */}
        <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          {upcoming.map(({ candidate, daysUntil }) => {
            const isToday = daysUntil === 0
            const label = isToday ? 'Today!' : daysUntil === 1 ? 'Tomorrow' : `In ${daysUntil} days`
            const badgeColor = isToday ? '#e0457a' : daysUntil <= 2 ? '#ff8c42' : '#0091c7'

            return (
              <button
                key={candidate.id}
                onClick={() => { onClose(); onOpenCandidate(candidate) }}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 10,
                  border: `1.5px solid ${isToday ? '#e0457a33' : 'rgba(0,168,122,0.15)'}`,
                  background: isToday ? 'rgba(224,69,122,0.04)' : 'rgba(0,168,122,0.03)',
                  cursor: 'pointer', textAlign: 'left', width: '100%',
                  transition: 'background 0.15s',
                }}
              >
                <div>
                  <div style={{
                    fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    fontSize: '0.9rem', color: 'var(--text)',
                  }}>
                    {candidate.firstName} {candidate.lastName}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 2 }}>
                    {candidate.position} &middot; {formatBirthdayDate(candidate.dateOfBirth!)}
                  </div>
                </div>
                <span style={{
                  padding: '4px 10px', borderRadius: 20,
                  background: badgeColor, color: 'white',
                  fontSize: '0.72rem', fontWeight: 700,
                  fontFamily: 'Syne, sans-serif', whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>

        {/* Footer */}
        <div style={{ padding: '12px 24px 20px', textAlign: 'right' }}>
          <button
            onClick={onClose}
            style={{
              padding: '9px 24px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, #ff8c42, #e0457a)',
              color: 'white', fontSize: '0.82rem',
              fontFamily: 'Syne, sans-serif', fontWeight: 700, cursor: 'pointer',
            }}
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
