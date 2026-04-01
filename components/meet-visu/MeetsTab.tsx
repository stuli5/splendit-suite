'use client'

import { useState, useEffect } from 'react'
import { deleteMeet, parseActions, updateMeet, initials } from '@/lib/meet-visu'
import type { Meet, Person, Tribe } from '@/lib/types'
import { authFetch } from '@/lib/auth-fetch'
import MeetModal from './MeetModal'

const TYPE_COLORS: Record<string, string> = {
  Planning:      '#00a87a',
  Retrospective: '#6b46a8',
  Standup:       '#0091c7',
  Review:        '#0091c7',
  '1:1':         '#e0457a',
  Stakeholder:   '#6b46a8',
  Other:         '#7ab8ae',
}

interface Props {
  meets:          Meet[]
  people:         Person[]
  tribes:         Tribe[]
  pendingMeet?:   Meet | null
  onClearPending?: () => void
  onReload:       () => void
}

export default function MeetsTab({ meets, people, tribes, pendingMeet, onClearPending, onReload }: Props) {
  const [search,      setSearch]      = useState('')
  const [tribeFilter, setTribeFilter] = useState('')
  const [detail,      setDetail]      = useState<Meet | null>(pendingMeet ?? null)
  const [editing,     setEditing]     = useState<Meet | undefined>()
  const [showModal,   setShowModal]   = useState(false)

  useEffect(() => {
    if (pendingMeet) { setDetail(pendingMeet); onClearPending?.() }
  }, [pendingMeet])

  const filtered = meets.filter(m => {
    const q = search.toLowerCase()
    const matchSearch = !q ||
      m.name?.toLowerCase().includes(q) ||
      m.participants?.toLowerCase().includes(q) ||
      m.tribe?.toLowerCase().includes(q)
    const matchTribe = !tribeFilter || m.tribe === tribeFilter
    return matchSearch && matchTribe
  })

  const allTribes = [...new Set(meets.map(m => m.tribe).filter(Boolean))]

  async function handleDelete(m: Meet) {
    if (!confirm(`Delete meet "${m.name}"?`)) return
    await deleteMeet(m.id)
    if (detail?.id === m.id) setDetail(null)
    onReload()
  }

  async function toggleAction(meet: Meet, idx: number, done: boolean) {
    const acts = parseActions(meet.actions || '')
    if (acts[idx]) acts[idx].done = done
    const serialized = acts.map(a => `- [${a.done ? 'x' : ' '}] ${a.task}|${a.assignee}|${a.deadline}`).join('\n')
    await updateMeet(meet.id, { actions: serialized })
    onReload()
    if (detail?.id === meet.id) {
      setDetail(prev => prev ? { ...prev, actions: serialized } : null)
    }
  }

  if (detail) {
    return <MeetDetail
      meet={detail}
      people={people}
      tribes={tribes}
      onBack={() => setDetail(null)}
      onEdit={() => { setEditing(detail); setShowModal(true) }}
      onDelete={() => handleDelete(detail)}
      onToggleAction={toggleAction}
      onReload={() => {
        onReload()
        // find updated meet
      }}
    />
  }

  return (
    <div>
      {/* Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search meets..."
          style={{
            flex: 1, minWidth: 200, padding: '9px 14px', borderRadius: 9,
            border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(255,255,255,0.8)',
            fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text)', outline: 'none',
          }}
        />
        <select
          value={tribeFilter}
          onChange={e => setTribeFilter(e.target.value)}
          style={{
            padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(0,168,122,0.2)',
            background: 'rgba(255,255,255,0.8)', fontSize: '0.82rem',
            color: 'var(--text)', outline: 'none', cursor: 'pointer',
          }}
        >
          <option value="">All tribes</option>
          {allTribes.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <button
          onClick={() => { setEditing(undefined); setShowModal(true) }}
          style={{
            padding: '9px 20px', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap',
          }}
        >
          + New Meet
        </button>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          {meets.length === 0 ? 'No meets yet. Create the first one.' : 'No meets match the filter.'}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
          {filtered.map(m => {
            const actions  = parseActions(m.actions || '')
            const open     = actions.filter(a => !a.done).length
            const total    = actions.length
            const dateStr  = m.date ? new Date(m.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : ''
            const pList    = m.participants ? m.participants.split(',').map(s => s.trim()).filter(Boolean) : []
            const color    = TYPE_COLORS[m.type] || '#7ab8ae'

            return (
              <div
                key={m.id}
                className="glass-card"
                onClick={() => setDetail(m)}
                style={{ padding: '18px 20px', cursor: 'pointer', transition: 'transform 0.15s', userSelect: 'none' }}
                onMouseEnter={e => (e.currentTarget.style.transform = 'translateY(-2px)')}
                onMouseLeave={e => (e.currentTarget.style.transform = 'translateY(0)')}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 10 }}>
                  <div style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text)', lineHeight: 1.3, flex: 1 }}>
                    {m.name || 'Unnamed meet'}
                  </div>
                  <span style={{
                    fontSize: '0.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                    background: `${color}18`, color, whiteSpace: 'nowrap', flexShrink: 0,
                  }}>
                    {m.type}
                  </span>
                </div>

                {/* Meta */}
                <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginBottom: 10, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {dateStr && <span>📅 {dateStr}</span>}
                  {m.tribe && <span>🏷 {m.tribe}</span>}
                </div>

                {/* Participants */}
                {pList.length > 0 && (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 10 }}>
                    {pList.slice(0, 5).map(name => {
                      const person = people.find(p => p.name === name)
                      return (
                        <div key={name} title={name} style={{
                          width: 26, height: 26, borderRadius: '50%',
                          background: person?.photo ? 'transparent' : 'rgba(0,168,122,0.15)',
                          color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '0.6rem', fontWeight: 700, overflow: 'hidden',
                          border: '1.5px solid rgba(255,255,255,0.6)',
                        }}>
                          {person?.photo
                            ? <img src={person.photo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                            : initials(name)
                          }
                        </div>
                      )
                    })}
                    {pList.length > 5 && (
                      <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'rgba(0,0,0,0.06)', color: 'var(--text-dim)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', fontWeight: 600 }}>
                        +{pList.length - 5}
                      </div>
                    )}
                  </div>
                )}

                {/* Action items */}
                {total > 0 && (
                  <div style={{ fontSize: '0.72rem', color: open > 0 ? '#e0457a' : '#00a87a', fontWeight: 600 }}>
                    {open > 0 ? `⚡ ${open} open action${open > 1 ? 's' : ''}` : '✅ All done'}
                    <span style={{ color: 'var(--text-dim)', fontWeight: 400 }}> / {total} total</span>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showModal && (
        <MeetModal
          meet={editing}
          people={people}
          tribes={tribes}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onReload() }}
        />
      )}
    </div>
  )
}

// ─── Meet Detail ──────────────────────────────────────────────────────────────

interface DetailProps {
  meet:           Meet
  people:         Person[]
  tribes:         Tribe[]
  onBack:         () => void
  onEdit:         () => void
  onDelete:       () => void
  onToggleAction: (meet: Meet, idx: number, done: boolean) => void
  onReload:       () => void
}

function MeetDetail({ meet, people, tribes, onBack, onEdit, onDelete, onToggleAction, onReload }: DetailProps) {
  const [editing,    setEditing]    = useState(false)
  const [summarizing, setSummarizing] = useState(false)
  const [aiSummary,  setAiSummary]  = useState<{
    summary: string
    keyDecisions: string[]
    actionItems: { task: string; assignee: string; deadline: string }[]
    sentiment: string
    nextSteps: string
  } | null>(null)

  async function handleAiSummary() {
    if (!meet.transcript?.trim()) return alert('Add a transcript first.')
    setSummarizing(true)
    const res  = await authFetch('/api/ai/meeting-summary', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: meet.transcript, agenda: meet.agenda, meetName: meet.name }),
    })
    const json = await res.json()
    if (json.summary) setAiSummary(json)
    setSummarizing(false)
  }

  const actions  = parseActions(meet.actions || '')
  const pList    = meet.participants ? meet.participants.split(',').map(s => s.trim()).filter(Boolean) : []
  const dateStr  = meet.date ? new Date(meet.date + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : ''
  const color    = TYPE_COLORS[meet.type] || '#7ab8ae'

  return (
    <div>
      {/* Back */}
      <button
        onClick={onBack}
        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, marginBottom: 16, padding: 0 }}
      >
        ← Back to Meets
      </button>

      {/* Header card */}
      <div className="glass-card" style={{ padding: '24px 28px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.4rem', color: 'var(--text)', margin: 0 }}>
                {meet.name || 'Unnamed meet'}
              </h2>
              <span style={{ fontSize: '0.72rem', fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: `${color}18`, color }}>
                {meet.type}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', display: 'flex', gap: 16, flexWrap: 'wrap' }}>
              {dateStr && <span>📅 {dateStr}</span>}
              {meet.tribe && <span>🏷 {meet.tribe}</span>}
              {pList.length > 0 && <span>👥 {pList.length} participants</span>}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0, flexWrap: 'wrap' }}>
            <button
              onClick={handleAiSummary}
              disabled={summarizing}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: summarizing ? 'rgba(107,70,168,0.15)' : 'rgba(107,70,168,0.12)', color: '#6b46a8', fontSize: '0.78rem', fontWeight: 700, cursor: summarizing ? 'not-allowed' : 'pointer' }}
            >
              {summarizing ? '✨ Summarizing...' : '✨ AI Summary'}
            </button>
            <button onClick={() => setEditing(true)} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(0,168,122,0.3)', background: 'rgba(0,168,122,0.06)', color: 'var(--primary)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Edit
            </button>
            <button onClick={onDelete} style={{ padding: '7px 16px', borderRadius: 8, border: '1px solid rgba(224,69,122,0.3)', background: 'rgba(224,69,122,0.06)', color: '#e0457a', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer' }}>
              Delete
            </button>
          </div>
        </div>
      </div>

      {/* AI Summary panel */}
      {aiSummary && (
        <div style={{ background: 'rgba(107,70,168,0.06)', border: '1.5px solid rgba(107,70,168,0.2)', borderRadius: 12, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: '#6b46a8' }}>✨ AI Summary</span>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '2px 10px', borderRadius: 20,
                background: aiSummary.sentiment === 'Positive' ? '#00a87a18' : aiSummary.sentiment === 'Negative' ? '#e0457a18' : '#f59e0b18',
                color: aiSummary.sentiment === 'Positive' ? '#00a87a' : aiSummary.sentiment === 'Negative' ? '#e0457a' : '#f59e0b',
              }}>
                {aiSummary.sentiment}
              </span>
              <button onClick={() => setAiSummary(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.8rem' }}>✕</button>
            </div>
          </div>
          <p style={{ fontSize: '0.82rem', color: 'var(--text)', marginBottom: 12, lineHeight: 1.6 }}>{aiSummary.summary}</p>
          {aiSummary.keyDecisions.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b46a8', letterSpacing: '0.05em', marginBottom: 6 }}>KEY DECISIONS</div>
              {aiSummary.keyDecisions.map((d, i) => (
                <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text)', marginBottom: 3 }}>• {d}</div>
              ))}
            </div>
          )}
          {aiSummary.actionItems.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#6b46a8', letterSpacing: '0.05em', marginBottom: 6 }}>AI ACTION ITEMS</div>
              {aiSummary.actionItems.map((a, i) => (
                <div key={i} style={{ fontSize: '0.78rem', color: 'var(--text)', marginBottom: 3 }}>
                  • {a.task} <span style={{ color: 'var(--text-dim)' }}>— {a.assignee}{a.deadline !== 'TBD' ? ` · ${a.deadline}` : ''}</span>
                </div>
              ))}
            </div>
          )}
          <div style={{ fontSize: '0.78rem', color: '#6b46a8', fontWeight: 600 }}>→ {aiSummary.nextSteps}</div>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 16, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Participants */}
          {pList.length > 0 && (
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              <div style={sectionLabel}>PARTICIPANTS</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
                {pList.map(name => {
                  const person = people.find(p => p.name === name)
                  return (
                    <div key={name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: person?.photo ? 'transparent' : 'rgba(0,168,122,0.15)',
                        color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.7rem', fontWeight: 700, overflow: 'hidden', flexShrink: 0,
                      }}>
                        {person?.photo
                          ? <img src={person.photo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                          : initials(name)
                        }
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{name}</div>
                        {person && <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{[person.role, person.tribe].filter(Boolean).join(' · ')}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* Agenda */}
          {meet.agenda && (
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              <div style={sectionLabel}>AGENDA</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{meet.agenda}</div>
            </div>
          )}

          {/* Transcript */}
          {meet.transcript && (
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              <div style={sectionLabel}>TRANSCRIPT / SUMMARY</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{meet.transcript}</div>
            </div>
          )}

          {/* Notes */}
          {meet.notes && (
            <div className="glass-card" style={{ padding: '20px 24px' }}>
              <div style={sectionLabel}>NOTES</div>
              <div style={{ fontSize: '0.82rem', color: 'var(--text)', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{meet.notes}</div>
            </div>
          )}
        </div>

        {/* Action items sidebar */}
        <div className="glass-card" style={{ padding: '20px 24px' }}>
          <div style={sectionLabel}>ACTION ITEMS ({actions.filter(a => !a.done).length} open)</div>
          {actions.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>No action items.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {actions.map((a, i) => {
                const isOverdue = a.deadline && !a.done && new Date(a.deadline + 'T23:59') < new Date()
                return (
                  <div
                    key={i}
                    style={{
                      display: 'flex', gap: 8, alignItems: 'flex-start',
                      background: isOverdue ? 'rgba(224,69,122,0.05)' : 'transparent',
                      borderRadius: 8, padding: isOverdue ? '6px 8px' : '0',
                      border: isOverdue ? '1px solid rgba(224,69,122,0.15)' : 'none',
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={a.done}
                      onChange={e => onToggleAction(meet, i, e.target.checked)}
                      style={{ flexShrink: 0, marginTop: 2, width: 15, height: 15, accentColor: 'var(--primary)', cursor: 'pointer' }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{
                        fontSize: '0.8rem', fontWeight: 500,
                        color: a.done ? 'var(--text-dim)' : 'var(--text)',
                        textDecoration: a.done ? 'line-through' : 'none',
                        lineHeight: 1.4,
                      }}>
                        {a.task}
                        {isOverdue && <span style={{ fontSize: '0.62rem', fontWeight: 700, color: '#e0457a', background: 'rgba(224,69,122,0.12)', padding: '1px 5px', borderRadius: 4, marginLeft: 6 }}>OVERDUE</span>}
                      </div>
                      {(a.assignee || a.deadline) && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginTop: 2 }}>
                          {a.assignee && <strong>{a.assignee}</strong>}
                          {a.assignee && a.deadline && ' · '}
                          {a.deadline && new Date(a.deadline + 'T00:00').toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {editing && (
        <MeetModal
          meet={meet}
          people={people}
          tribes={tribes}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); onReload() }}
        />
      )}
    </div>
  )
}

const sectionLabel: React.CSSProperties = {
  fontSize: '0.65rem', color: 'var(--text-dim)', fontWeight: 700,
  letterSpacing: '0.08em', marginBottom: 12,
}
