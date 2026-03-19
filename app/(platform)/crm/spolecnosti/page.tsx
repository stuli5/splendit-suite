'use client'

import { useEffect, useState } from 'react'
import { getCompanies, deleteCompany } from '@/lib/companies'
import type { Company, CompanyType } from '@/lib/types'
import CompanyModal from '@/components/companies/CompanyModal'

const TYPE_COLORS: Record<CompanyType, string> = {
  klient:    '#00a87a',
  partner:   '#0091c7',
  dodavatel: '#6b46a8',
  ostatní:   '#7ab8ae',
}

export default function SpolecnostiPage() {
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading,   setLoading]   = useState(true)
  const [search,    setSearch]    = useState('')
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<Company | undefined>()

  async function load() {
    setCompanies(await getCompanies())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(c: Company) {
    if (!confirm(`Smazat společnost „${c.name}"?`)) return
    await deleteCompany(c.id)
    load()
  }

  const filtered = companies.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase()) ||
    c.ico.includes(search) ||
    c.city?.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
            🏢 Společnosti
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Klienti, partneři a dodavatelé
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
          + Přidat společnost
        </button>
      </div>

      {/* Search */}
      <div style={{ marginBottom: 20 }}>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Hledat dle názvu, IČO nebo města..."
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
        <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
            Společnosti
          </span>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
            {filtered.length} záznamů
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>Načítám...</div>
        ) : filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            {companies.length === 0
              ? 'Zatím žádné společnosti. Přidej první kliknutím na „+ Přidat společnost".'
              : 'Žádné výsledky pro hledaný výraz.'}
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,168,122,0.04)' }}>
                {['IČO', 'Název', 'Kontaktní osoby', 'Typ', 'Město', ''].map(h => (
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
                  <td style={{ padding: '13px 16px', fontSize: '0.78rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-muted)' }}>
                    {c.ico}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text)' }}>{c.name}</div>
                    {c.legalForm && <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>{c.legalForm}</div>}
                  </td>
                  <td style={{ padding: '13px 16px', maxWidth: 220 }}>
                    {c.contacts?.length > 0 ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        {c.contacts.slice(0, 2).map((p, pi) => (
                          <div key={pi}>
                            <div style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text)' }}>{p.name}</div>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>{p.position}{p.email ? ` · ${p.email}` : ''}</div>
                          </div>
                        ))}
                        {c.contacts.length > 2 && (
                          <div style={{ fontSize: '0.7rem', color: 'var(--text-dim)' }}>+{c.contacts.length - 2} další</div>
                        )}
                      </div>
                    ) : <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>—</span>}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <span style={{
                      fontSize: '0.72rem', fontWeight: 600,
                      color: TYPE_COLORS[c.type],
                      background: `${TYPE_COLORS[c.type]}18`,
                      padding: '3px 10px', borderRadius: 20,
                    }}>
                      {c.type}
                    </span>
                  </td>
                  <td style={{ padding: '13px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                    {c.city || '—'}
                  </td>
                  <td style={{ padding: '13px 16px' }}>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button
                        onClick={() => { setEditing(c); setShowModal(true) }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}
                      >
                        Upravit
                      </button>
                      <button
                        onClick={() => handleDelete(c)}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#e0457a', fontWeight: 600 }}
                      >
                        Smazat
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
        <CompanyModal
          company={editing}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
