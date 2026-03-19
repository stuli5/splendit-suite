'use client'

import { useState } from 'react'
import { lookupIco, createCompany, updateCompany } from '@/lib/companies'
import type { Company, CompanyType, ContactPerson } from '@/lib/types'

interface Props {
  company?: Company
  onClose: () => void
  onSaved: () => void
}

const TYPES: CompanyType[] = ['klient', 'partner', 'dodavatel', 'ostatní']

const emptyContact = (): ContactPerson => ({ name: '', email: '', phone: '', position: '' })

const emptyForm = {
  ico: '', name: '', legalForm: '', street: '', city: '', zip: '',
  email: '', phone: '', web: '', type: 'klient' as CompanyType, note: '',
}

export default function CompanyModal({ company, onClose, onSaved }: Props) {
  const [form, setForm] = useState(company ? {
    ico: company.ico, name: company.name, legalForm: company.legalForm ?? '',
    street: company.street ?? '', city: company.city ?? '', zip: company.zip ?? '',
    email: company.email ?? '', phone: company.phone ?? '', web: company.web ?? '',
    type: company.type, note: company.note ?? '',
  } : { ...emptyForm })

  const [contacts,  setContacts]  = useState<ContactPerson[]>(company?.contacts ?? [])
  const [icoInput,  setIcoInput]  = useState('')
  const [looking,   setLooking]   = useState(false)
  const [aresError, setAresError] = useState('')
  const [saving,    setSaving]    = useState(false)

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  function setContact(i: number, key: keyof ContactPerson, value: string) {
    setContacts(cs => cs.map((c, idx) => idx === i ? { ...c, [key]: value } : c))
  }

  function addContact() {
    setContacts(cs => [...cs, emptyContact()])
  }

  function removeContact(i: number) {
    setContacts(cs => cs.filter((_, idx) => idx !== i))
  }

  async function handleLookup() {
    if (!icoInput.trim()) return
    setLooking(true)
    setAresError('')
    const result = await lookupIco(icoInput)
    if (!result) {
      setAresError('Company ID not found in ARES. Please check the number.')
    } else {
      setForm(f => ({ ...f, ico: result.ico, name: result.name, legalForm: result.legalForm, street: result.street, city: result.city, zip: result.zip }))
      setIcoInput('')
    }
    setLooking(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const data = { ...form, contacts }
    if (company) {
      await updateCompany(company.id, data)
    } else {
      await createCompany(data)
    }
    onSaved()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,46,42,0.4)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: '100%', maxWidth: 560, padding: '32px 28px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', marginBottom: 24 }}>
          {company ? 'Edit Company' : 'Add Company'}
        </div>

        {/* IČO lookup */}
        {!company && (
          <div style={{ marginBottom: 20, padding: 16, background: 'rgba(0,168,122,0.06)', borderRadius: 10 }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, marginBottom: 8, letterSpacing: '0.06em' }}>
              LOOKUP BY COMPANY ID (ARES)
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={icoInput}
                onChange={e => setIcoInput(e.target.value.replace(/\D/g, '').slice(0, 8))}
                onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleLookup())}
                placeholder="např. 27082440"
                maxLength={8}
                style={{ ...inp, flex: 1 }}
              />
              <button type="button" onClick={handleLookup} disabled={looking || icoInput.length < 6} style={lookupBtn(looking || icoInput.length < 6)}>
                {looking ? 'Searching...' : 'Search'}
              </button>
            </div>
            {aresError && <p style={{ fontSize: '0.75rem', color: '#e0457a', marginTop: 6 }}>{aresError}</p>}
            {form.name && <p style={{ fontSize: '0.75rem', color: '#00a87a', marginTop: 6 }}>✓ Found: <strong>{form.name}</strong></p>}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Firma */}
          <div style={{ display: 'grid', gridTemplateColumns: '120px 1fr', gap: 10 }}>
            <Field label="COMPANY ID">
              <input value={form.ico} onChange={e => set('ico', e.target.value)} required style={inp} placeholder="12345678" maxLength={8} />
            </Field>
            <Field label="COMPANY NAME">
              <input value={form.name} onChange={e => set('name', e.target.value)} required style={inp} placeholder="Company Ltd." />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="LEGAL FORM">
              <input value={form.legalForm} onChange={e => set('legalForm', e.target.value)} style={inp} placeholder="Ltd." />
            </Field>
            <Field label="TYPE">
              <select value={form.type} onChange={e => set('type', e.target.value)} style={inp}>
                {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>
          </div>

          <Field label="STREET">
            <input value={form.street} onChange={e => set('street', e.target.value)} style={inp} placeholder="Street 123" />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 100px', gap: 10 }}>
            <Field label="CITY">
              <input value={form.city} onChange={e => set('city', e.target.value)} style={inp} placeholder="Prague" />
            </Field>
            <Field label="ZIP">
              <input value={form.zip} onChange={e => set('zip', e.target.value)} style={inp} placeholder="11000" />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="COMPANY EMAIL">
              <input type="email" value={form.email} onChange={e => set('email', e.target.value)} style={inp} placeholder="info@company.com" />
            </Field>
            <Field label="COMPANY PHONE">
              <input value={form.phone} onChange={e => set('phone', e.target.value)} style={inp} placeholder="+420 123 456 789" />
            </Field>
          </div>

          <Field label="WEB">
            <input value={form.web} onChange={e => set('web', e.target.value)} style={inp} placeholder="https://firma.cz" />
          </Field>

          {/* Kontaktní osoby */}
          <div style={{ marginTop: 6 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em' }}>
                CONTACT PERSONS
              </div>
              <button
                type="button"
                onClick={addContact}
                style={{ fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer' }}
              >
                + Add person
              </button>
            </div>

            {contacts.length === 0 && (
              <div style={{ fontSize: '0.78rem', color: 'var(--text-dim)', padding: '10px 0' }}>
                No contact persons yet. Click "+ Add person".
              </div>
            )}

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {contacts.map((c, i) => (
                <div key={i} style={{ background: 'rgba(0,168,122,0.04)', borderRadius: 10, padding: '12px 14px', border: '1px solid var(--card-border)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600 }}>Person {i + 1}</span>
                    <button
                      type="button"
                      onClick={() => removeContact(i)}
                      style={{ fontSize: '0.72rem', color: '#e0457a', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }}
                    >
                      Remove
                    </button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <Field label="NAME">
                      <input value={c.name} onChange={e => setContact(i, 'name', e.target.value)} style={inp} placeholder="John Smith" />
                    </Field>
                    <Field label="POSITION">
                      <input value={c.position} onChange={e => setContact(i, 'position', e.target.value)} style={inp} placeholder="HR Manager" />
                    </Field>
                    <Field label="EMAIL">
                      <input type="email" value={c.email} onChange={e => setContact(i, 'email', e.target.value)} style={inp} placeholder="jan@firma.cz" />
                    </Field>
                    <Field label="TELEFON">
                      <input value={c.phone} onChange={e => setContact(i, 'phone', e.target.value)} style={inp} placeholder="+420 777 888 999" />
                    </Field>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <Field label="NOTE">
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Optional" />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="submit" disabled={saving} style={submitBtn(saving)}>
              {saving ? 'Saving...' : company ? 'Save Changes' : 'Add Company'}
            </button>
            <button type="button" onClick={onClose} style={cancelBtn}>Cancel</button>
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

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(240,250,248,0.8)',
  fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text)', outline: 'none',
}

const lookupBtn = (disabled: boolean): React.CSSProperties => ({
  padding: '9px 16px', borderRadius: 9, border: 'none',
  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
  color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
  fontSize: '0.82rem', cursor: disabled ? 'not-allowed' : 'pointer',
  opacity: disabled ? 0.6 : 1, whiteSpace: 'nowrap',
})

const submitBtn = (disabled: boolean): React.CSSProperties => ({
  flex: 1, padding: '11px', borderRadius: 9, border: 'none',
  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
  color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
  fontSize: '0.9rem', cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.7 : 1,
})

const cancelBtn: React.CSSProperties = {
  padding: '11px 18px', borderRadius: 9, border: '1px solid var(--card-border)',
  background: 'white', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)',
}
