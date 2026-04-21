'use client'

import { useState, useEffect, useRef } from 'react'
import { createMeet, updateMeet, parseActions, serializeActions, initials } from '@/lib/meet-visu'
import { getTeamMembers } from '@/lib/team'
import { createNotification } from '@/lib/notifications'
import { useAuth } from '@/lib/auth-context'
import type { Meet, Person, Tribe, MeetType, ActionItem, TeamMember } from '@/lib/types'

const MEET_TYPES: MeetType[] = ['Planning', 'Retrospective', 'Standup', 'Review', '1:1', 'Stakeholder', 'Other']

interface Props {
  meet?:    Meet
  people:   Person[]
  tribes:   Tribe[]
  onClose:  () => void
  onSaved:  () => void
}

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(240,250,248,0.8)',
  fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
}

export default function MeetModal({ meet, people, tribes, onClose, onSaved }: Props) {
  const { user } = useAuth()
  const today = new Date().toISOString().slice(0, 10)
  const [form, setForm] = useState({
    name:         meet?.name         ?? '',
    date:         meet?.date         ?? today,
    type:         (meet?.type        ?? 'Planning') as MeetType,
    tribe:        meet?.tribe        ?? '',
    agenda:       meet?.agenda       ?? '',
    transcript:   meet?.transcript   ?? '',
    notes:        meet?.notes        ?? '',
  })
  const [participants, setParticipants] = useState<{ name: string; tribe: string; role: string }[]>(() => {
    if (!meet?.participants) return []
    return meet.participants.split(',').map(s => s.trim()).filter(Boolean).map(name => {
      const p = people.find(x => x.name === name)
      return { name, tribe: p?.tribe ?? '', role: p?.role ?? '' }
    })
  })
  const [actions, setActions]     = useState<ActionItem[]>(() => parseActions(meet?.actions ?? ''))
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([])
  const [saving, setSaving]       = useState(false)
  const [acQuery, setAcQuery]     = useState('')
  const [acOpen, setAcOpen]       = useState(false)
  const acRef = useRef<HTMLDivElement>(null)

  const acMatches = acQuery.trim().length > 0
    ? people.filter(p =>
        p.name.toLowerCase().includes(acQuery.toLowerCase()) &&
        !participants.find(x => x.name === p.name)
      ).slice(0, 6)
    : []

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (acRef.current && !acRef.current.contains(e.target as Node)) setAcOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    getTeamMembers().then(setTeamMembers).catch(() => {})
  }, [])

  function addParticipant(p: Person) {
    setParticipants(prev => [...prev, { name: p.name, tribe: p.tribe, role: p.role }])
    setAcQuery('')
    setAcOpen(false)
    // auto-set tribe if blank
    if (!form.tribe && p.tribe) setForm(f => ({ ...f, tribe: p.tribe }))
  }

  function removeParticipant(name: string) {
    setParticipants(prev => prev.filter(p => p.name !== name))
  }

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function addAction() {
    setActions(prev => [...prev, { done: false, task: '', assignee: '', deadline: '' }])
  }

  function updateAction(i: number, key: keyof ActionItem, value: string | boolean) {
    setActions(prev => prev.map((a, idx) => idx === i ? { ...a, [key]: value } : a))
  }

  function removeAction(i: number) {
    setActions(prev => prev.filter((_, idx) => idx !== i))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const data = {
      ...form,
      participants: participants.map(p => p.name).join(', '),
      actions:      serializeActions(actions),
    }
    let savedId: string
    if (meet) {
      await updateMeet(meet.id, data)
      savedId = meet.id
    } else {
      savedId = await createMeet(data)
    }

    // notify newly assigned team members
    if (user) {
      const oldAssignees = new Set(
        parseActions(meet?.actions ?? '').map(a => a.assignee).filter(Boolean)
      )
      const newlyAssigned = actions.filter(a =>
        a.assignee && !oldAssignees.has(a.assignee)
      )
      const actorName = user.displayName ?? user.email ?? 'Someone'
      await Promise.all(
        newlyAssigned.map(a => {
          const member = teamMembers.find(m => m.displayName === a.assignee)
          if (!member || member.uid === user.uid) return Promise.resolve()
          return createNotification({
            userId:     member.uid,
            title:      'New action item assigned',
            body:       `${actorName} assigned you: "${a.task}" in ${form.name}${a.deadline ? ` — deadline ${a.deadline}` : ''}`,
            entityType: 'meet',
            entityId:   savedId,
            type:       'info',
            actorUid:   user.uid,
          })
        })
      )
    }

    onSaved()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,46,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: '100%', maxWidth: 620, padding: '32px 28px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', marginBottom: 24 }}>
          {meet ? 'Edit Meet' : 'New Meet'}
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Name */}
          <div>
            <label style={labelStyle}>MEET NAME</label>
            <input value={form.name} onChange={e => set('name', e.target.value)} required style={inp} placeholder="Meet - Jan Novak" />
          </div>

          {/* Date + Type */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <div>
              <label style={labelStyle}>DATE</label>
              <input type="date" value={form.date} onChange={e => set('date', e.target.value)} style={inp} />
            </div>
            <div>
              <label style={labelStyle}>TYPE</label>
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inp}>
                {MEET_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
          </div>

          {/* Tribe */}
          <div>
            <label style={labelStyle}>TRIBE / GROUP</label>
            <select value={form.tribe} onChange={e => set('tribe', e.target.value)} style={inp}>
              <option value="">— no tribe —</option>
              {tribes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </div>

          {/* Participants autocomplete */}
          <div>
            <label style={labelStyle}>PARTICIPANTS</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: participants.length ? 8 : 0 }}>
              {participants.map(p => (
                <div key={p.name} style={{
                  display: 'flex', alignItems: 'center', gap: 4,
                  background: 'rgba(0,168,122,0.1)', borderRadius: 20,
                  padding: '3px 10px 3px 4px', fontSize: '0.78rem', color: 'var(--text)',
                }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    background: 'var(--primary)', color: 'white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.58rem', fontWeight: 700, flexShrink: 0,
                  }}>
                    {initials(p.name)}
                  </div>
                  <span style={{ fontWeight: 600 }}>{p.name}</span>
                  {p.tribe && <span style={{ opacity: 0.5, fontSize: '0.7rem' }}>· {p.tribe}</span>}
                  <button type="button" onMouseDown={() => removeParticipant(p.name)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.8rem', padding: '0 0 0 2px', lineHeight: 1 }}>✕</button>
                </div>
              ))}
            </div>
            <div ref={acRef} style={{ position: 'relative' }}>
              <input
                value={acQuery}
                onChange={e => { setAcQuery(e.target.value); setAcOpen(true) }}
                onFocus={() => setAcOpen(true)}
                placeholder="Search people..."
                style={inp}
              />
              {acOpen && acMatches.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
                  background: 'white', border: '1px solid rgba(0,168,122,0.2)',
                  borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden',
                }}>
                  {acMatches.map(p => (
                    <div
                      key={p.id}
                      onMouseDown={() => addParticipant(p)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                    >
                      <div style={{ width: 30, height: 30, borderRadius: '50%', background: 'rgba(0,168,122,0.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.65rem', fontWeight: 700, flexShrink: 0 }}>
                        {p.photo ? <img src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" /> : initials(p.name)}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{[p.role, p.tribe, p.company].filter(Boolean).join(' · ')}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Agenda */}
          <div>
            <label style={labelStyle}>AGENDA</label>
            <textarea value={form.agenda} onChange={e => set('agenda', e.target.value)} rows={3} style={{ ...inp, resize: 'vertical' }} placeholder="Meeting agenda..." />
          </div>

          {/* Action Items */}
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <label style={labelStyle}>ACTION ITEMS</label>
              <button type="button" onClick={addAction} style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}>
                + Add item
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {actions.map((a, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <input
                    type="checkbox"
                    checked={a.done}
                    onChange={e => updateAction(i, 'done', e.target.checked)}
                    style={{ flexShrink: 0, width: 16, height: 16, accentColor: 'var(--primary)', cursor: 'pointer' }}
                  />
                  <input
                    value={a.task}
                    onChange={e => updateAction(i, 'task', e.target.value)}
                    placeholder="Task..."
                    style={{ ...inp, flex: 2 }}
                  />
                  <select
                    value={a.assignee}
                    onChange={e => updateAction(i, 'assignee', e.target.value)}
                    style={{ ...inp, flex: 1 }}
                  >
                    <option value="">Assignee</option>
                    {teamMembers.map(m => (
                      <option key={m.uid} value={m.displayName}>{m.displayName}</option>
                    ))}
                  </select>
                  <input
                    type="date"
                    value={a.deadline}
                    onChange={e => updateAction(i, 'deadline', e.target.value)}
                    style={{ ...inp, flex: 1 }}
                  />
                  <button type="button" onClick={() => removeAction(i)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e0457a', fontSize: '0.85rem', flexShrink: 0 }}>✕</button>
                </div>
              ))}
              {actions.length === 0 && (
                <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>No action items. Click "+ Add item".</div>
              )}
            </div>
          </div>

          {/* Transcript + Notes */}
          <div>
            <label style={labelStyle}>TRANSCRIPT / SUMMARY</label>
            <textarea value={form.transcript} onChange={e => set('transcript', e.target.value)} rows={4} style={{ ...inp, resize: 'vertical' }} placeholder="Meeting notes, transcript..." />
          </div>

          <div>
            <label style={labelStyle}>NOTES</label>
            <textarea value={form.notes} onChange={e => set('notes', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Additional notes..." />
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: 11, borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving...' : meet ? 'Save Changes' : 'Create Meet'}
            </button>
            <button type="button" onClick={onClose} style={{
              padding: '11px 18px', borderRadius: 9, border: '1px solid var(--card-border)',
              background: 'white', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)',
            }}>Cancel</button>
          </div>
        </form>
      </div>
    </div>
  )
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600,
  display: 'block', marginBottom: 5, letterSpacing: '0.06em',
}
