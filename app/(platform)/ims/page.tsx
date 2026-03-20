'use client'

import { useEffect, useState, useCallback } from 'react'
import { collection, getDocs, query, orderBy, limit, deleteDoc, doc, updateDoc, getDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import type { Candidate, CandidateRating, CandidateStatus, QuestionAnswer } from '@/lib/types'
import Link from 'next/link'

// ─── Constants ───────────────────────────────────────────────────────────────

const SCORE_THRESHOLDS = { excellent: 85, good: 70, medium: 50 }
const CANDIDATES_LIMIT = 50

const STATUS_MAP: Record<CandidateStatus, { icon: string; label: string; color: string }> = {
  pending:   { icon: '📋', label: 'Pending',           color: '#856404'  },
  scheduled: { icon: '📅', label: 'Scheduled',         color: '#0c5460'  },
  done:      { icon: '✅', label: 'Done',               color: '#155724'  },
  second:    { icon: '🔄', label: 'Second Interview',   color: '#004085'  },
  hired:     { icon: '🎉', label: 'Hired',              color: '#155724'  },
  rejected:  { icon: '❌', label: 'Rejected',           color: '#721c24'  },
}

const POSITIONS = [
  'All',
  'AI Engineer',
  'Data Engineer',
  'Data Science',
  'React & Node.js',
  'DevOps Engineer',
  'Knowledge Graph Engineer',
  'AI QA Engineer',
]

const POSITION_SLUGS: Record<string, string> = {
  'AI Engineer':               'ai-engineer',
  'Data Engineer':             'data-engineer',
  'Data Science':              'data-science',
  'React & Node.js':           'node-react',
  'DevOps Engineer':           'devops',
  'Knowledge Graph Engineer':  'kg-engineer',
  'AI QA Engineer':            'ai-qa-engineer',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number) {
  if (score >= SCORE_THRESHOLDS.excellent) return 'var(--primary)'
  if (score >= SCORE_THRESHOLDS.good)      return 'var(--secondary)'
  if (score >= SCORE_THRESHOLDS.medium)    return '#f59e0b'
  return '#ef4444'
}

function formatDate(ts: number) {
  return new Date(ts).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  return (
    <div style={{
      padding: '8px 18px',
      borderRadius: 10,
      fontFamily: 'JetBrains Mono, monospace',
      fontWeight: 700,
      fontSize: '1.1rem',
      color: '#fff',
      background: scoreColor(score),
      minWidth: 64,
      textAlign: 'center',
    }}>
      {Math.round(score)}%
    </div>
  )
}

function StatusBadge({ status }: { status?: CandidateStatus }) {
  if (!status || status === 'pending') return null
  const s = STATUS_MAP[status]
  return (
    <span style={{
      fontSize: '0.72rem',
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 20,
      background: 'rgba(255,255,255,0.15)',
      border: `1px solid ${s.color}`,
      color: s.color,
    }}>
      {s.icon} {s.label}
    </span>
  )
}

function StarDisplay({ stars }: { stars: number }) {
  return (
    <span style={{ fontSize: '0.85rem', letterSpacing: 1 }}>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} style={{ color: i < stars ? '#fbbf24' : 'rgba(255,255,255,0.2)' }}>★</span>
      ))}
    </span>
  )
}

function DifficultyBadge({ label, value }: { label: string; value: number }) {
  return (
    <span style={{
      fontSize: '0.72rem',
      fontWeight: 600,
      padding: '3px 10px',
      borderRadius: 20,
      background: 'rgba(255,255,255,0.08)',
      color: 'var(--text-dim)',
    }}>
      {label} {value}
    </span>
  )
}

// ─── Comment Section ──────────────────────────────────────────────────────────

function CommentSection({ candidateId, initial, updatedAt, onSave }: {
  candidateId: string
  initial: string
  updatedAt?: number
  onSave: () => void
}) {
  const [text, setText] = useState(initial)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (text.length > 1000) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
        finalConclusion: text,
        conclusionUpdated: Date.now(),
      })
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)' }}>Final Conclusion</span>
        {updatedAt && (
          <span style={{ fontSize: '0.72rem', color: 'var(--text-dim)' }}>
            Updated {formatDate(updatedAt)}
          </span>
        )}
      </div>
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        maxLength={1000}
        placeholder="Write your final assessment of this candidate..."
        style={{
          width: '100%',
          minHeight: 100,
          padding: 12,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          color: 'var(--text)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.82rem',
          resize: 'vertical',
          outline: 'none',
        }}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
        <button
          onClick={save}
          disabled={saving}
          style={{
            padding: '8px 18px',
            background: 'var(--primary)',
            border: 'none',
            borderRadius: 8,
            color: '#fff',
            fontWeight: 600,
            fontSize: '0.8rem',
            cursor: 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save'}
        </button>
      </div>
    </div>
  )
}

// ─── Rating Section ───────────────────────────────────────────────────────────

function RatingSection({ candidateId, initial, onSave }: {
  candidateId: string
  initial?: CandidateRating
  onSave: () => void
}) {
  const [stars, setStars] = useState(initial?.stars ?? 0)
  const [hover, setHover] = useState(0)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [status, setStatus] = useState<CandidateStatus>(initial?.status ?? 'pending')
  const [saving, setSaving] = useState(false)

  async function save() {
    if (stars === 0) return
    setSaving(true)
    try {
      await updateDoc(doc(db, 'candidates', candidateId), {
        rating: { stars, notes, status, ratedAt: initial?.ratedAt ?? Date.now(), updatedAt: Date.now() },
      })
      onSave()
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{
      marginTop: 16,
      paddingTop: 16,
      borderTop: '1px solid rgba(255,255,255,0.08)',
    }}>
      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)', marginBottom: 12 }}>
        Rate This Candidate
      </div>

      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {Array.from({ length: 5 }, (_, i) => (
          <span
            key={i}
            onMouseEnter={() => setHover(i + 1)}
            onMouseLeave={() => setHover(0)}
            onClick={() => setStars(i + 1)}
            style={{
              fontSize: '1.6rem',
              cursor: 'pointer',
              color: i < (hover || stars) ? '#fbbf24' : 'rgba(255,255,255,0.2)',
              transition: 'color 0.15s',
            }}
          >★</span>
        ))}
      </div>

      <select
        value={status}
        onChange={e => setStatus(e.target.value as CandidateStatus)}
        style={{
          width: '100%',
          padding: '8px 12px',
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          color: 'var(--text)',
          fontSize: '0.82rem',
          marginBottom: 10,
          outline: 'none',
        }}
      >
        {(Object.entries(STATUS_MAP) as [CandidateStatus, typeof STATUS_MAP[CandidateStatus]][]).map(([k, v]) => (
          <option key={k} value={k} style={{ background: '#1a2535' }}>{v.icon} {v.label}</option>
        ))}
      </select>

      <textarea
        value={notes}
        onChange={e => setNotes(e.target.value)}
        placeholder="Interviewer notes..."
        style={{
          width: '100%',
          minHeight: 80,
          padding: 10,
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.12)',
          borderRadius: 8,
          color: 'var(--text)',
          fontFamily: 'JetBrains Mono, monospace',
          fontSize: '0.8rem',
          resize: 'vertical',
          outline: 'none',
          marginBottom: 10,
        }}
      />

      <button
        onClick={save}
        disabled={saving || stars === 0}
        style={{
          padding: '8px 18px',
          background: stars > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.1)',
          border: 'none',
          borderRadius: 8,
          color: '#fff',
          fontWeight: 600,
          fontSize: '0.8rem',
          cursor: stars > 0 ? 'pointer' : 'not-allowed',
          opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? 'Saving...' : 'Save Rating'}
      </button>
    </div>
  )
}

// ─── Answer Detail ────────────────────────────────────────────────────────────

const DIFF_COLORS: Record<string, string> = {
  easy:     '#22c55e',
  medium:   '#f59e0b',
  hard:     '#ef4444',
  critical: '#a855f7',
}

function AnswerDetail({ answers }: { answers: QuestionAnswer[] }) {
  if (!answers.length) {
    return (
      <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
        No answer details available for this candidate.
      </div>
    )
  }

  return (
    <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontWeight: 600, fontSize: '0.82rem', color: 'var(--text)', marginBottom: 12 }}>
        Answer Detail
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {answers.map((q, i) => (
          <div key={i} style={{
            background: 'rgba(255,255,255,0.04)',
            borderRadius: 10,
            padding: 14,
            borderLeft: `3px solid ${DIFF_COLORS[q.difficulty] ?? '#888'}`,
          }}>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8, flexWrap: 'wrap' }}>
              <span style={{
                background: 'var(--secondary)',
                color: '#fff',
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '0.75rem',
                fontWeight: 700,
                flexShrink: 0,
              }}>{q.questionNumber}</span>
              <span style={{
                fontSize: '0.7rem',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: 12,
                background: `${DIFF_COLORS[q.difficulty]}22`,
                color: DIFF_COLORS[q.difficulty],
                textTransform: 'uppercase',
              }}>{q.difficulty}</span>
              <span style={{
                marginLeft: 'auto',
                fontSize: '0.75rem',
                fontWeight: 600,
                color: 'var(--text-dim)',
              }}>{q.earnedPoints ?? q.points ?? 0}/{q.maxPoints ?? q.points ?? 0} pts</span>
            </div>
            <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text)', marginBottom: 8 }}>
              {q.questionTitle}
            </div>
            {q.answers?.map((a, j) => (
              <div key={j} style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: '6px 10px',
                borderRadius: 6,
                marginBottom: 4,
                background: a.checked ? 'rgba(34,197,94,0.1)' : 'rgba(255,255,255,0.03)',
                border: a.checked ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                opacity: a.checked ? 1 : 0.55,
              }}>
                <span style={{
                  width: 16,
                  height: 16,
                  borderRadius: 3,
                  border: `1px solid ${a.checked ? '#22c55e' : 'rgba(255,255,255,0.2)'}`,
                  background: a.checked ? '#22c55e' : 'transparent',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  flexShrink: 0,
                  fontSize: '0.65rem',
                  color: '#fff',
                  marginTop: 1,
                }}>{a.checked ? '✓' : ''}</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text)', lineHeight: 1.5 }}>{a.text}</span>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Candidate Card ───────────────────────────────────────────────────────────

function CandidateCard({ candidate, onRefresh }: { candidate: Candidate; onRefresh: () => void }) {
  const [showComment, setShowComment]   = useState(false)
  const [showRating, setShowRating]     = useState(false)
  const [showAnswers, setShowAnswers]   = useState(false)
  const [answers, setAnswers]           = useState<QuestionAnswer[] | null>(null)
  const [loadingAnswers, setLoadingAnswers] = useState(false)

  const hasComment = !!candidate.finalConclusion?.trim()
  const hasRating  = !!candidate.rating?.stars
  const hasAnswers = !!candidate.answers?.length

  async function loadAnswers() {
    if (answers !== null) { setShowAnswers(v => !v); return }
    setLoadingAnswers(true)
    try {
      const snap = await getDoc(doc(db, 'candidates', candidate.id))
      setAnswers(snap.data()?.answers ?? [])
      setShowAnswers(true)
    } finally {
      setLoadingAnswers(false)
    }
  }

  async function deleteCandidate() {
    if (!confirm(`Delete candidate "${candidate.name}"? This cannot be undone.`)) return
    await deleteDoc(doc(db, 'candidates', candidate.id))
    onRefresh()
  }

  const IconBtn = ({ active, title, onClick, children }: {
    active?: boolean; title: string; onClick: () => void; children: React.ReactNode
  }) => (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 36,
        height: 36,
        borderRadius: 8,
        border: `1px solid ${active ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
        background: active ? 'rgba(0,168,122,0.15)' : 'rgba(255,255,255,0.05)',
        color: active ? 'var(--primary)' : 'var(--text-dim)',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: '0.9rem',
        transition: 'all 0.15s',
      }}
    >{children}</button>
  )

  return (
    <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 12 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 180 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
              {candidate.name}
            </span>
            {hasRating && <StarDisplay stars={candidate.rating!.stars} />}
            <StatusBadge status={candidate.rating?.status} />
          </div>
          <div style={{ fontSize: '0.78rem', color: 'var(--primary)', fontWeight: 600 }}>
            {candidate.position}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScoreBadge score={candidate.score} />

          <IconBtn active={hasAnswers && showAnswers} title="Answer detail" onClick={loadAnswers}>
            {loadingAnswers ? '…' : '📋'}
          </IconBtn>
          <IconBtn active={hasComment || showComment} title="Final conclusion" onClick={() => { setShowComment(v => !v); setShowRating(false) }}>
            💬
          </IconBtn>
          <IconBtn active={hasRating || showRating} title="Rate candidate" onClick={() => { setShowRating(v => !v); setShowComment(false) }}>
            ⭐
          </IconBtn>
          <IconBtn title="Delete candidate" onClick={deleteCandidate}>
            🗑
          </IconBtn>
        </div>
      </div>

      {/* Meta */}
      <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 10, alignItems: 'center' }}>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          📅 {formatDate(candidate.timestamp)} {formatTime(candidate.timestamp)}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          👤 {candidate.experience}
        </span>
        <span style={{ fontSize: '0.75rem', color: 'var(--text-dim)' }}>
          {candidate.totalPoints}/{candidate.maxPoints} pts
        </span>
        <DifficultyBadge label="🟢" value={candidate.easyScore} />
        <DifficultyBadge label="🟡" value={candidate.mediumScore} />
        <DifficultyBadge label="🔴" value={candidate.hardScore} />
        {(candidate.criticalScore ?? 0) > 0 && <DifficultyBadge label="❗" value={candidate.criticalScore!} />}
      </div>

      {/* Expandable sections */}
      {showAnswers && answers !== null && <AnswerDetail answers={answers} />}
      {showComment && (
        <CommentSection
          candidateId={candidate.id}
          initial={candidate.finalConclusion ?? ''}
          updatedAt={candidate.conclusionUpdated}
          onSave={() => { onRefresh(); setShowComment(false) }}
        />
      )}
      {showRating && (
        <RatingSection
          candidateId={candidate.id}
          initial={candidate.rating}
          onSave={() => { onRefresh(); setShowRating(false) }}
        />
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function IMSPage() {
  const [candidates, setCandidates]       = useState<Candidate[]>([])
  const [loading, setLoading]             = useState(true)
  const [error, setError]                 = useState<string | null>(null)
  const [filterPosition, setFilterPosition] = useState('All')
  const [search, setSearch]               = useState('')
  const [dropdownOpen, setDropdownOpen]   = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const q = query(collection(db, 'candidates'), orderBy('timestamp', 'desc'), limit(CANDIDATES_LIMIT))
      const snap = await getDocs(q)
      setCandidates(snap.docs.map(d => ({ id: d.id, ...d.data() } as Candidate)))
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to load candidates')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { load() }, [load])

  const filtered = candidates.filter(c => {
    const matchPosition = filterPosition === 'All' || c.position === filterPosition
    const matchSearch   = !search || c.name.toLowerCase().includes(search.toLowerCase())
    return matchPosition && matchSearch
  })

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)', marginBottom: 4 }}>
            Interview Management
          </h1>
          <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
            Candidate results — {candidates.length} total
          </p>
        </div>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <Link href="/ims/statistics" style={{
            padding: '9px 18px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 10,
            color: 'var(--text)',
            textDecoration: 'none',
            fontSize: '0.8rem',
            fontWeight: 600,
          }}>
            📊 Statistics
          </Link>
          <div style={{ position: 'relative' }}>
            <button
              style={{
                padding: '9px 18px',
                background: 'var(--primary)',
                border: 'none',
                borderRadius: 10,
                color: '#fff',
                fontSize: '0.8rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
              onClick={() => setDropdownOpen(v => !v)}
            >
              + New Interview ▾
            </button>
            {dropdownOpen && (
              <div style={{
                position: 'absolute',
                right: 0,
                top: '110%',
                background: '#1a2535',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 10,
                padding: '6px 0',
                zIndex: 100,
                minWidth: 220,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4)',
              }}>
                {POSITIONS.slice(1).map(pos => (
                  <Link
                    key={pos}
                    href={`/ims/forms/${POSITION_SLUGS[pos]}`}
                    onClick={() => setDropdownOpen(false)}
                    style={{
                      display: 'block',
                      padding: '8px 18px',
                      color: 'rgba(255,255,255,0.85)',
                      textDecoration: 'none',
                      fontSize: '0.82rem',
                      transition: 'background 0.15s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    {pos}
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
        <input
          type="text"
          placeholder="Search by name..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 14px',
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)',
            borderRadius: 8,
            color: 'var(--text)',
            fontSize: '0.82rem',
            outline: 'none',
            width: 220,
          }}
        />
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {POSITIONS.map(pos => (
            <button
              key={pos}
              onClick={() => setFilterPosition(pos)}
              style={{
                padding: '6px 14px',
                borderRadius: 20,
                border: `1px solid ${filterPosition === pos ? 'var(--primary)' : 'rgba(255,255,255,0.12)'}`,
                background: filterPosition === pos ? 'rgba(0,168,122,0.15)' : 'transparent',
                color: filterPosition === pos ? 'var(--primary)' : 'var(--text-dim)',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >{pos}</button>
          ))}
        </div>
      </div>

      {/* Content */}
      {loading && (
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.82rem' }}>
          Loading candidates...
        </div>
      )}

      {error && (
        <div className="glass-card" style={{ padding: 20, color: '#ef4444', fontSize: '0.82rem', borderColor: 'rgba(239,68,68,0.3)' }}>
          Error: {error}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="glass-card" style={{ padding: 60, textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '3rem', marginBottom: 12, opacity: 0.3 }}>📋</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, marginBottom: 8 }}>
            {candidates.length === 0 ? 'No candidates yet' : 'No results'}
          </div>
          <div style={{ fontSize: '0.8rem' }}>
            {candidates.length === 0
              ? 'Start by creating a new interview form.'
              : 'Try adjusting your filters.'}
          </div>
        </div>
      )}

      {!loading && filtered.map(c => (
        <CandidateCard key={c.id} candidate={c} onRefresh={load} />
      ))}
    </div>
  )
}
