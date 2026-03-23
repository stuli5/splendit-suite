'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  getPortalCandidates, addPortalCandidate, deactivatePortalCandidate, deletePortalCandidate,
  type PortalCandidate,
} from '@/lib/portal'

export default function PortalCandidatesPage() {
  const [candidates, setCandidates] = useState<PortalCandidate[]>([])
  const [loading, setLoading]       = useState(true)
  const [showAdd, setShowAdd]       = useState(false)
  const [name, setName]             = useState('')
  const [email, setEmail]           = useState('')
  const [saving, setSaving]         = useState(false)
  const [error, setError]           = useState('')

  useEffect(() => {
    getPortalCandidates().then(setCandidates).finally(() => setLoading(false))
  }, [])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const id = await addPortalCandidate(email, name)
      const newEntry: PortalCandidate = {
        id, email: email.toLowerCase(), name, active: true,
        createdAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as never,
      }
      setCandidates(prev => [newEntry, ...prev])
      setName('')
      setEmail('')
      setShowAdd(false)
    } catch {
      setError('Failed to add candidate.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDeactivate(id: string) {
    await deactivatePortalCandidate(id)
    setCandidates(prev => prev.map(c => c.id === id ? { ...c, active: false } : c))
  }

  async function handleDelete(id: string, name: string) {
    if (!confirm(`Delete ${name} permanently?`)) return
    await deletePortalCandidate(id)
    setCandidates(prev => prev.filter(c => c.id !== id))
  }

  const active   = candidates.filter(c => c.active)
  const inactive = candidates.filter(c => !c.active)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
            <Link href="/bodyshop" style={{ fontSize: '0.78rem', color: 'var(--text-muted)', textDecoration: 'none' }}>
              ← Bodyshop
            </Link>
          </div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text)' }}>
            Portal Candidates
          </h1>
          <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginTop: 3 }}>
            Manage who has access to the contractor self-service portal.
          </p>
        </div>
        <button onClick={() => setShowAdd(true)} style={primaryBtnStyle}>
          + Add candidate
        </button>
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 14, marginBottom: 24 }}>
        <div className="glass-card" style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--primary)', fontFamily: 'Syne, sans-serif' }}>{active.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Active</div>
        </div>
        <div className="glass-card" style={{ padding: '14px 20px' }}>
          <div style={{ fontSize: '1.4rem', fontWeight: 700, color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif' }}>{inactive.length}</div>
          <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Deactivated</div>
        </div>
      </div>

      {/* Table */}
      <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid rgba(0,168,122,0.1)' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.88rem', color: 'var(--text)' }}>
            Allowlist
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.83rem' }}>Loading...</div>
        ) : candidates.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
            No candidates yet. Add the first one above.
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.83rem', fontFamily: 'JetBrains Mono, monospace' }}>
            <thead>
              <tr style={{ background: 'rgba(0,168,122,0.05)' }}>
                {['Name', 'Email', 'Added', 'Status', ''].map(h => (
                  <th key={h} style={thStyle}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {candidates.map(c => (
                <tr key={c.id} style={{ borderBottom: '1px solid rgba(0,168,122,0.06)', opacity: c.active ? 1 : 0.5 }}>
                  <td style={tdStyle}>{c.name}</td>
                  <td style={tdStyle}>{c.email}</td>
                  <td style={tdStyle}>{formatDate(c.createdAt)}</td>
                  <td style={tdStyle}>
                    <span style={{
                      padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
                      background: c.active ? 'rgba(0,168,122,0.12)' : 'rgba(0,0,0,0.06)',
                      color: c.active ? 'var(--primary)' : 'var(--text-muted)',
                    }}>
                      {c.active ? 'active' : 'inactive'}
                    </span>
                  </td>
                  <td style={{ ...tdStyle, textAlign: 'right' }}>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
                      {c.active && (
                        <button
                          onClick={() => handleDeactivate(c.id)}
                          style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit' }}>
                          Deactivate
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id, c.name)}
                        style={{ background: 'none', border: 'none', color: '#e0457a', cursor: 'pointer', fontSize: '0.78rem', fontFamily: 'inherit' }}>
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add modal */}
      {showAdd && (
        <div style={overlayStyle} onClick={e => e.target === e.currentTarget && setShowAdd(false)}>
          <div className="glass-card" style={{ width: 400, padding: '28px 24px' }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', marginBottom: 18, color: 'var(--text)' }}>
              Add portal candidate
            </h2>
            <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div>
                <label style={labelStyle}>FULL NAME</label>
                <input value={name} onChange={e => setName(e.target.value)} required
                  placeholder="Jan Novák" style={inputStyle} />
              </div>
              <div>
                <label style={labelStyle}>EMAIL</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)} required
                  placeholder="jan.novak@email.cz" style={inputStyle} />
              </div>
              {error && <p style={{ fontSize: '0.75rem', color: '#e0457a' }}>{error}</p>}
              <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
                <button type="button" onClick={() => setShowAdd(false)} style={outlineBtnStyle}>Cancel</button>
                <button type="submit" disabled={saving} style={{ ...primaryBtnStyle, flex: 1, opacity: saving ? 0.7 : 1 }}>
                  {saving ? 'Adding...' : 'Add to allowlist'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(ts: { seconds: number }): string {
  return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem',
  color: 'var(--text-muted)', fontWeight: 600, letterSpacing: '0.05em',
  fontFamily: 'Syne, sans-serif',
}

const tdStyle: React.CSSProperties = {
  padding: '11px 16px', color: 'var(--text)', verticalAlign: 'middle',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50,
  background: 'rgba(15,46,42,0.5)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '9px 18px', borderRadius: 9, border: 'none',
  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
  color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
  fontSize: '0.83rem', cursor: 'pointer',
}

const outlineBtnStyle: React.CSSProperties = {
  padding: '8px 14px', borderRadius: 8,
  border: '1px solid rgba(0,168,122,0.3)', background: 'transparent',
  color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif',
  fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 9,
  border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(240,250,248,0.8)',
  fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600,
  display: 'block', marginBottom: 5, letterSpacing: '0.05em',
}
