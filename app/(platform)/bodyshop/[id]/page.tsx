'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  getContracts, getWorklogs, upsertWorklog, deleteWorklog,
  updateContract, formatCurrency, marginPercent, monthLabel
} from '@/lib/bodyshop'
import type { Contract, Worklog } from '@/lib/types'
import EditContractModal from '@/components/bodyshop/EditContractModal'

export default function ContractDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router  = useRouter()

  const [contract,  setContract]  = useState<Contract | null>(null)
  const [worklogs,  setWorklogs]  = useState<Worklog[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showEdit,  setShowEdit]  = useState(false)

  // worklog form
  const [wMonth,    setWMonth]    = useState(new Date().toISOString().slice(0, 7))
  const [wDays,     setWDays]     = useState('')
  const [wSaving,   setWSaving]   = useState(false)
  const [editId,    setEditId]    = useState<string | undefined>()

  async function load() {
    const [all, wl] = await Promise.all([getContracts(), getWorklogs(id)])
    setContract(all.find(c => c.id === id) ?? null)
    setWorklogs(wl)
    setLoading(false)
  }

  useEffect(() => { load() }, [id])

  async function handleSaveWorklog(e: React.FormEvent) {
    e.preventDefault()
    if (!contract) return
    setWSaving(true)
    await upsertWorklog(id, wMonth, Number(wDays), contract.mdRateClient, contract.mdRateContractor, editId)
    setWDays('')
    setEditId(undefined)
    await load()
    setWSaving(false)
  }

  function startEdit(w: Worklog) {
    setEditId(w.id)
    setWMonth(w.month)
    setWDays(String(w.daysWorked))
  }

  async function handleDelete(wid: string) {
    if (!confirm('Smazat tento záznam?')) return
    await deleteWorklog(wid)
    load()
  }

  async function toggleStatus() {
    if (!contract) return
    const next = contract.status === 'active' ? 'ended' : 'active'
    await updateContract(id, { status: next })
    load()
  }

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>Loading...</div>
  )
  if (!contract) return (
    <div style={{ padding: 40, textAlign: 'center', color: '#e0457a' }}>Contract not found.</div>
  )

  const margin      = marginPercent(contract.mdRateClient, contract.mdRateContractor)
  const marginColor = margin >= 30 ? '#00a87a' : margin >= 15 ? '#f59e0b' : '#e0457a'
  const totalRevenue = worklogs.reduce((s, w) => s + w.revenue, 0)
  const totalCost    = worklogs.reduce((s, w) => s + w.cost, 0)
  const totalProfit  = worklogs.reduce((s, w) => s + w.profit, 0)
  const totalDays    = worklogs.reduce((s, w) => s + w.daysWorked, 0)

  return (
    <div>
      {/* Back */}
      <Link href="/bodyshop" style={{ fontSize: '0.78rem', color: 'var(--text-dim)', textDecoration: 'none', display: 'inline-block', marginBottom: 20 }}>
        ← Back to Bodyshop
      </Link>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: 'var(--text)' }}>
            {contract.contractorName}
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: 4 }}>
            {contract.clientName} · started {new Date(contract.startDate).toLocaleDateString('en-GB')}
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowEdit(true)}
            style={{
              padding: '8px 16px', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
            }}
          >
            Edit Contract
          </button>
          <button
            onClick={toggleStatus}
            style={{
              padding: '8px 16px', borderRadius: 9, border: '1px solid var(--card-border)',
              background: 'white', cursor: 'pointer', fontSize: '0.78rem', fontWeight: 600,
              color: contract.status === 'active' ? '#e0457a' : '#00a87a',
            }}
          >
            {contract.status === 'active' ? 'End Contract' : 'Reactivate'}
          </button>
        </div>
      </div>

      {/* Contract info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'MD Cost',    value: formatCurrency(contract.mdRateContractor, contract.currency), color: '#e0457a' },
          { label: 'MD Rate',    value: formatCurrency(contract.mdRateClient,    contract.currency), color: '#0091c7' },
          { label: 'Margin',     value: `${margin} %`,                                               color: marginColor },
          { label: 'Status',     value: contract.status === 'active' ? 'Active' : 'Ended',           color: contract.status === 'active' ? '#00a87a' : 'var(--text-dim)' },
        ].map(k => (
          <div key={k.label} className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 5, letterSpacing: '0.06em' }}>
              {k.label.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.2rem', color: k.color }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Order & invoice info */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: contract.managerName ? 12 : 28 }}>
        {[
          {
            label: 'Order Duration',
            value: contract.endDate
              ? `${new Date(contract.startDate).toLocaleDateString('en-GB')} – ${new Date(contract.endDate).toLocaleDateString('en-GB')}`
              : `from ${new Date(contract.startDate).toLocaleDateString('en-GB')}`,
            color: 'var(--text)',
          },
          {
            label: 'Invoice terms — contractor',
            value: contract.invoiceDaysContractor ? `${contract.invoiceDaysContractor} days` : '—',
            color: '#6b46a8',
          },
          {
            label: 'Invoice terms — client',
            value: contract.invoiceDaysClient ? `${contract.invoiceDaysClient} days` : '—',
            color: '#0091c7',
          },
          { label: '', value: '', color: 'transparent' },
        ].map(k => (
          <div key={k.label} className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 5, letterSpacing: '0.06em' }}>
              {k.label.toUpperCase()}
            </div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: k.color }}>
              {k.value}
            </div>
          </div>
        ))}
      </div>

      {/* Manager info */}
      {contract.managerName && (
        <div className="glass-card" style={{ padding: '14px 20px', marginBottom: 28, display: 'flex', alignItems: 'center', gap: 16 }}>
          <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em' }}>MANAGER</div>
          <div style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text)' }}>{contract.managerName}</div>
          {contract.managerRole && (
            <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{contract.managerRole}</div>
          )}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 20 }}>
        {/* Worklogs table */}
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--card-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)' }}>
              Worked Days
            </span>
            <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
              Total {totalDays} MD · profit {formatCurrency(totalProfit, contract.currency)}
            </span>
          </div>

          {worklogs.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              No records yet. Add the first monthly report.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,168,122,0.04)' }}>
                  {['Month', 'Days', 'Revenue', 'Costs', 'Profit', ''].map(h => (
                    <th key={h} style={{
                      padding: '9px 16px', textAlign: 'left', fontSize: '0.68rem',
                      color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em',
                      borderBottom: '1px solid var(--card-border)',
                    }}>
                      {h.toUpperCase()}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {worklogs.map((w, i) => (
                  <tr key={w.id} style={{ borderBottom: i < worklogs.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                    <td style={{ padding: '11px 16px', fontSize: '0.82rem', color: 'var(--text)', fontWeight: 500 }}>
                      {monthLabel(w.month)}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {w.daysWorked}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.82rem', color: '#0091c7' }}>
                      {formatCurrency(w.revenue, contract.currency)}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.82rem', color: '#e0457a' }}>
                      {formatCurrency(w.cost, contract.currency)}
                    </td>
                    <td style={{ padding: '11px 16px', fontSize: '0.82rem', fontWeight: 700, color: '#00a87a' }}>
                      {formatCurrency(w.profit, contract.currency)}
                    </td>
                    <td style={{ padding: '11px 16px', display: 'flex', gap: 10 }}>
                      <button onClick={() => startEdit(w)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(w.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#e0457a', fontWeight: 600 }}>
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
              {/* Totals */}
              <tfoot>
                <tr style={{ background: 'rgba(0,168,122,0.04)', borderTop: '2px solid var(--card-border)' }}>
                  <td style={{ padding: '11px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>TOTAL</td>
                  <td style={{ padding: '11px 16px', fontSize: '0.78rem', fontWeight: 700, color: 'var(--text)' }}>{totalDays}</td>
                  <td style={{ padding: '11px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#0091c7' }}>{formatCurrency(totalRevenue, contract.currency)}</td>
                  <td style={{ padding: '11px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#e0457a' }}>{formatCurrency(totalCost, contract.currency)}</td>
                  <td style={{ padding: '11px 16px', fontSize: '0.78rem', fontWeight: 700, color: '#00a87a' }}>{formatCurrency(totalProfit, contract.currency)}</td>
                  <td />
                </tr>
              </tfoot>
            </table>
          )}
        </div>

        {/* Add worklog form */}
        <div className="glass-card" style={{ padding: '20px 22px', alignSelf: 'start' }}>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 18 }}>
            {editId ? 'Edit Report' : 'Add Report'}
          </div>
          <form onSubmit={handleSaveWorklog} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: 5, letterSpacing: '0.06em' }}>
                MONTH
              </label>
              <input
                type="month"
                value={wMonth}
                onChange={e => setWMonth(e.target.value)}
                required
                style={inputStyle}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: 5, letterSpacing: '0.06em' }}>
                WORKED DAYS (MD)
              </label>
              <input
                type="number"
                min="0"
                max="31"
                step="any"
                value={wDays}
                onChange={e => setWDays(e.target.value)}
                placeholder="e.g. 20"
                required
                style={inputStyle}
              />
            </div>

            {wDays && (
              <div style={{ background: 'rgba(0,168,122,0.06)', borderRadius: 9, padding: '12px 14px', fontSize: '0.78rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Revenue</span>
                  <span style={{ color: '#0091c7', fontWeight: 600 }}>
                    {formatCurrency(Number(wDays) * contract.mdRateClient, contract.currency)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ color: 'var(--text-dim)' }}>Costs</span>
                  <span style={{ color: '#e0457a', fontWeight: 600 }}>
                    {formatCurrency(Number(wDays) * contract.mdRateContractor, contract.currency)}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--card-border)', paddingTop: 6, marginTop: 4 }}>
                  <span style={{ color: 'var(--text)', fontWeight: 700 }}>Profit</span>
                  <span style={{ color: '#00a87a', fontWeight: 700 }}>
                    {formatCurrency(Number(wDays) * (contract.mdRateClient - contract.mdRateContractor), contract.currency)}
                  </span>
                </div>
              </div>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                type="submit"
                disabled={wSaving}
                style={{
                  flex: 1, padding: '10px', borderRadius: 9, border: 'none',
                  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
                  color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  fontSize: '0.85rem', cursor: wSaving ? 'not-allowed' : 'pointer',
                  opacity: wSaving ? 0.7 : 1,
                }}
              >
                {wSaving ? 'Saving...' : editId ? 'Save' : 'Add'}
              </button>
              {editId && (
                <button
                  type="button"
                  onClick={() => { setEditId(undefined); setWDays('') }}
                  style={{
                    padding: '10px 14px', borderRadius: 9,
                    border: '1px solid var(--card-border)', background: 'white',
                    cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text-muted)',
                  }}
                >
                  Cancel
                </button>
              )}
            </div>
          </form>
        </div>
      </div>

      {showEdit && (
        <EditContractModal
          contract={contract}
          onClose={() => setShowEdit(false)}
          onSaved={() => { setShowEdit(false); load() }}
        />
      )}
    </div>
  )
}

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 9,
  border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(240,250,248,0.8)',
  fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text)', outline: 'none',
}
