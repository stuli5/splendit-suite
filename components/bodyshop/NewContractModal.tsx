'use client'

import { useState } from 'react'
import { createContract } from '@/lib/bodyshop'
import type { Currency } from '@/lib/types'

interface Props {
  onClose: () => void
  onCreated: () => void
}

export default function NewContractModal({ onClose, onCreated }: Props) {
  const [form, setForm] = useState({
    contractorName: '',
    clientName: '',
    startDate: new Date().toISOString().slice(0, 10),
    mdRateContractor: '',
    mdRateClient: '',
    currency: 'CZK' as Currency,
    note: '',
  })
  const [saving, setSaving] = useState(false)

  function set(key: string, value: string) {
    setForm(f => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    await createContract({
      contractorName:   form.contractorName,
      clientName:       form.clientName,
      startDate:        form.startDate,
      mdRateContractor: Number(form.mdRateContractor),
      mdRateClient:     Number(form.mdRateClient),
      currency:         form.currency,
      status:           'active',
      note:             form.note,
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
          Nový kontrakt
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <Field label="KONTRAKTOR (jméno)">
            <input value={form.contractorName} onChange={e => set('contractorName', e.target.value)} required style={inp} placeholder="Jan Novák" />
          </Field>

          <Field label="KLIENT (firma)">
            <input value={form.clientName} onChange={e => set('clientName', e.target.value)} required style={inp} placeholder="Acme s.r.o." />
          </Field>

          <Field label="DEN NÁSTUPU">
            <input type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} required style={inp} />
          </Field>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 100px', gap: 10 }}>
            <Field label="MD NÁKLAD">
              <input type="number" value={form.mdRateContractor} onChange={e => set('mdRateContractor', e.target.value)} required style={inp} placeholder="10 000" min="0" />
            </Field>
            <Field label="MD PRODEJ">
              <input type="number" value={form.mdRateClient} onChange={e => set('mdRateClient', e.target.value)} required style={inp} placeholder="15 000" min="0" />
            </Field>
            <Field label="MĚNA">
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
              Marža: <strong style={{ color: margin >= 30 ? '#00a87a' : margin >= 15 ? '#f59e0b' : '#e0457a' }}>{margin} %</strong>
            </div>
          )}

          <Field label="POZNÁMKA">
            <input value={form.note} onChange={e => set('note', e.target.value)} style={inp} placeholder="Nepovinné" />
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
              {saving ? 'Ukládám...' : 'Vytvořit kontrakt'}
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
              Zrušit
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
