'use client'

import { useEffect, useState } from 'react'
import { getEntityActivity } from '@/lib/activity-log'
import type { ActivityLogEntry, ActivityEntityType } from '@/lib/types'

const ACTION_LABELS: Record<string, string> = {
  'candidate.created':              'Added candidate',
  'candidate.updated':              'Updated',
  'candidate.stage_changed':        'Changed stage',
  'candidate.deleted':              'Deleted',
  'project.created':                'Created project',
  'project.updated':                'Updated project',
  'project.deleted':                'Deleted project',
  'project_candidate.added':        'Added to project',
  'project_candidate.phase_changed':'Moved in pipeline',
  'project_candidate.removed':      'Removed from project',
}

const ACTION_COLORS: Record<string, string> = {
  'candidate.created':              '#00a87a',
  'candidate.updated':              '#0091c7',
  'candidate.stage_changed':        '#6b46a8',
  'candidate.deleted':              '#e0457a',
  'project.created':                '#00a87a',
  'project.updated':                '#0091c7',
  'project.deleted':                '#e0457a',
  'project_candidate.added':        '#00a87a',
  'project_candidate.phase_changed':'#6b46a8',
  'project_candidate.removed':      '#e0457a',
}

interface Props {
  entityType: ActivityEntityType
  entityId:   string
}

export default function ActivityFeed({ entityType, entityId }: Props) {
  const [entries, setEntries]   = useState<ActivityLogEntry[]>([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    getEntityActivity(entityType, entityId)
      .then(data => { if (!cancelled) setEntries(data) })
      .catch(() => {})
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [entityType, entityId])

  if (loading) {
    return (
      <div style={{
        fontSize: '0.72rem', color: 'var(--text-dim)',
        fontFamily: 'JetBrains Mono, monospace',
      }}>
        Loading...
      </div>
    )
  }

  if (entries.length === 0) {
    return (
      <div style={{
        fontSize: '0.72rem', color: 'var(--text-dim)',
        fontFamily: 'JetBrains Mono, monospace',
        padding: '8px 0',
      }}>
        No activity yet
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, position: 'relative' }}>
      {/* Vertical line */}
      {entries.length > 1 && (
        <div style={{
          position: 'absolute', left: 7, top: 14, bottom: 8,
          width: 2, background: 'rgba(0,168,122,0.12)',
        }} />
      )}

      {entries.map((entry, i) => {
        const color = ACTION_COLORS[entry.action] ?? '#6b7280'
        const label = ACTION_LABELS[entry.action] ?? entry.action
        const date  = new Date(entry.ts)

        const dateStr = date.toLocaleDateString('en-GB', {
          day: '2-digit', month: 'short', year: 'numeric',
        })
        const timeStr = date.toLocaleTimeString('en-GB', {
          hour: '2-digit', minute: '2-digit',
        })

        return (
          <div
            key={entry.id}
            style={{
              display: 'flex', gap: 12, alignItems: 'flex-start',
              paddingBottom: i < entries.length - 1 ? 14 : 0,
              position: 'relative',
            }}
          >
            {/* Dot */}
            <div style={{
              width: 16, height: 16, borderRadius: '50%', flexShrink: 0,
              background: `${color}18`,
              border: `2px solid ${color}`,
              marginTop: 2, zIndex: 1,
            }} />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: '0.75rem', fontWeight: 700,
                fontFamily: 'Syne, sans-serif', color,
                lineHeight: 1.3,
              }}>
                {label}
              </div>
              <div style={{
                fontSize: '0.72rem', color: 'var(--text)',
                fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
              }}>
                {entry.actor.displayName}
              </div>
              <div style={{
                fontSize: '0.65rem', color: 'var(--text-dim)',
                fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
              }}>
                {dateStr} · {timeStr}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
