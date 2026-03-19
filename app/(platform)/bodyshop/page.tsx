'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { getContracts, getAllWorklogs, deleteContract, clearAllWorklogs, formatCurrency, marginPercent } from '@/lib/bodyshop'
import type { Contract, Worklog } from '@/lib/types'
import NewContractModal from '@/components/bodyshop/NewContractModal'

export default function BodyshopPage() {
  const [contracts,     setContracts]     = useState<Contract[]>([])
  const [worklogs,      setWorklogs]      = useState<Worklog[]>([])
  const [loading,       setLoading]       = useState(true)
  const [showModal,     setShowModal]     = useState(false)
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7))

  async function load() {
    const [c, w] = await Promise.all([getContracts(), getAllWorklogs()])
    setContracts(c)
    setWorklogs(w)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  const selectedLogs = worklogs.filter(w => w.month === selectedMonth)
  const totalRevenue = selectedLogs.reduce((s, w) => s + w.revenue, 0)
  const totalCost    = selectedLogs.reduce((s, w) => s + w.cost, 0)
  const totalProfit  = selectedLogs.reduce((s, w) => s + w.profit, 0)
  const activeCount  = contracts.filter(c => c.status === 'active').length

  const currentYear   = new Date().getFullYear().toString()
  const yearLogs      = worklogs.filter(w => w.month.startsWith(currentYear))
  const yearRevenue   = yearLogs.reduce((s, w) => s + w.revenue, 0)
  const yearCost      = yearLogs.reduce((s, w) => s + w.cost, 0)
  const yearProfit    = yearLogs.reduce((s, w) => s + w.profit, 0)

  // Mesiace pre ktoré existujú záznamy
  const availableMonths = [...new Set(worklogs.map(w => w.month))].sort((a, b) => b.localeCompare(a))

  const monthLabel = (m: string) =>
    new Date(m + '-01').toLocaleString('en-GB', { month: 'long', year: 'numeric' })

  const isCurrentMonth = selectedMonth === new Date().toISOString().slice(0, 7)

  const kpi = [
    { label: 'Active Contractors', value: String(activeCount),                color: '#00a87a' },
    { label: 'Revenue',            value: formatCurrency(totalRevenue, 'CZK'), color: '#0091c7' },
    { label: 'Costs',              value: formatCurrency(totalCost,    'CZK'), color: '#e0457a' },
    { label: 'Profit',             value: formatCurrency(totalProfit,  'CZK'), color: '#6b46a8' },
  ]

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
            🏗 Bodyshop
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Contractor management, rates & monthly margins
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button
            onClick={async () => {
              if (!confirm('Delete all revenue, cost and profit records? Contracts will be preserved.')) return
              await clearAllWorklogs()
              load()
            }}
            style={{
              padding: '10px 18px', borderRadius: 9,
              border: '1px solid rgba(224,69,122,0.3)', background: 'rgba(224,69,122,0.06)',
              color: '#e0457a', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            Clear Data
          </button>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '10px 20px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            + New Contract
          </button>
        </div>
      </div>

      {/* Month picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <button
          onClick={() => {
            const d = new Date(selectedMonth + '-01')
            d.setMonth(d.getMonth() - 1)
            setSelectedMonth(d.toISOString().slice(0, 7))
          }}
          style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: 7, padding: '5px 12px', cursor: 'pointer', fontSize: '0.9rem', color: 'var(--text-muted)' }}
        >
          ‹
        </button>
        <select
          value={selectedMonth}
          onChange={e => setSelectedMonth(e.target.value)}
          style={{
            padding: '7px 14px', borderRadius: 9, border: '1px solid rgba(0,168,122,0.25)',
            background: 'rgba(255,255,255,0.8)', fontSize: '0.82rem',
            fontFamily: 'JetBrains Mono, monospace', color: 'var(--text)', outline: 'none', cursor: 'pointer',
          }}
        >
          {/* Aktuálny mesiac vždy ako prvá možnosť */}
          {!availableMonths.includes(selectedMonth) && (
            <option value={selectedMonth}>{monthLabel(selectedMonth)}</option>
          )}
          {availableMonths.map(m => (
            <option key={m} value={m}>{monthLabel(m)}</option>
          ))}
        </select>
        <button
          onClick={() => {
            const d = new Date(selectedMonth + '-01')
            d.setMonth(d.getMonth() + 1)
            setSelectedMonth(d.toISOString().slice(0, 7))
          }}
          disabled={isCurrentMonth}
          style={{ background: 'none', border: '1px solid var(--card-border)', borderRadius: 7, padding: '5px 12px', cursor: isCurrentMonth ? 'not-allowed' : 'pointer', fontSize: '0.9rem', color: isCurrentMonth ? 'var(--text-dim)' : 'var(--text-muted)', opacity: isCurrentMonth ? 0.4 : 1 }}
        >
          ›
        </button>
        {!isCurrentMonth && (
          <button
            onClick={() => setSelectedMonth(new Date().toISOString().slice(0, 7))}
            style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600, marginLeft: 4 }}
          >
            Today
          </button>
        )}
        {selectedLogs.length === 0 && (
          <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginLeft: 8 }}>
            No records for this month
          </span>
        )}
      </div>

      {/* Yearly summary */}
      <div className="glass-card" style={{ padding: '12px 20px', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 32 }}>
        <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
          {currentYear} TOTAL
        </span>
        {[
          { label: 'Contractors', value: String(contracts.length),              color: '#00a87a' },
          { label: 'Revenue',     value: formatCurrency(yearRevenue, 'CZK'),    color: '#0091c7' },
          { label: 'Costs',       value: formatCurrency(yearCost,    'CZK'),    color: '#e0457a' },
          { label: 'Profit',      value: formatCurrency(yearProfit,  'CZK'),    color: '#6b46a8' },
        ].map(k => (
          <div key={k.label} style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)', letterSpacing: '0.04em' }}>{k.label.toUpperCase()}</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: k.color }}>{k.value}</span>
          </div>
        ))}
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
            Contracts
          </span>
        </div>

        {loading ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            Loading...
          </div>
        ) : contracts.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
            No contracts yet. Add the first one by clicking "+ New Contract".
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,168,122,0.04)' }}>
                {['Contractor', 'Client', 'Start Date', 'MD Cost', 'MD Rate', 'Margin', 'Status', ''].map(h => (
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
                      {new Date(c.startDate).toLocaleDateString('en-GB')}
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
                        {c.status === 'active' ? 'Active' : 'Ended'}
                      </span>
                    </td>
                    <td style={{ padding: '13px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                      <Link href={`/bodyshop/${c.id}`} style={{
                        fontSize: '0.75rem', color: 'var(--primary)', textDecoration: 'none', fontWeight: 600,
                      }}>
                        Detail →
                      </Link>
                      <button
                        onClick={async () => {
                          if (!confirm(`Delete contract "${c.contractorName}"?`)) return
                          await deleteContract(c.id)
                          load()
                        }}
                        title="Delete contract"
                        style={{
                          background: 'none', border: 'none', cursor: 'pointer',
                          color: '#e0457a', fontSize: '1rem', lineHeight: 1, padding: 0,
                        }}
                      >
                        🗑
                      </button>
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
