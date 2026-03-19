'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getContracts, getAllWorklogs, formatCurrency, marginPercent } from '@/lib/bodyshop'
import type { Contract, Worklog } from '@/lib/types'
import NewContractModal from '@/components/bodyshop/NewContractModal'

export default function BodyshopPage() {
  const [contracts, setContracts] = useState<Contract[]>([])
  const [worklogs,  setWorklogs]  = useState<Worklog[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)

  async function load() {
    const [c, w] = await Promise.all([getContracts(), getAllWorklogs()])
    setContracts(c)
    setWorklogs(w)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const currentMonth  = new Date().toISOString().slice(0, 7)
  const thisMonthLogs = worklogs.filter(w => w.month === currentMonth)
  const totalRevenue  = thisMonthLogs.reduce((s, w) => s + w.revenue, 0)
  const totalCost     = thisMonthLogs.reduce((s, w) => s + w.cost, 0)
  const totalProfit   = thisMonthLogs.reduce((s, w) => s + w.profit, 0)
  const activeCount   = contracts.filter(c => c.status === 'active').length

  const kpi = [
    { label: 'Aktivní kontraktoři', value: String(activeCount),                color: '#00a87a' },
    { label: 'Tržby tento měsíc',   value: formatCurrency(totalRevenue, 'CZK'), color: '#0091c7' },
    { label: 'Náklady tento měsíc', value: formatCurrency(totalCost,    'CZK'), color: '#e0457a' },
    { label: 'Zisk tento měsíc',    value: formatCurrency(totalProfit,  'CZK'), color: '#6b46a8' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
            🏗 Bodyshop
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Správa kontraktorů, sazeb a měsíčních marží
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          style={{
            padding: '10px 20px', borderRadius: 9, border: 'none',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.85rem', cursor: 'pointer',
          }}
        >
          + Nový kontrakt
        </button>
      </div>

      {/* KPI */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 28 }}>
        {kpi.map((k) => (
          <div key={k.label} className="glass-card" style={{ padding: '18px 20px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 6, letterSpacing: '0.06em' }}>
              {k.label.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.35rem', color: k.color }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Contracts table */}
      <div className="glass-card" style={{ overflow: 'hidden' }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid var(--card-border)' }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
            Kontrakty
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            Načítám...
          </div>
        ) : contracts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            Zatím žádné kontrakty. Přidej první kliknutím na „+ Nový kontrakt".
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,168,122,0.04)' }}>
                {['Kontraktor', 'Klient', 'Nástup', 'MD náklad', 'MD prodej', 'Marža', 'Status', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left',
                    fontSize: '0.68rem', color: 'var(--text-dim)',
                    fontWeight: 600, letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--card-border)',
                  }}>
                    {h.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {contracts.map((c, i) => {
                const margin = marginPercent(c.mdRateClient, c.mdRateContractor)
                const marginColor = margin >= 30 ? '#00a87a' : margin >= 15 ? '#f59e0b' : '#e0457a'
                return (
                  <tr key={c.id} style={{ borderBottom: i < contracts.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                    <td style={{ padding: '13px 16px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
                      {c.contractorName}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {c.clientName}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {new Date(c.startDate).toLocaleDateString('cs-CZ')}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatCurrency(c.mdRateContractor, c.currency)}
                    </td>
                    <td style={{ padding: '13px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {formatCurrency(c.mdRateClient, c.currency)}
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        fontSize: '0.78rem', fontWeight: 700, color: marginColor,
                        background: `${marginColor}18`, padding: '3px 10px', borderRadius: 20,
                      }}>
                        {margin} %
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600,
                        color: c.status === 'active' ? '#00a87a' : 'var(--text-dim)',
                        background: c.status === 'active' ? 'rgba(0,168,122,0.12)' : 'rgba(0,0,0,0.05)',
                        padding: '3px 10px', borderRadius: 20,
                      }}>
                        {c.status === 'active' ? 'Aktivní' : 'Ukončen'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px' }}>
                      <Link href={`/bodyshop/${c.id}`} style={{
                        fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600,
                      }}>
                        Detail →
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {showModal && (
        <NewContractModal
          onClose={() => setShowModal(false)}
          onCreated={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
