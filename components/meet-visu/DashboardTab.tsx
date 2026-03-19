'use client'

import { useMemo } from 'react'
import { parseActions, updateMeet, initials } from '@/lib/meet-visu'
import type { Meet, Person } from '@/lib/types'

interface Props {
  meets:   Meet[]
  people:  Person[]
  onReload: () => void
  onOpenMeet: (meet: Meet) => void
}

export default function DashboardTab({ meets, people, onReload, onOpenMeet }: Props) {
  const now = new Date()

  const { totalMeets, thisMonthMeets, openActions, topPeople, recentMeets } = useMemo(() => {
    const thisMonth = now.toISOString().slice(0, 7)
    const thisMonthMeets = meets.filter(m => m.date?.startsWith(thisMonth)).length

    // Collect open action items across all meets
    const openActions: Array<{ task: string; assignee: string; deadline: string; meetId: string; meetName: string; meetDate: string; idx: number }> = []
    meets.forEach(m => {
      parseActions(m.actions || '').forEach((a, idx) => {
        if (!a.done) openActions.push({ ...a, meetId: m.id, meetName: m.name, meetDate: m.date, idx })
      })
    })
    openActions.sort((a, b) => {
      if (!a.deadline && !b.deadline) return 0
      if (!a.deadline) return 1
      if (!b.deadline) return -1
      return a.deadline.localeCompare(b.deadline)
    })

    // Participant frequency
    const freq: Record<string, number> = {}
    meets.forEach(m => {
      (m.participants || '').split(',').map(s => s.trim()).filter(Boolean).forEach(name => {
        freq[name] = (freq[name] || 0) + 1
      })
    })
    const topPeople = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 8)

    const recentMeets = [...meets].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 6)

    return { totalMeets: meets.length, thisMonthMeets, openActions, topPeople, recentMeets }
  }, [meets])

  async function completeAction(meetId: string, idx: number, done: boolean) {
    const m = meets.find(x => x.id === meetId)
    if (!m) return
    const acts = parseActions(m.actions || '')
    if (acts[idx]) acts[idx].done = done
    const serialized = acts.map(a => `- [${a.done ? 'x' : ' '}] ${a.task}|${a.assignee}|${a.deadline}`).join('\n')
    await updateMeet(meetId, { actions: serialized })
    onReload()
  }

  async function setDeadline(meetId: string, idx: number, deadline: string) {
    const m = meets.find(x => x.id === meetId)
    if (!m) return
    const acts = parseActions(m.actions || '')
    if (acts[idx]) acts[idx].deadline = deadline
    const serialized = acts.map(a => `- [${a.done ? 'x' : ' '}] ${a.task}|${a.assignee}|${a.deadline}`).join('\n')
    await updateMeet(meetId, { actions: serialized })
    onReload()
  }

  const monthName = now.toLocaleString('en-GB', { month: 'long' })

  const kpi = [
    { label: 'Total Meets',       value: String(totalMeets),       color: '#00a87a' },
    { label: `This month`,        value: String(thisMonthMeets),   color: '#0091c7', sub: monthName },
    { label: 'Open actions',      value: String(openActions.length), color: openActions.length > 0 ? '#e0457a' : '#00a87a' },
    { label: 'People in DB',      value: String(people.length),    color: '#6b46a8' },
  ]

  const TYPE_COLORS: Record<string, string> = {
    Planning: '#00a87a', Retrospective: '#6b46a8', Standup: '#0091c7',
    Review: '#0091c7', '1:1': '#e0457a', Stakeholder: '#6b46a8', Other: '#7ab8ae',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
        {kpi.map(k => (
          <div key={k.label} className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', letterSpacing: '0.06em', marginBottom: 6 }}>
              {k.label.toUpperCase()}
              {k.sub && <span style={{ fontWeight: 400 }}> — {k.sub}</span>}
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: k.color }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16, alignItems: 'start' }}>

        {/* Open action items */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
            Open Action Items
          </div>
          <div style={{ padding: '12px 16px', maxHeight: 400, overflowY: 'auto' }}>
            {openActions.length === 0 ? (
              <div style={{ fontSize: '0.8rem', color: 'var(--text-dim)', padding: '8px 4px' }}>✅ No open action items!</div>
            ) : (
              openActions.map((a, i) => {
                const isOverdue = a.deadline && new Date(a.deadline + 'T23:59') < now
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      padding: '10px 8px',
                      borderBottom: i < openActions.length - 1 ? '1px solid var(--card-border)' : 'none',
                      background: isOverdue ? 'rgba(224,69,122,0.04)' : 'transparent',
                      borderRadius: isOverdue ? 8 : 0,
                    }}
                  >
                    <input
                      type="checkbox"
                      onChange={e => completeAction(a.meetId, a.idx, e.target.checked)}
                      style={{ flexShrink: 0, marginTop: 3, width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '0.82rem', color: 'var(--text)', fontWeight: 500 }}>
                        {a.task}
                        {isOverdue && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#e0457a', background: 'rgba(224,69,122,0.12)', padding: '1px 5px', borderRadius: 4, marginLeft: 6 }}>OVERDUE</span>}
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>
                        {a.assignee && <strong>{a.assignee} · </strong>}
                        <span
                          onClick={() => { const m = meets.find(x => x.id === a.meetId); if (m) onOpenMeet(m) }}
                          style={{ cursor: 'pointer', textDecoration: 'underline', color: 'var(--primary)' }}
                        >
                          {a.meetName}
                        </span>
                        {a.meetDate && ` · ${new Date(a.meetDate + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}`}
                      </div>
                    </div>
                    <input
                      type="date"
                      defaultValue={a.deadline}
                      onChange={e => setDeadline(a.meetId, a.idx, e.target.value)}
                      title="Deadline"
                      style={{ fontSize: '0.72rem', borderRadius: 7, border: '1px solid var(--card-border)', padding: '3px 6px', color: 'var(--text)', background: 'white', cursor: 'pointer', flexShrink: 0 }}
                    />
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Right column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Top participants */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 14 }}>
              TOP PARTICIPANTS
            </div>
            {topPeople.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>No data yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {topPeople.map(([name, count]) => {
                  const person = people.find(p => p.name === name)
                  const pct    = Math.round((count / topPeople[0][1]) * 100)
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 32, height: 32, borderRadius: '50%',
                        background: person?.photo ? 'transparent' : 'rgba(0,168,122,0.15)',
                        color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.65rem', fontWeight: 700, flexShrink: 0, overflow: 'hidden',
                      }}>
                        {person?.photo
                          ? <img src={person.photo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                          : initials(name)
                        }
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                        <div style={{ height: 4, background: 'rgba(0,168,122,0.12)', borderRadius: 2, marginTop: 4 }}>
                          <div style={{ height: '100%', width: `${pct}%`, background: 'var(--primary)', borderRadius: 2, transition: 'width 0.5s' }} />
                        </div>
                      </div>
                      <div style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--primary)', flexShrink: 0 }}>{count}×</div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Recent meets */}
          <div className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 14 }}>
              RECENT MEETS
            </div>
            {recentMeets.length === 0 ? (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>No meets yet.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentMeets.map(m => {
                  const color = TYPE_COLORS[m.type] || '#7ab8ae'
                  const d = m.date ? new Date(m.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) : ''
                  return (
                    <div
                      key={m.id}
                      onClick={() => onOpenMeet(m)}
                      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', padding: '6px 0', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                    >
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {m.name || 'Unnamed meet'}
                        </div>
                        <div style={{ fontSize: '0.67rem', color: 'var(--text-dim)', marginTop: 1 }}>
                          {d}{m.tribe ? ` · ${m.tribe}` : ''}
                        </div>
                      </div>
                      <span style={{ fontSize: '0.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: `${color}18`, color, flexShrink: 0 }}>
                        {m.type}
                      </span>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
