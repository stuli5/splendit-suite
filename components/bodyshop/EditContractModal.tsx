'use client'

import { useState, useEffect, useRef } from 'react'
import { updateContract } from '@/lib/bodyshop'
import { getCompanies } from '@/lib/companies'
import { getPeople, initials } from '@/lib/meet-visu'
import type { Contract, Currency, Company, Person } from '@/lib/types'

interface Props {
  contract: Contract
  onClose:  () => void
  onSaved:  () => void
}

const INVOICE_DAYS = ['7', '14', '21', '30', '45', '60', '90']

const inp: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(240,250,248,0.8)',
  fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
}

export default function EditContractModal({ contract, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    contractorName:        contract.contractorName,
    clientName:            contract.clientName,
    startDate:             contract.startDate,
    endDate:               contract.endDate       ?? '',
    mdRateContractor:      String(contract.mdRateContractor),
    mdRateClient:          String(contract.mdRateClient),
    currency:              contract.currency       as Currency,
    invoiceDaysContractor: String(contract.invoiceDaysContractor ?? '30'),
    invoiceDaysClient:     String(contract.invoiceDaysClient     ?? '30'),
    managerName:           contract.managerName   ?? '',
    managerRole:           contract.managerRole   ?? '',
    note:                  contract.note          ?? '',
  })
  const [saving, setSaving] = useState(false)

  // Company autocomplete
  const [companies,   setCompanies]   = useState<Company[]>([])
  const [showClient,  setShowClient]  = useState(false)
  const clientRef = useRef<HTMLDivElement>(null)

  // People autocomplete (manager)
  const [people,      setPeople]      = useState<Person[]>([])
  const [mgmtQuery,   setMgmtQuery]   = useState('')
  const [showMgmt,    setShowMgmt]    = useState(false)
  const mgmtRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    getCompanies().then(setCompanies)
    getPeople().then(setPeople)
  }, [])

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setShowClient(false)
      if (mgmtRef.current   && !mgmtRef.current.contains(e.target as Node))   setShowMgmt(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  const clientMatches = form.clientName.trim().length > 0
    ? companies.filter(c => c.name.toLowerCase().includes(form.clientName.toLowerCase())).slice(0, 5)
    : []

  const mgmtMatches = mgmtQuery.trim().length > 0
    ? people.filter(p => p.name.toLowerCase().includes(mgmtQuery.toLowerCase())).slice(0, 6)
    : []

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await updateContract(contract.id, {
      contractorName:        form.contractorName,
      clientName:            form.clientName,
      startDate:             form.startDate,
      endDate:               form.endDate       || undefined,
      mdRateContractor:      Number(form.mdRateContractor),
      mdRateClient:          Number(form.mdRateClient),
      currency:              form.currency,
      invoiceDaysContractor: form.invoiceDaysContractor ? Number(form.invoiceDaysContractor) : undefined,
      invoiceDaysClient:     form.invoiceDaysClient     ? Number(form.invoiceDaysClient)     : undefined,
      managerName:           form.managerName  || undefined,
      managerRole:           form.managerRole  || undefined,
      note:                  form.note         || undefined,
    })
    onSaved()
  }

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 200, background: 'rgba(15,46,42,0.45)', backdropFilter: 'blur(6px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={onClose}
    >
      <div
        className="glass-card"
        style={{ width: '100%', maxWidth: 620, padding: '32px 28px', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: 'var(--text)', marginBottom: 24 }}>
          Edit Contract
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

          {/* Contractor */}
          <Field label="CONTRACTOR NAME">
            <input value={form.contractorName} onChange={e => set('contractorName', e.target.value)} required style={inp} placeholder="John Smith" />
          </Field>

          {/* Client with autocomplete */}
          <Field label="CLIENT (company)">
            <div ref={clientRef} style={{ position: 'relative' }}>
              <input
                value={form.clientName}
                onChange={e => { set('clientName', e.target.value); setShowClient(true) }}
                onFocus={() => setShowClient(true)}
                required style={inp} placeholder="Company Ltd."
              />
              {showClient && clientMatches.length > 0 && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: 'white', border: '1px solid rgba(0,168,122,0.2)', borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                  {clientMatches.map(c => (
                    <div key={c.id} onMouseDown={() => { set('clientName', c.name); setShowClient(false) }}
                      style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                      {c.name}
                      {c.city && <span style={{ color: 'var(--text-dim)', fontSize: '0.72rem', marginLeft: 8 }}>{c.city}</span>}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </Field>

          {/* Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="START DATE">
              <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} required style={inp} />
            </Field>
            <Field label="END DATE">
              <input type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} style={inp} />
            </Field>
          </div>

          {/* Rates + Currency */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 90px', gap: 10 }}>
            <Field label="MD COST (contractor)">
              <input type="number" min="0" value={form.mdRateContractor} onChange={e => set('mdRateContractor', e.target.value)} required style={inp} placeholder="600" />
            </Field>
            <Field label="MD RATE (client)">
              <input type="number" min="0" value={form.mdRateClient} onChange={e => set('mdRateClient', e.target.value)} required style={inp} placeholder="900" />
            </Field>
            <Field label="CURRENCY">
              <select value={form.currency} onChange={e => set('currency', e.target.value)} style={inp}>
                <option value="CZK">CZK</option>
                <option value="EUR">EUR</option>
              </select>
            </Field>
          </div>

          {/* Invoice terms */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="INVOICE TERMS — CONTRACTOR">
              <select value={form.invoiceDaysContractor} onChange={e => set('invoiceDaysContractor', e.target.value)} style={inp}>
                {INVOICE_DAYS.map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </Field>
            <Field label="INVOICE TERMS — CLIENT">
              <select value={form.invoiceDaysClient} onChange={e => set('invoiceDaysClient', e.target.value)} style={inp}>
                {INVOICE_DAYS.map(d => <option key={d} value={d}>{d} days</option>)}
              </select>
            </Field>
          </div>

          {/* Manager with people autocomplete */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            <Field label="MANAGER (name)">
              <div ref={mgmtRef} style={{ position: 'relative' }}>
                <input
                  value={mgmtQuery || form.managerName}
                  onChange={e => { setMgmtQuery(e.target.value); set('managerName', e.target.value); setShowMgmt(true) }}
                  onFocus={() => setShowMgmt(true)}
                  style={inp} placeholder="Jane Smith" autoComplete="off"
                />
                {showMgmt && mgmtMatches.length > 0 && (
                  <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 300, background: 'white', border: '1px solid rgba(0,168,122,0.2)', borderRadius: 9, boxShadow: '0 8px 24px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
                    {mgmtMatches.map(p => (
                      <div key={p.id} onMouseDown={() => { set('managerName', p.name); if (p.role) set('managerRole', p.role); setMgmtQuery(''); setShowMgmt(false) }}
                        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', cursor: 'pointer', borderBottom: '1px solid rgba(0,0,0,0.04)' }}>
                        <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, background: 'rgba(0,168,122,0.12)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.62rem', fontWeight: 700, overflow: 'hidden' }}>
                          {p.photo ? <img src={p.photo} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }} alt="" /> : initials(p.name)}
                        </div>
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{[p.role, p.level, p.tribe].filter(Boolean).join(' · ')}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </Field>
            <Field label="MANAGER ROLE">
              <input value={form.managerRole} onChange={e => set('managerRole', e.target.value)} style={inp} placeholder="Senior Recruiter" />
            </Field>
          </div>

          {/* Note */}
          <Field label="NOTE">
            <textarea value={form.note} onChange={e => set('note', e.target.value)} rows={2} style={{ ...inp, resize: 'vertical' }} placeholder="Optional" />
          </Field>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button type="submit" disabled={saving} style={{
              flex: 1, padding: 11, borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '0.9rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
            }}>
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
            <button type="button" onClick={onClose} style={{
              padding: '11px 18px', borderRadius: 9, border: '1px solid var(--card-border)',
              background: 'white', cursor: 'pointer', fontSize: '0.85rem', color: 'var(--text-muted)',
            }}>
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
