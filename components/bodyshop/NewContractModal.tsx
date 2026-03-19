'use client'

import { useState, useEffect, useRef } from 'react'
import { createContract } from '@/lib/bodyshop'
import { getCompanies } from '@/lib/companies'
import { getPeople, initials } from '@/lib/meet-visu'
import type { Currency, Company, Person } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function NewContractModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    contractorName: '',
    clientName: '',
    startDate: new Date().toISOString().slice(0, 10),
    endDate: '',
    mdRateContractor: '',
    mdRateClient: '',
    currency: 'CZK' as Currency,
    invoiceDaysContractor: '30',
    invoiceDaysClient: '30',
    managerName: '',
    managerRole: '',
    note: '',
  })
  const [saving,        setSaving]        = useState(false)
  const [companies,     setCompanies]     = useState<Company[]>([])
  const [suggestions,   setSuggestions]   = useState<Company[]>([])
  const [showSuggest,   setShowSuggest]   = useState(false)
  const suggestRef = useRef<HTMLDivElement>(null)

  const [people,        setPeople]        = useState<Person[]>([])
  const [mgmtQuery,     setMgmtQuery]     = useState('')
  const [showMgmt,      setShowMgmt]      = useState(false)
  const mgmtRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getCompanies().then(setCompanies)
    getPeople().then(setPeople)
  }, [])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (suggestRef.current && !suggestRef.current.contains(e.target as Node)) setShowSuggest(false)
      if (mgmtRef.current   && !mgmtRef.current.contains(e.target as Node))     setShowMgmt(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleClientInput(value: string) {
    set('clientName', value)
    if (value.length < 1) { setSuggestions([]); setShowSuggest(false); return }
    const matches = companies.filter(c =>
      c.name.toLowerCase().includes(value.toLowerCase())
    )
    setSuggestions(matches)
    setShowSuggest(matches.length > 0)
  }

  function selectCompany(c: Company) {
    set('clientName', c.name)
    setSuggestions([])
    setShowSuggest(false)
  }

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await createContract({
      contractorName:          form.contractorName,
      clientName:              form.clientName,
      startDate:               form.startDate,
      endDate:                 form.endDate || undefined,
      mdRateContractor:        Number(form.mdRateContractor),
      mdRateClient:            Number(form.mdRateClient),
      currency:                form.currency,
      status:                  'active',
      invoiceDaysContractor:   form.invoiceDaysContractor ? Number(form.invoiceDaysContractor) : undefined,
      invoiceDaysClient:       form.invoiceDaysClient ? Number(form.invoiceDaysClient) : undefined,
      managerName:             form.managerName || undefined,
      managerRole:             form.managerRole || undefined,
      note:                    form.note,
    })
    onCreated()
  }

  const margin = form.mdRateClient && form.mdRateContractor
    ? Math.round(((Number(form.mdRateClient) - Number(form.mdRateContractor)) / Number(form.mdRateClient)) * 100)
    : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 100,
      background: 'rgba(15,46,42,0.4)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 20,
    }} onClick={onClose}>
      <div
        className="glass-card"
        style={{ width: '100%', maxWidth: 500, padding: '32px 28px', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', marginBottom: 24 }}>
          New Contract
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="CONTRACTOR (name)">
            <input value={form.contractorName} onChange={e => set('contractorName', e.target.value)} required style={inp} placeholder="John Smith" />
          </Field>

          <Field label="CLIENT (company)">
            <div ref={suggestRef} style={{ position: 'relative' }}>
              <input
                value={form.clientName}
                onChange={e => handleClientInput(e.target.value)}
                onFocus={() => form.clientName && setShowSuggest(suggestions.length > 0)}
                required
                style={inp}
                placeholder="Acme s.r.o."
                autoComplete="off"
              />
              {showSuggest && (
                <div style={{
                  position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                  background: 'white', border: '1px solid rgba(0,168,122,0.2)',
                  borderRadius: 9, marginTop: 4, boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
                  maxHeight: 200, overflowY: 'auto',
                }}>
                  {suggestions.map(c => (
                    <div
                      key={c.id}
                      onMouseDown={() => selectCompany(c)}
                      style={{
                        padding: '9px 14px', cursor: 'pointer', fontSize: '0.82rem',
                        borderBottom: '1px solid rgba(0,168,122,0.08)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,168,122,0.06)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'white')}
                    >
                      <span style={{ fontWeight: 600, color: 'var(--text)' }}>{c.name}</span>
                      {c.city && <span style={{ color: 'var(--text-dim)', marginLeft: 8, fontSize: '0.75rem' }}>{c.city}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="START DATE">
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} required style={inp} />
            </Field>
            <Field label="END DATE">
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} style={inp} min={form.startDate} />
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10 }}>
            <Field label="MD COST">
              <input type="number" value={form.mdRateContractor} onChange={e => set('mdRateContractor', e.target.value)} required style={inp} placeholder="10 000" min="0" />
            </Field>
            <Field label="MD RATE">
              <input type="number" value={form.mdRateClient} onChange={e => set('mdRateClient', e.target.value)} required style={inp} placeholder="15 000" min="0" />
            </Field>
            <Field label="CURRENCY">
              <select value={form.currency} onChange={e => set('currency', e.target.value)} style={inp}>
                <option value="CZK">CZK</option>
                <option value="EUR">EUR</option>
              </select>
            </Field>
          </div>

          {margin !== null && (
            <div style={{
              background: margin >= 30 ? 'rgba(0,168,122,0.08)' : margin >= 15 ? 'rgba(245,158,11,0.08)' : 'rgba(224,69,122,0.08)',
              borderRadius: 9, padding: '10px 14px', fontSize: '0.8rem', textAlign: 'center',
            }}>
              Margin: <strong style={{ color: margin >= 30 ? '#00a87a' : margin >= 15 ? '#f59e0b' : '#e0457a' }}>{margin} %</strong>
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="INVOICE TERMS — CONTRACTOR (days)">
              <select value={form.invoiceDaysContractor} onChange={e => set('invoiceDaysContractor', e.target.value)} style={inp}>
                {[7, 14, 21, 30, 45, 60, 90].map(d => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </Field>
            <Field label="INVOICE TERMS — CLIENT (days)">
              <select value={form.invoiceDaysClient} onChange={e => set('invoiceDaysClient', e.target.value)} style={inp}>
                {[7, 14, 21, 30, 45, 60, 90].map(d => (
                  <option key={d} value={d}>{d} days</option>
                ))}
              </select>
            </Field>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="MANAGER (name)">
              <div ref={mgmtRef} style={{ position: 'relative' }}>
                <input
                  value={mgmtQuery || form.managerName}
                  onChange={e => {
                    setMgmtQuery(e.target.value)
                    set('managerName', e.target.value)
                    setShowMgmt(true)
                  }}
                  onFocus={() => setShowMgmt(true)}
                  style={inp}
                  placeholder="Jane Smith"
                  autoComplete="off"
                />
                {showMgmt && mgmtQuery.trim().length > 0 && (() => {
                  const matches = people.filter(p =>
                    p.name.toLowerCase().includes(mgmtQuery.toLowerCase())
                  ).slice(0, 6)
                  return matches.length > 0 ? (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300,
                      background: 'white', border: '1px solid rgba(0,168,122,0.2)',
                      borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden',
                    }}>
                      {matches.map(p => (
                        <div
                          key={p.id}
                          onMouseDown={() => {
                            set('managerName', p.name)
                            if (p.role) set('managerRole', p.role)
                            setMgmtQuery('')
                            setShowMgmt(false)
                          }}
                          style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                        >
                          <div style={{
                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                            background: 'rgba(0,168,122,0.12)', color: 'var(--primary)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '0.62rem', fontWeight: 700, overflow: 'hidden',
                          }}>
                            {p.photo
                              ? <img src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" />
                              : initials(p.name)
                            }
                          </div>
                          <div>
                            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>
                              {[p.role, p.level, p.tribe].filter(Boolean).join(' · ')}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null
                })()}
              </div>
            </Field>
            <Field label="MANAGER ROLE">
              <input value={form.managerRole} onChange={e => set('managerRole', e.target.value)} style={inp} placeholder="Senior Recruiter" />
            </Field>
          </div>

          <Field label="NOTE">
            <input value={form.note} onChange={e => set('note', e.target.value)} style={inp} placeholder="Optional" />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button
              type="submit"
              disabled={saving}
              style={{
                flex: 1, padding: '11px', borderRadius: 9, border: 'none',
                background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
                fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Create Contract'}
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '11px 18px', borderRadius: 9,
                border: '1px solid var(--card-border)', background: 'white',
                cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)',
              }}
            >
              Cancel
            </button>
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
