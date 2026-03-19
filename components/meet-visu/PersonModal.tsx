'use client'

import { useState, useEffect, useRef } from 'react'
import { createPerson, updatePerson, initials } from '@/lib/meet-visu'
import { getCompanies } from '@/lib/companies'
import type { Person, Tribe } from '@/lib/types'

interface Props {
  person?:  Person
  people:   Person[]   // existing people for supervisor autocomplete
  tribes:   Tribe[]
  onClose:  () => void
  onSaved:  () => void
}

const LEVELS = ['', 'Junior', 'Mid', 'Senior', 'Lead', 'Tribe Lead', 'Manager', 'Director', 'C-Level']

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(240,250,248,0.8)',
  fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
}

export default function PersonModal({ person, people, tribes, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name:       person?.name       ?? '',
    role:       person?.role       ?? '',
    tribe:      person?.tribe      ?? '',
    company:    person?.company    ?? '',
    level:      person?.level      ?? '',
    supervisor: person?.supervisor ?? '',
    email:      person?.email      ?? '',
    phone:      person?.phone      ?? '',
    photo:      person?.photo      ?? '',
  })
  const [saving, setSaving] = useState(false)

  // Company autocomplete
  const [companyQuery,    setCompanyQuery]    = useState(person?.company ?? '')
  const [companySuggestions, setCS]           = useState<string[]>([])
  const [companyAcOpen,   setCompanyAcOpen]   = useState(false)
  const companyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getCompanies().then(list => setCS(list.map(c => c.name)))
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (companyRef.current && !companyRef.current.contains(e.target as Node)) setCompanyAcOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const companyMatches = companyQuery.trim().length > 0
    ? companySuggestions.filter(c => c.toLowerCase().includes(companyQuery.toLowerCase())).slice(0, 5)
    : []

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 800000) { alert('Photo is too large (max 800KB)'); return }
    const reader = new FileReader()
    reader.onload = ev => set('photo', ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    if (person) {
      await updatePerson(person.id, form)
    } else {
      await createPerson(form)
    }
    onSaved()
  }

  // Supervisors = all other people
  const supervisorOptions = people.filter(p => p.id !== person?.id)

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,46,42,0.5)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: '100%', maxWidth: 520, padding: '32px 28px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', marginBottom: 24 }}>
          {person ? 'Edit Person' : 'Add Person'}
        </div>

        {/* Photo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
          <div style={{
            width: 68, height: 68, borderRadius: '50%', flexShrink: 0,
            background: form.photo ? 'transparent' : 'rgba(0,168,122,0.12)',
            color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: '1.2rem', overflow: 'hidden',
            border: '2px solid rgba(0,168,122,0.2)',
          }}>
            {form.photo
              ? <img src={form.photo} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" />
              : <span style={{ fontSize: '1.6rem' }}>👤</span>
            }
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <label htmlFor="photo-input" style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: '0.8rem', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}>
              <span>📷</span> {form.photo ? 'Change photo' : 'Select photo'}
            </label>
            <input id="photo-input" type="file" accept="image/*" onChange={handlePhotoChange} style={{ display: 'none' }} />
            {form.photo && (
              <button type="button" onClick={() => set('photo', '')} style={{ fontSize: '0.75rem', color: '#e0457a', background: 'none', border: 'none', cursor: 'pointer', textAlign: 'left', padding: 0, display: 'flex', alignItems: 'center', gap: 4, fontWeight: 600 }}>
                ✕ Remove photo
              </button>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

          {/* Name */}
          <Field label="FULL NAME">
            <input value={form.name} onChange={e => set('name', e.target.value)} required style={inp} placeholder="Ján Novák" />
          </Field>

          {/* Role + Level */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="POSITION / ROLE">
              <input value={form.role} onChange={e => set('role', e.target.value)} style={inp} placeholder="Backend Developer" />
            </Field>
            <Field label="LEVEL">
              <select value={form.level} onChange={e => set('level', e.target.value)} style={inp}>
                {LEVELS.map(l => <option key={l} value={l}>{l || '— no level —'}</option>)}
              </select>
            </Field>
          </div>

          {/* Company autocomplete */}
          <Field label="COMPANY">
            <div ref={companyRef} style={{ position: 'relative' }}>
              <input
                value={companyQuery}
                onChange={e => { setCompanyQuery(e.target.value); set('company', e.target.value); setCompanyAcOpen(true) }}
                onFocus={() => setCompanyAcOpen(true)}
                style={inp}
                placeholder="T-Mobile CZ, Slovak Telekom, SplendIT..."
              />
              {companyAcOpen && companyMatches.length > 0 && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
                  background: 'white', border: '1px solid rgba(0,168,122,0.2)',
                  borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden',
                }}>
                  {companyMatches.map(name => (
                    <div
                      key={name}
                      onMouseDown={() => { setCompanyQuery(name); set('company', name); setCompanyAcOpen(false) }}
                      style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                    >
                      {name}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {/* Tribe */}
          <Field label="TRIBE">
            <select value={form.tribe} onChange={e => set('tribe', e.target.value)} style={inp}>
              <option value="">— no tribe —</option>
              {tribes.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </select>
          </Field>

          {/* Supervisor */}
          <Field label="MANAGER / SUPERVISOR">
            <select value={form.supervisor} onChange={e => set('supervisor', e.target.value)} style={inp}>
              <option value="">— no supervisor —</option>
              {supervisorOptions.map(p => (
                <option key={p.id} value={p.name}>{p.name}{p.role ? ` · ${p.role}` : ''}</option>
              ))}
            </select>
          </Field>

          {/* Email + Phone */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="EMAIL">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inp} placeholder="jan.novak@firma.sk" />
            </Field>
            <Field label="PHONE">
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} placeholder="+421 900 000 000" />
            </Field>
          </div>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: 11, borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving...' : person ? 'Save Changes' : 'Add Person'}
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

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: 5, letterSpacing: '0.06em' }}>
        {label}
      </label>
      {children}
    </div>
  )
}
