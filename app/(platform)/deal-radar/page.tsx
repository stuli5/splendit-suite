'use client'

import { useEffect, useState } from 'react'
import { getDeals, createDeal, updateDeal, deleteDeal, estimatedFee, weightedFee, formatFee } from '@/lib/deals'
import { getCompanies } from '@/lib/companies'
import type { Deal, DealStage, Company } from '@/lib/types'

// ── Stage config ──────────────────────────────────────────────────────────────

const STAGES: { key: DealStage; label: string; color: string }[] = [
  { key: 'lead',      label: 'Lead',       color: '#7ab8ae' },
  { key: 'qualified', label: 'Qualified',  color: '#0091c7' },
  { key: 'proposal',  label: 'Proposal',   color: '#6b46a8' },
  { key: 'search',    label: 'Search',     color: '#f59e0b' },
  { key: 'offer',     label: 'Offer',      color: '#00a87a' },
  { key: 'won',       label: 'Won ✓',      color: '#00c47a' },
  { key: 'lost',      label: 'Lost',       color: '#e0457a' },
]

const STAGE_MAP = Object.fromEntries(STAGES.map(s => [s.key, s])) as Record<DealStage, typeof STAGES[0]>

// ── Deal Form Modal ───────────────────────────────────────────────────────────

function DealModal({
  deal,
  companies,
  onClose,
  onSaved,
}: {
  deal?: Deal
  companies: Company[]
  onClose: () => void
  onSaved: () => void
}) {
  const [title,         setTitle]         = useState(deal?.title ?? '')
  const [companyName,   setCompanyName]   = useState(deal?.companyName ?? '')
  const [companyId,     setCompanyId]     = useState(deal?.companyId ?? '')
  const [stage,         setStage]         = useState<DealStage>(deal?.stage ?? 'lead')
  const [feeType,       setFeeType]       = useState<'percentage' | 'fixed'>(deal?.feeType ?? 'percentage')
  const [feeValue,      setFeeValue]      = useState(String(deal?.feeValue ?? 18))
  const [salaryCzk,     setSalaryCzk]     = useState(String(deal?.salaryCzk ?? ''))
  const [currency,      setCurrency]      = useState<'CZK' | 'EUR'>(deal?.currency ?? 'CZK')
  const [probability,   setProbability]   = useState(String(deal?.probability ?? 50))
  const [expectedClose, setExpectedClose] = useState(deal?.expectedClose ?? '')
  const [responsible,   setResponsible]   = useState(deal?.responsible ?? '')
  const [note,          setNote]          = useState(deal?.note ?? '')
  const [saving,        setSaving]        = useState(false)
  const [companyQuery,  setCompanyQuery]  = useState(deal?.companyName ?? '')
  const [showSugg,      setShowSugg]      = useState(false)

  const companySugg = companies.filter(c =>
    companyQuery.length > 0 && c.name.toLowerCase().includes(companyQuery.toLowerCase())
  ).slice(0, 6)

  async function handleSave() {
    if (!title.trim() || !companyName.trim()) return
    setSaving(true)
    const data = {
      title:        title.trim(),
      companyName:  companyName.trim(),
      stage, feeType,
      feeValue:     Number(feeValue) || 0,
      currency,
      probability:  Math.min(100, Math.max(0, Number(probability) || 0)),
      ...(companyId  ? { companyId }  : {}),
      ...(salaryCzk  ? { salaryCzk: Number(salaryCzk) } : {}),
      ...(expectedClose.trim() ? { expectedClose: expectedClose.trim() } : {}),
      ...(responsible.trim()   ? { responsible: responsible.trim() }   : {}),
      ...(note.trim()          ? { note: note.trim() }                 : {}),
    }
    if (deal) {
      await updateDeal(deal.id, data)
    } else {
      await createDeal(data)
    }
    setSaving(false)
    onSaved()
  }

  const inpStyle = {
    width: '100%', padding: '9px 12px', borderRadius: 8,
    border: '1px solid rgba(0,168,122,0.25)', background: 'rgba(255,255,255,0.9)',
    fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
    color: 'var(--text)', outline: 'none', boxSizing: 'border-box' as const,
  }
  const labelStyle = { fontSize: '0.68rem', color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.05em', display: 'block', marginBottom: 5 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'var(--bg)', borderRadius: 16, padding: 32, width: 540, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--text)' }}>
            {deal ? 'Edit Deal' : 'New Deal'}
          </span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1.2rem', color: 'var(--text-dim)' }}>✕</button>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {/* Position */}
          <div>
            <label style={labelStyle}>POSITION TITLE *</label>
            <input style={inpStyle} value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Senior React Developer" />
          </div>

          {/* Company autocomplete */}
          <div style={{ position: 'relative' }}>
            <label style={labelStyle}>COMPANY *</label>
            <input
              style={inpStyle}
              value={companyQuery}
              onChange={e => { setCompanyQuery(e.target.value); setCompanyName(e.target.value); setCompanyId(''); setShowSugg(true) }}
              onFocus={() => setShowSugg(true)}
              onBlur={() => setTimeout(() => setShowSugg(false), 150)}
              placeholder="Start typing company name..."
            />
            {showSugg && companySugg.length > 0 && (
              <div style={{
                position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 10,
                background: 'white', border: '1px solid rgba(0,168,122,0.2)',
                borderRadius: 8, boxShadow: '0 8px 24px rgba(0,0,0,0.12)', marginTop: 2,
              }}>
                {companySugg.map(c => (
                  <div
                    key={c.id}
                    onMouseDown={() => { setCompanyQuery(c.name); setCompanyName(c.name); setCompanyId(c.id); setShowSugg(false) }}
                    style={{ padding: '9px 14px', cursor: 'pointer', fontSize: '0.82rem', color: 'var(--text)', borderBottom: '1px solid rgba(0,0,0,0.04)' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,168,122,0.06)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {c.name}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Stage + Probability row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>STAGE</label>
              <select style={inpStyle} value={stage} onChange={e => setStage(e.target.value as DealStage)}>
                {STAGES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </div>
            <div>
              <label style={labelStyle}>PROBABILITY (%)</label>
              <input style={inpStyle} type="number" min={0} max={100} value={probability} onChange={e => setProbability(e.target.value)} />
            </div>
          </div>

          {/* Fee row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>FEE TYPE</label>
              <select style={inpStyle} value={feeType} onChange={e => setFeeType(e.target.value as 'percentage' | 'fixed')}>
                <option value="percentage">% of salary</option>
                <option value="fixed">Fixed fee</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>{feeType === 'percentage' ? 'FEE (%)' : 'FEE AMOUNT'}</label>
              <input style={inpStyle} type="number" min={0} value={feeValue} onChange={e => setFeeValue(e.target.value)} placeholder={feeType === 'percentage' ? '18' : '0'} />
            </div>
            <div>
              <label style={labelStyle}>CURRENCY</label>
              <select style={inpStyle} value={currency} onChange={e => setCurrency(e.target.value as 'CZK' | 'EUR')}>
                <option value="CZK">CZK</option>
                <option value="EUR">EUR</option>
              </select>
            </div>
          </div>

          {/* Annual salary (for % deals) */}
          {feeType === 'percentage' && (
            <div>
              <label style={labelStyle}>EST. ANNUAL SALARY (for fee calculation)</label>
              <input style={inpStyle} type="number" min={0} value={salaryCzk} onChange={e => setSalaryCzk(e.target.value)} placeholder="e.g. 1200000" />
            </div>
          )}

          {/* Expected close + Responsible */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <div>
              <label style={labelStyle}>EXPECTED CLOSE</label>
              <input style={inpStyle} type="date" value={expectedClose} onChange={e => setExpectedClose(e.target.value)} />
            </div>
            <div>
              <label style={labelStyle}>RESPONSIBLE</label>
              <input style={inpStyle} value={responsible} onChange={e => setResponsible(e.target.value)} placeholder="Name..." />
            </div>
          </div>

          {/* Note */}
          <div>
            <label style={labelStyle}>NOTE</label>
            <textarea
              style={{ ...inpStyle, resize: 'vertical', minHeight: 70 }}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder="Additional notes..."
            />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button
            onClick={handleSave}
            disabled={saving || !title.trim() || !companyName.trim()}
            style={{
              flex: 1, padding: '11px 0', borderRadius: 9, border: 'none',
              background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
              color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '0.85rem', cursor: saving ? 'not-allowed' : 'pointer',
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving ? 'Saving...' : (deal ? 'Save Changes' : 'Create Deal')}
          </button>
          <button
            onClick={onClose}
            style={{
              padding: '11px 20px', borderRadius: 9,
              border: '1px solid var(--card-border)', background: 'transparent',
              color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  )
}

// ── Deal Card ─────────────────────────────────────────────────────────────────

function DealCard({
  deal,
  onEdit,
  onDelete,
  onDragStart,
}: {
  deal: Deal
  onEdit: () => void
  onDelete: () => void
  onDragStart: () => void
}) {
  const fee  = estimatedFee(deal)
  const wFee = weightedFee(deal)

  return (
    <div
      draggable
      onDragStart={onDragStart}
      className="glass-card"
      style={{
        padding: '14px 16px', marginBottom: 8, cursor: 'grab',
        borderLeft: `3px solid ${STAGE_MAP[deal.stage].color}`,
      }}
    >
      <div style={{ fontWeight: 700, fontSize: '0.82rem', color: 'var(--text)', marginBottom: 4 }}>
        {deal.title}
      </div>
      <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginBottom: 10 }}>
        {deal.companyName}
      </div>

      {fee > 0 && (
        <div style={{ display: 'flex', gap: 8, marginBottom: 10, flexWrap: 'wrap' }}>
          <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: '#00a87a', fontWeight: 700 }}>
            {formatFee(fee, deal.currency)}
          </span>
          {deal.probability < 100 && (
            <span style={{ fontSize: '0.7rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>
              → weighted {formatFee(wFee, deal.currency)}
            </span>
          )}
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <span style={{
            fontSize: '0.65rem', fontWeight: 700, padding: '2px 8px', borderRadius: 20,
            background: `${STAGE_MAP[deal.stage].color}20`, color: STAGE_MAP[deal.stage].color,
          }}>
            {deal.probability}%
          </span>
          {deal.expectedClose && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', padding: '2px 6px' }}>
              {new Date(deal.expectedClose).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
            </span>
          )}
          {deal.responsible && (
            <span style={{ fontSize: '0.65rem', color: 'var(--text-dim)', padding: '2px 6px' }}>
              {deal.responsible}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={e => { e.stopPropagation(); onEdit() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: 'var(--primary)', fontWeight: 600 }}>Edit</button>
          <button onClick={e => { e.stopPropagation(); onDelete() }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.72rem', color: '#e0457a', fontWeight: 600 }}>✕</button>
        </div>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function DealRadarPage() {
  const [deals,     setDeals]     = useState<Deal[]>([])
  const [companies, setCompanies] = useState<Company[]>([])
  const [loading,   setLoading]   = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [editing,   setEditing]   = useState<Deal | undefined>()
  const [dragId,    setDragId]    = useState<string | null>(null)
  const [dragOver,  setDragOver]  = useState<DealStage | null>(null)
  const [view,      setView]      = useState<'kanban' | 'list'>('kanban')

  async function load() {
    const [d, c] = await Promise.all([getDeals(), getCompanies()])
    setDeals(d)
    setCompanies(c)
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDrop(stage: DealStage) {
    if (!dragId || dragId === stage) return
    const deal = deals.find(d => d.id === dragId)
    if (!deal || deal.stage === stage) return
    setDeals(prev => prev.map(d => d.id === dragId ? { ...d, stage } : d))
    await updateDeal(dragId, { stage })
    setDragId(null)
    setDragOver(null)
  }

  async function handleDelete(deal: Deal) {
    if (!confirm(`Delete deal "${deal.title}"?`)) return
    await deleteDeal(deal.id)
    setDeals(prev => prev.filter(d => d.id !== deal.id))
  }

  // Stats
  const activeDeals   = deals.filter(d => d.stage !== 'lost')
  const totalPipeline = activeDeals.reduce((s, d) => s + estimatedFee(d), 0)
  const weighted      = activeDeals.reduce((s, d) => s + weightedFee(d), 0)
  const wonDeals      = deals.filter(d => d.stage === 'won')
  const wonRevenue    = wonDeals.reduce((s, d) => s + estimatedFee(d), 0)

  const dealsByStage = (stage: DealStage) => deals.filter(d => d.stage === stage)

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
            📡 Deal Radar
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Recruitment pipeline & revenue tracking
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <div style={{ display: 'flex', borderRadius: 9, overflow: 'hidden', border: '1px solid var(--card-border)' }}>
            {(['kanban', 'list'] as const).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '8px 16px', border: 'none', cursor: 'pointer',
                  background: view === v ? 'rgba(0,168,122,0.12)' : 'transparent',
                  color: view === v ? 'var(--primary)' : 'var(--text-muted)',
                  fontFamily: 'JetBrains Mono, monospace', fontSize: '0.75rem', fontWeight: view === v ? 700 : 400,
                }}
              >
                {v === 'kanban' ? '⊞ Kanban' : '≡ List'}
              </button>
            ))}
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
            + New Deal
          </button>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {[
          { label: 'Active Deals',    value: String(activeDeals.length),    color: '#0091c7' },
          { label: 'Total Pipeline',  value: formatFee(totalPipeline, 'CZK'), color: '#6b46a8' },
          { label: 'Weighted',        value: formatFee(weighted, 'CZK'),      color: '#f59e0b' },
          { label: 'Won This Year',   value: formatFee(wonRevenue, 'CZK'),    color: '#00a87a' },
        ].map(s => (
          <div key={s.label} className="glass-card" style={{ padding: '16px 18px' }}>
            <div style={{ fontSize: '0.68rem', color: 'var(--text-dim)', marginBottom: 6, letterSpacing: '0.06em' }}>{s.label.toUpperCase()}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', color: 'var(--text-dim)', padding: 60, fontSize: '0.82rem' }}>Loading...</div>
      ) : view === 'kanban' ? (
        /* ── Kanban view ──────────────────────────────────────────────────── */
        <div style={{ display: 'flex', gap: 12, overflowX: 'auto', paddingBottom: 16 }}>
          {STAGES.map(stage => {
            const stageDeal = dealsByStage(stage.key)
            const stageTotal = stageDeal.reduce((s, d) => s + estimatedFee(d), 0)
            const isDragTarget = dragOver === stage.key

            return (
              <div
                key={stage.key}
                onDragOver={e => { e.preventDefault(); setDragOver(stage.key) }}
                onDragLeave={() => setDragOver(null)}
                onDrop={() => handleDrop(stage.key)}
                style={{
                  minWidth: 220, flex: '0 0 220px',
                  background: isDragTarget ? `${stage.color}12` : 'rgba(255,255,255,0.4)',
                  borderRadius: 12, padding: '14px 12px',
                  border: `1.5px solid ${isDragTarget ? stage.color : 'var(--card-border)'}`,
                  transition: 'all 0.15s',
                }}
              >
                {/* Column header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                  <div>
                    <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.8rem', color: stage.color }}>
                      {stage.label}
                    </span>
                    <span style={{
                      marginLeft: 8, fontSize: '0.65rem', fontWeight: 700,
                      background: `${stage.color}20`, color: stage.color,
                      padding: '2px 7px', borderRadius: 20,
                    }}>
                      {stageDeal.length}
                    </span>
                  </div>
                  {stageTotal > 0 && (
                    <span style={{ fontSize: '0.65rem', fontFamily: 'JetBrains Mono, monospace', color: 'var(--text-dim)' }}>
                      {formatFee(stageTotal, 'CZK')}
                    </span>
                  )}
                </div>

                {/* Cards */}
                {stageDeal.map(deal => (
                  <DealCard
                    key={deal.id}
                    deal={deal}
                    onEdit={() => { setEditing(deal); setShowModal(true) }}
                    onDelete={() => handleDelete(deal)}
                    onDragStart={() => setDragId(deal.id)}
                  />
                ))}

                {stageDeal.length === 0 && (
                  <div style={{ padding: '20px 0', textAlign: 'center', fontSize: '0.72rem', color: 'var(--text-dim)', opacity: 0.6 }}>
                    Drop here
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        /* ── List view ────────────────────────────────────────────────────── */
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ background: 'rgba(0,168,122,0.04)' }}>
                {['Position', 'Company', 'Stage', 'Fee', 'Probability', 'Close Date', 'Responsible', ''].map(h => (
                  <th key={h} style={{
                    padding: '10px 16px', textAlign: 'left', fontSize: '0.65rem',
                    color: 'var(--text-dim)', fontWeight: 600, letterSpacing: '0.06em',
                    borderBottom: '1px solid var(--card-border)',
                  }}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {deals.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
                    No deals yet. Click "+ New Deal" to start tracking.
                  </td>
                </tr>
              ) : deals.map((deal, i) => {
                const fee = estimatedFee(deal)
                const s   = STAGE_MAP[deal.stage]
                return (
                  <tr key={deal.id} style={{ borderBottom: i < deals.length - 1 ? '1px solid var(--card-border)' : 'none' }}>
                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
                      {deal.title}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
                      {deal.companyName}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{
                        fontSize: '0.72rem', fontWeight: 600, padding: '3px 10px', borderRadius: 20,
                        background: `${s.color}18`, color: s.color,
                      }}>
                        {s.label}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', fontFamily: 'JetBrains Mono, monospace', color: fee > 0 ? '#00a87a' : 'var(--text-dim)', fontWeight: 600 }}>
                      {fee > 0 ? formatFee(fee, deal.currency) : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {deal.probability}%
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {deal.expectedClose ? new Date(deal.expectedClose).toLocaleDateString('en-GB') : '—'}
                    </td>
                    <td style={{ padding: '12px 16px', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      {deal.responsible || '—'}
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button onClick={() => { setEditing(deal); setShowModal(true) }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--primary)', fontWeight: 600 }}>
                          Edit
                        </button>
                        <button onClick={() => handleDelete(deal)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.75rem', color: '#e0457a', fontWeight: 600 }}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <DealModal
          deal={editing}
          companies={companies}
          onClose={() => setShowModal(false)}
          onSaved={() => { setShowModal(false); load() }}
        />
      )}
    </div>
  )
}
