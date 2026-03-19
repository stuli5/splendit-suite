'use client'

import { useState } from 'react'
import { deletePerson, createTribe, deleteTribe, initials } from '@/lib/meet-visu'
import type { Person, Tribe } from '@/lib/types'
import PersonModal from './PersonModal'

const TRIBE_COLORS = ['#00a87a', '#0091c7', '#6b46a8', '#e0457a', '#f59e0b', '#10b981', '#7ab8ae', '#ec4899']

interface Props {
  people:  Person[]
  tribes:  Tribe[]
  onReload: () => void
}

export default function PeopleTab({ people, tribes, onReload }: Props) {
  const [search,     setSearch]     = useState('')
  const [tribeFilter, setTribeFilter] = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState<Person | undefined>()
  const [newTribe,   setNewTribe]   = useState('')
  const [tribeColor, setTribeColor] = useState(TRIBE_COLORS[0])

  const filtered = people.filter(p => {
    const q = search.toLowerCase()
    const matchSearch = !q || p.name?.toLowerCase().includes(q) || p.role?.toLowerCase().includes(q) || p.company?.toLowerCase().includes(q)
    const matchTribe = !tribeFilter || p.tribe === tribeFilter
    return matchSearch && matchTribe
  })

  async function handleDeletePerson(p: Person) {
    if (!confirm(`Delete person "${p.name}"?`)) return
    await deletePerson(p.id)
    onReload()
  }

  async function handleAddTribe() {
    const name = newTribe.trim()
    if (!name) return
    await createTribe(name, tribeColor)
    setNewTribe('')
    setTribeColor(TRIBE_COLORS[(tribes.length + 1) % TRIBE_COLORS.length])
    onReload()
  }

  async function handleDeleteTribe(t: Tribe) {
    if (!confirm(`Delete tribe "${t.name}"?`)) return
    await deleteTribe(t.id)
    onReload()
  }

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 280px', gap: 20, alignItems: 'start' }}>

      {/* People list */}
      <div>
        {/* Toolbar */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search people..."
            style={{
              flex: 1, minWidth: 180, padding: '9px 14px', borderRadius: 9,
              border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(255,255,255,0.8)',
              fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
              color: 'var(--text)', outline: 'none',
            }}
          />
          <select
            value={tribeFilter}
            onChange={e => setTribeFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: 9, border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(255,255,255,0.8)', fontSize: '0.82rem', color: 'var(--text)', outline: 'none', cursor: 'pointer' }}
          >
            <option value="">All tribes</option>
            {tribes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
          </select>
          <button
            onClick={() => { setEditing(undefined); setShowModal(true) }}
            style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', whiteSpace: 'nowrap' }}
          >
            + Add Person
          </button>
        </div>

        {/* Grid */}
        {filtered.length === 0 ? (
          <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            {people.length === 0 ? 'No people yet. Add the first one.' : 'No people match the filter.'}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
            {filtered.map(p => (
              <div key={p.id} className="glass-card" style={{ padding: '16px 18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                    background: p.photo ? 'transparent' : 'rgba(0,168,122,0.15)',
                    color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '0.8rem', fontWeight: 700, overflow: 'hidden',
                    border: '2px solid rgba(0,168,122,0.2)',
                  }}>
                    {p.photo
                      ? <img src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                      : initials(p.name)
                    }
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</div>
                    {p.role && <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 1 }}>{p.role}</div>}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 3, marginBottom: 12 }}>
                  <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                    {p.tribe && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: 'var(--primary)', background: 'rgba(0,168,122,0.1)', padding: '2px 8px', borderRadius: 10 }}>{p.tribe}</span>
                    )}
                    {p.level && (
                      <span style={{ fontSize: '0.68rem', fontWeight: 600, color: '#6b46a8', background: 'rgba(107,70,168,0.1)', padding: '2px 8px', borderRadius: 10 }}>{p.level}</span>
                    )}
                  </div>
                  {p.company && <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 2 }}>🏢 {p.company}</div>}
                  {p.supervisor && <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>👤 {p.supervisor}</div>}
                  {p.email && <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>✉ {p.email}</div>}
                  {p.phone && <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>📞 {p.phone}</div>}
                </div>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button onClick={() => { setEditing(p); setShowModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, padding: 0 }}>
                    Edit
                  </button>
                  <button onClick={() => handleDeletePerson(p)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#e0457a', fontWeight: 600, padding: 0 }}>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tribes sidebar */}
      <div>
        <div className="glass-card" style={{ padding: '20px' }}>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', fontWeight: 700, letterSpacing: '0.06em', marginBottom: 14 }}>
            TRIBES / GROUPS
          </div>

          {/* Add tribe */}
          <div style={{ marginBottom: 16 }}>
            <input
              value={newTribe}
              onChange={e => setNewTribe(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAddTribe()}
              placeholder="New tribe name..."
              style={{ width: '100%', padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(240,250,248,0.8)', fontSize: '0.8rem', color: 'var(--text)', outline: 'none', marginBottom: 8, boxSizing: 'border-box' }}
            />
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
              {TRIBE_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setTribeColor(c)}
                  style={{ width: 20, height: 20, borderRadius: '50%', background: c, cursor: 'pointer', border: tribeColor === c ? '3px solid rgba(0,0,0,0.3)' : '2px solid rgba(255,255,255,0.5)', transition: 'transform 0.1s', transform: tribeColor === c ? 'scale(1.2)' : 'scale(1)' }}
                />
              ))}
            </div>
            <button
              onClick={handleAddTribe}
              disabled={!newTribe.trim()}
              style={{ width: '100%', padding: '8px', borderRadius: 8, border: 'none', background: 'linear-gradient(135deg, var(--primary), var(--secondary))', color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', cursor: newTribe.trim() ? 'pointer' : 'not-allowed', opacity: newTribe.trim() ? 1 : 0.5 }}
            >
              Add Tribe
            </button>
          </div>

          {/* Tribe list */}
          {tribes.length === 0 ? (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>No tribes yet.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {tribes.map(t => {
                const count = people.filter(p => p.tribe === t.name).length
                return (
                  <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, background: 'rgba(0,0,0,0.02)', border: '1px solid var(--card-border)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: t.color, flexShrink: 0 }} />
                    <span style={{ flex: 1, fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{t.name}</span>
                    <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>{count} people</span>
                    <button onClick={() => handleDeleteTribe(t)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#e0457a', fontSize: '0.8rem', padding: 0, lineHeight: 1 }}>✕</button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <PersonModal
          person={editing}
          people={people}
          tribes={tribes}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); onReload() }}
        />
      )}
    </div>
  )
}
