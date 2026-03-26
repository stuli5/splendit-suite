'use client'

import { useEffect, useRef, useState } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getCRMCandidates, deleteCRMCandidate } from '@/lib/crm-candidates'
import type { CRMCandidate, CRMStage } from '@/lib/types'
import CandidateModal  from '@/components/crm-candidates/CandidateModal'
import CandidateDetail from '@/components/crm-candidates/CandidateDetail'
import CandidateKanban from '@/components/crm-candidates/CandidateKanban'

const STAGE_COLORS: Record<CRMStage, string> = {
  new:       '#6b7280',
  screening: '#0091c7',
  interview: '#6b46a8',
  offer:     '#00a87a',
}

function linkedInUrl(raw: string): string {
  if (raw.startsWith('http')) return raw
  return `https://linkedin.com/in/${raw.replace(/^.*linkedin\.com\/in\//i, '').replace(/\/$/, '')}`
}

function gitHubUrl(raw: string): string {
  if (raw.startsWith('http')) return raw
  return `https://github.com/${raw.replace(/^.*github\.com\//i, '').replace(/\/$/, '')}`
}

// ── Recru tag parsing ─────────────────────────────────────────────────────────
const KNOWN_MULTIWORD_TAGS = [
  'Anglický jazyk', 'Chorvatský jazyk', 'Ruský jazyk', 'Ukrajinský jazyk',
  'Německý jazyk', 'Francouzský jazyk', 'Španělský jazyk', 'Italský jazyk',
  'Polský jazyk', 'Slovenský jazyk', 'Český jazyk',
  '.NET Framework', 'Full Stack vývojář', 'Full Stack Developer',
  'Administrace MySQL', 'Internet Information Services',
  'Microsoft Access', 'Microsoft SQL Server', 'Microsoft Azure',
  'Windows Presentation Foundation', 'Windows Forms',
  'Umělá inteligence', 'Strojové učení',
  'Node.js', 'Vue.js', 'Next.js', 'Nuxt.js', 'React Native', 'React.js',
  'Spring Boot', 'Spring Framework', 'Entity Framework', 'ASP.NET Core', 'ASP.NET',
  'Amazon Web Services', 'Google Cloud', 'Azure DevOps', 'Machine Learning', 'Deep Learning',
  'Scrum Master', 'Product Owner', 'Project Manager',
]

function parseRecruTags(raw: unknown): string[] {
  if (!raw) return []
  const str = String(raw).trim()
  if (!str) return []
  if (str.includes(',')) return str.split(',').map(t => t.trim()).filter(Boolean)

  const result: string[] = []
  let remaining = str
  const sorted = [...KNOWN_MULTIWORD_TAGS].sort((a, b) => b.length - a.length)
  for (const tag of sorted) {
    if (remaining.includes(tag)) {
      result.push(tag)
      remaining = remaining.split(tag).join(' ').replace(/\s+/g, ' ').trim()
    }
  }
  for (const word of remaining.split(' ').map(w => w.trim()).filter(Boolean)) {
    result.push(word)
  }
  return result
}

interface ImportResult { ok: number; fail: number; total: number }

type SortKey = 'name' | 'date'
type View    = 'table' | 'kanban'

export default function CandidatesPage() {
  const [candidates,   setCandidates]   = useState<CRMCandidate[]>([])
  const [loading,      setLoading]      = useState(true)
  const [search,       setSearch]       = useState('')
  const [stageFilter,  setStageFilter]  = useState<CRMStage | 'all'>('all')
  const [sortKey,      setSortKey]      = useState<SortKey>('date')
  const [view,         setView]         = useState<View>('table')
  const [showModal,    setShowModal]    = useState(false)
  const [editing,      setEditing]      = useState<CRMCandidate | undefined>()
  const [detail,       setDetail]       = useState<CRMCandidate | undefined>()
  const [importing,    setImporting]    = useState(false)
  const [importResult, setImportResult] = useState<ImportResult | null>(null)
  const [selected,     setSelected]     = useState<Set<string>>(new Set())
  const importInputRef = useRef<HTMLInputElement>(null)

  async function load() {
    setLoading(true)
    setCandidates(await getCRMCandidates())
    setLoading(false)
  }

  useEffect(() => { load() }, [])

  async function handleDelete(c: CRMCandidate) {
    if (!confirm(`Delete candidate "${c.firstName} ${c.lastName}"?`)) return
    await deleteCRMCandidate(c.id)
    setDetail(undefined)
    load()
  }

  function openEdit(c: CRMCandidate) {
    setDetail(undefined)
    setEditing(c)
    setShowModal(true)
  }

  function handleStageChange(c: CRMCandidate, stage: CRMStage) {
    setCandidates(prev => prev.map(x => x.id === c.id ? { ...x, stage } : x))
    if (detail?.id === c.id) setDetail({ ...c, stage })
  }

  async function handleBulkDelete() {
    if (selected.size === 0) return
    if (!confirm(`Delete ${selected.size} selected candidate${selected.size > 1 ? 's' : ''}?`)) return
    await Promise.all([...selected].map(id => deleteCRMCandidate(id)))
    setSelected(new Set())
    load()
  }

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (filtered.every(c => selected.has(c.id))) {
      setSelected(new Set())
    } else {
      setSelected(new Set(filtered.map(c => c.id)))
    }
  }

  function parseCsvBuffer(buffer: ArrayBuffer): Record<string, unknown>[] {
    const bytes = new Uint8Array(buffer)
    let text: string
    if (bytes[0] === 0xff && bytes[1] === 0xfe) {
      text = new TextDecoder('utf-16le').decode(buffer)
    } else if (bytes[0] === 0xfe && bytes[1] === 0xff) {
      text = new TextDecoder('utf-16be').decode(buffer)
    } else {
      text = new TextDecoder('utf-8').decode(buffer)
    }
    // Strip BOM character that TextDecoder may leave at the start
    text = text.replace(/^\uFEFF/, '')

    const allLines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')
    if (allLines.length < 2) return []

    const sep = allLines[0].includes('\t') ? '\t' : ','
    const clean = (s: string) => s.trim().replace(/^"|"$/g, '')
    const headers = allLines[0].split(sep).map(clean)
    const minTabs = headers.length - 1
    // Only keep rows that have the expected number of separators (skip note continuation lines)
    const lines = allLines.filter(l => l.split(sep).length >= minTabs)

    console.log('[recru-import] encoding used:', bytes[0] === 0xff && bytes[1] === 0xfe ? 'utf-16le' : bytes[0] === 0xfe && bytes[1] === 0xff ? 'utf-16be' : 'utf-8')
    console.log('[recru-import] lines found:', lines.length, '| sep:', sep === '\t' ? 'TAB' : 'COMMA')
    console.log('[recru-import] headers:', headers)
    console.log('[recru-import] header[0] charCodes:', [...headers[0]].map(c => c.charCodeAt(0)))

    return lines.slice(1).map(line => {
      const cols = line.split(sep).map(clean)
      return Object.fromEntries(headers.map((h, i) => [h, cols[i] ?? '']))
    })
  }

  async function handleRecruImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setImporting(true)
    setImportResult(null)

    try {
      const buffer = await file.arrayBuffer()
      let rows: Record<string, unknown>[]

      console.log('[recru-import] file:', file.name, 'size:', file.size)

      if (file.name.toLowerCase().endsWith('.csv')) {
        rows = parseCsvBuffer(buffer)
        console.log('[recru-import] parsed CSV rows:', rows.length, 'first:', rows[0])
      } else {
        const _xlsx = await import('xlsx')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const XLSX  = (_xlsx as any).default ?? _xlsx
        const wb    = XLSX.read(buffer, { type: 'array' })
        rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as Record<string, unknown>[]
      }

      let ok = 0; let fail = 0

      for (const row of rows) {
        const firstName = String(row['Jméno'] ?? '').trim()
        const lastName  = String(row['Příjmení'] ?? '').trim()
        if (!firstName && !lastName) continue

        const city    = String(row['Město'] ?? '').trim()
        const country = String(row['Země'] ?? '').trim()
        const notes   = String(row['Poznámky'] ?? '').trim()
        const location = [city, country].filter(Boolean).join(', ')
        const note    = [notes, location ? `Lokalita: ${location}` : ''].filter(Boolean).join('\n') || undefined
        const skills  = parseRecruTags(row['Tagy'])

        const rawPhone = String(row['Telefon'] ?? '').trim().replace(/\s+/g, '')
        const phone = rawPhone
          ? (rawPhone.startsWith('+') ? rawPhone : `+${rawPhone}`)
          : undefined

        const candidate = {
          firstName,
          lastName,
          position:  String(row['Pozice'] ?? '').trim(),
          email:     String(row['Email'] ?? '').trim() || undefined,
          phone,
          note,
          skills:    skills.length ? skills : undefined,
          recruId:   String(row['ID'] ?? '').trim() || undefined,
          createdAt: Date.now(),
        }

        const doc = Object.fromEntries(Object.entries(candidate).filter(([, v]) => v !== undefined))
        try {
          await addDoc(collection(db, 'crmCandidates'), doc)
          ok++
        } catch (err) {
          console.error('[recru-import] addDoc failed:', err, 'candidate:', candidate)
          fail++
        }
      }

      setImportResult({ ok, fail, total: rows.length })
      load()
    } catch (err) {
      console.error('[recru-import]', err)
      alert('Failed to parse the file. Make sure it is a valid Recru XLSX or CSV export.')
    } finally {
      setImporting(false)
    }
  }

  const filtered = candidates
    .filter(c => {
      const q = search.toLowerCase()
      const matchesSearch = (
        c.firstName.toLowerCase().includes(q) ||
        c.lastName.toLowerCase().includes(q)  ||
        c.position.toLowerCase().includes(q)  ||
        (c.email?.toLowerCase().includes(q) ?? false)
      )
      const matchesStage = stageFilter === 'all' || (c.stage ?? 'new') === stageFilter
      return matchesSearch && matchesStage
    })
    .sort((a, b) => {
      if (sortKey === 'name') return `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`)
      return b.createdAt - a.createdAt
    })

  const ALL_STAGES: CRMStage[] = ['new', 'screening', 'interview', 'offer']

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
            👤 Candidates
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
            CRM — candidate profiles & pipeline
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          {/* View toggle */}
          <div style={{
            display: 'flex', borderRadius: 9,
            border: '1px solid rgba(0,168,122,0.2)',
            overflow: 'hidden',
          }}>
            {(['table', 'kanban'] as View[]).map(v => (
              <button
                key={v}
                onClick={() => setView(v)}
                style={{
                  padding: '8px 14px', border: 'none', cursor: 'pointer',
                  background: view === v ? 'var(--primary)' : 'transparent',
                  color: view === v ? 'white' : 'var(--text-dim)',
                  fontSize: '0.75rem', fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  transition: 'all 0.15s', textTransform: 'capitalize',
                }}
              >
                {v === 'table' ? '☰ Table' : '⊞ Kanban'}
              </button>
            ))}
          </div>
            <input
            ref={importInputRef}
            type="file"
            accept=".xlsx,.csv"
            onChange={handleRecruImport}
            style={{ display: 'none' }}
          />
          <button
            onClick={() => importInputRef.current?.click()}
            disabled={importing}
            style={{
              padding: '10px 18px', borderRadius: 9,
              border: '1.5px solid rgba(0,145,199,0.35)',
              background: importing ? 'rgba(0,145,199,0.06)' : 'rgba(0,145,199,0.08)',
              color: '#0091c7', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '0.85rem', cursor: importing ? 'not-allowed' : 'pointer',
            }}
          >
            {importing ? '⏳ Importing...' : '↑ Import Recru'}
          </button>
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
      </div>

      {/* Import result banner */}
      {importResult && (
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '12px 18px', marginBottom: 16, borderRadius: 9,
          background: importResult.fail === 0 ? 'rgba(0,168,122,0.08)' : 'rgba(240,70,122,0.08)',
          border: `1.5px solid ${importResult.fail === 0 ? 'rgba(0,168,122,0.25)' : 'rgba(240,70,122,0.25)'}`,
        }}>
          <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)' }}>
            {importResult.fail === 0
              ? `✓ Import complete — ${importResult.ok} candidates imported`
              : `Import done — ${importResult.ok} imported, ${importResult.fail} failed`}
          </span>
          <button
            onClick={() => setImportResult(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-dim)', fontSize: '0.8rem' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Filters row */}
      <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap', marginBottom: 20 }}>
        {/* Search */}
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search by name, position or email..."
          style={{
            padding: '9px 14px', borderRadius: 9,
            border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(255,255,255,0.85)',
            fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text)', outline: 'none', minWidth: 260,
          }}
        />

        {/* Stage pills */}
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            onClick={() => setStageFilter('all')}
            style={{
              padding: '6px 14px', borderRadius: 20,
              border: '1.5px solid rgba(0,168,122,0.3)',
              background: stageFilter === 'all' ? 'var(--primary)' : 'transparent',
              color: stageFilter === 'all' ? 'white' : 'var(--text-dim)',
              fontSize: '0.73rem', fontFamily: 'Syne, sans-serif', fontWeight: 700,
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            All
          </button>
          {ALL_STAGES.map(s => {
            const active = stageFilter === s
            return (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                style={{
                  padding: '6px 14px', borderRadius: 20,
                  border: `1.5px solid ${STAGE_COLORS[s]}`,
                  background: active ? STAGE_COLORS[s] : 'transparent',
                  color: active ? 'white' : STAGE_COLORS[s],
                  fontSize: '0.73rem', fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
                }}
              >
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            )
          })}
        </div>

        {/* Sort */}
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)', alignSelf: 'center' }}>Sort:</span>
          {(['date', 'name'] as SortKey[]).map(k => (
            <button
              key={k}
              onClick={() => setSortKey(k)}
              style={{
                padding: '5px 12px', borderRadius: 7,
                border: '1px solid rgba(0,168,122,0.2)',
                background: sortKey === k ? 'rgba(0,168,122,0.1)' : 'transparent',
                color: sortKey === k ? 'var(--primary)' : 'var(--text-dim)',
                fontSize: '0.72rem', fontFamily: 'JetBrains Mono, monospace',
                fontWeight: sortKey === k ? 700 : 400,
                cursor: 'pointer', transition: 'all 0.15s', textTransform: 'capitalize',
              }}
            >
              {k}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
          Loading...
        </div>
      ) : view === 'kanban' ? (
        <CandidateKanban
          candidates={filtered}
          onSelect={setDetail}
          onEdit={openEdit}
          onRefresh={load}
        />
      ) : (
        /* Table view */
        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <div style={{
            padding: '16px 24px', borderBottom: '1px solid var(--card-border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)' }}>
              Candidates
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {selected.size > 0 && (
                <button
                  onClick={handleBulkDelete}
                  style={{
                    padding: '6px 14px', borderRadius: 7,
                    border: '1.5px solid rgba(224,69,122,0.35)',
                    background: 'rgba(224,69,122,0.08)',
                    color: '#e0457a', fontFamily: 'Syne, sans-serif', fontWeight: 700,
                    fontSize: '0.78rem', cursor: 'pointer',
                  }}
                >
                  🗑 Delete {selected.size} selected
                </button>
              )}
              <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>{filtered.length} records</span>
            </div>
          </div>

          {filtered.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
              {candidates.length === 0
                ? 'No candidates yet. Click "+ Add Candidate" to add the first one.'
                : 'No results for the current filter.'}
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'rgba(0,168,122,0.04)' }}>
                  <th style={{ padding: '10px 12px 10px 20px', borderBottom: '1px solid var(--card-border)', width: 36 }}>
                    <input
                      type="checkbox"
                      checked={filtered.length > 0 && filtered.every(c => selected.has(c.id))}
                      ref={el => { if (el) el.indeterminate = filtered.some(c => selected.has(c.id)) && !filtered.every(c => selected.has(c.id)) }}
                      onChange={toggleSelectAll}
                      style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: 15, height: 15 }}
                    />
                  </th>
                  {['Name', 'Position', 'Stage', 'Contact', 'Profiles', ''].map(h => (
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
                {filtered.map((c, i) => {
                  const stage = c.stage ?? 'new'
                  return (
                    <tr
                      key={c.id}
                      style={{
                        borderBottom: i < filtered.length - 1 ? '1px solid var(--card-border)' : 'none',
                        background: selected.has(c.id) ? 'rgba(0,168,122,0.04)' : undefined,
                      }}
                    >
                      <td style={{ padding: '13px 12px 13px 20px' }}>
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggleSelect(c.id)}
                          style={{ cursor: 'pointer', accentColor: 'var(--primary)', width: 15, height: 15 }}
                        />
                      </td>
                      {/* Name */}
                      <td style={{ padding: '13px 16px' }}>
                        <div
                          style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}
                          onClick={() => setDetail(c)}
                        >
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
                      {/* Stage */}
                      <td style={{ padding: '13px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: 20,
                          background: `${STAGE_COLORS[stage]}15`,
                          border: `1.5px solid ${STAGE_COLORS[stage]}40`,
                          color: STAGE_COLORS[stage],
                          fontSize: '0.7rem', fontWeight: 700, fontFamily: 'Syne, sans-serif',
                          textTransform: 'capitalize',
                        }}>
                          {stage.charAt(0).toUpperCase() + stage.slice(1)}
                        </span>
                      </td>
                      {/* Contact */}
                      <td style={{ padding: '13px 16px' }}>
                        {c.email && <div style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{c.email}</div>}
                        {c.phone && <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 2 }}>{c.phone}</div>}
                        {!c.email && !c.phone && <span style={{ color: 'var(--text-dim)', fontSize: '0.8rem' }}>—</span>}
                      </td>
                      {/* Profiles */}
                      <td style={{ padding: '13px 16px' }}>
                        <div style={{ display: 'flex', gap: 8 }}>
                          {c.linkedIn && (
                            <a
                              href={linkedInUrl(c.linkedIn)} target="_blank" rel="noopener noreferrer" title="LinkedIn"
                              style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: 30, height: 30, borderRadius: 7,
                                background: '#0077b518', border: '1px solid #0077b530',
                                textDecoration: 'none', fontSize: '0.78rem', fontWeight: 700, color: '#0077b5',
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
                              href={gitHubUrl(c.gitHub)} target="_blank" rel="noopener noreferrer" title="GitHub"
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
                            onClick={() => openEdit(c)}
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
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Candidate detail drawer */}
      {detail && (
        <CandidateDetail
          candidate={detail}
          onClose={() => setDetail(undefined)}
          onEdit={openEdit}
          onDelete={handleDelete}
          onStageChange={handleStageChange}
        />
      )}

      {/* Create / edit modal */}
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
