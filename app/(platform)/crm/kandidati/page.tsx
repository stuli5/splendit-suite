'use client'

import { useEffect, useState } from 'react'
import { getCRMCandidates, deleteCRMCandidate } from '@/lib/crm-candidates'
import type { CRMCandidate } from '@/lib/types'
import CandidateModal from '@/components/crm-candidates/CandidateModal'

function normalizeUrl(url: string, base: string): string {
  if (!url) return ''
  if (url.startsWith('http')) return url
  return `https://${base}/${url.replace(/^.*?([\w-]+)\/?$/, '$1')}`
}

function linkedInUrl(raw: string): string {
  if (raw.startsWith('http')) return raw
  const handle = raw.replace(/^.*linkedin\.com\/in\//i, '').replace(/\/$/, '')
  return `https://linkedin.com/in/${handle}`
}

function gitHubUrl(raw: string): string {
  if (raw.startsWith('http')) return raw
  const handle = raw.replace(/^.*github\.com\//i, '').replace(/\/$/, '')
  return `https://github.com/${handle}`
}

export default function KandidatiPage() {
  const [candidates, setCandidates] = useState<CRMCandidate[]>([])
  const [loading,    setLoading]    = useState(true)
  const [search,     setSearch]     = useState('')
  const [showModal,  setShowModal]  = useState(false)
  const [editing,    setEditing]    = useState<CRMCandidate | undefined>()

  async function load() {
    setLoading(true)
    setCandidates(await getCRMCandidates())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(c: CRMCandidate) {
    if (!confirm(`Delete candidate "${c.firstName} ${c.lastName}"?`)) return
    await deleteCRMCandidate(c.id)
    load()
  }

  const filtered = candidates.filter(c => {
    const q = search.toLowerCase()
    return (
      c.firstName.toLowerCase().includes(q) ||
      c.lastName.toLowerCase().includes(q)  ||
      c.position.toLowerCase().includes(q)  ||
      c.email?.toLowerCase().includes(q)
    )
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
            👤 Candidates
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            CRM — candidate profiles & pipeline
          </p>
        </div>
        <button
          onClick={() => { setEditing(undefined); setShowModal(true) }}
          style={{
            padding: '10px 20px', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          + Add Candidate
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, position or email..."
          style={{
            width: '100%', maxWidth: 400, padding: '10px 14px', borderRadius: 9,
            border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(255,255,255,0.8)',
            fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text)', outline: 'none',
          }}
        />
      </div>

      {/* Table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{
          padding: '16px 24px', borderBottom: '1px solid var(--card-border)',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
            Candidates
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{filtered.length} records</span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            {candidates.length === 0
              ? 'No candidates yet. Add the first one by clicking "+ Add Candidate".'
              : 'No results for the search term.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,168,122,0.04)' }}>
                {['Name', 'Position', 'Contact', 'Profiles', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: '0.68rem',
                    color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--card-border)',
                  }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((c, i) => (
                <tr key={c.id} style={{ borderBottom: i < filtered.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                  {/* Name */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{
                        width: 36, height: 36, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '0.8rem', fontWeight: 700, color: 'white', flexShrink: 0,
                      }}>
                        {c.firstName[0]}{c.lastName[0]}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>
                          {c.firstName} {c.lastName}
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)', marginTop: 1 }}>
                          {new Date(c.createdAt).toLocaleDateString('en-GB')}
                        </div>
                      </div>
                    </div>
                  </td>
                  {/* Position */}
                  <td style={{ padding: '13px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {c.position}
                  </td>
                  {/* Contact */}
                  <td style={{ padding: '13px 16px' }}>
                    {c.email && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.email}</div>
                    )}
                    {c.phone && (
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>{c.phone}</div>
                    )}
                    {!c.email && !c.phone && <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>—</span>}
                  </td>
                  {/* Profiles */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      {c.linkedIn && (
                        <a
                          href={linkedInUrl(c.linkedIn)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="LinkedIn"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, height: 30, borderRadius: 7,
                            background: '#0077b518', border: '1px solid #0077b530',
                            textDecoration: 'none', fontSize: '0.85rem',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#0077b530')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#0077b518')}
                        >
                          in
                        </a>
                      )}
                      {c.gitHub && (
                        <a
                          href={gitHubUrl(c.gitHub)}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="GitHub"
                          style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: 30, height: 30, borderRadius: 7,
                            background: '#24292e18', border: '1px solid #24292e30',
                            textDecoration: 'none', fontSize: '1rem',
                            transition: 'all 0.15s',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = '#24292e30')}
                          onMouseLeave={e => (e.currentTarget.style.background = '#24292e18')}
                        >
                          🐙
                        </a>
                      )}
                      {!c.linkedIn && !c.gitHub && <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>—</span>}
                    </div>
                  </td>
                  {/* Actions */}
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => { setEditing(c); setShowModal(true) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#e0457a', fontWeight: 600 }}
                      >
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

      {showModal && (
        <CandidateModal
          candidate={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
