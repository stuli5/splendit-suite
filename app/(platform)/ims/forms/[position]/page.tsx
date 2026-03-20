'use client'

import { useState, useMemo, use } from 'react'
import { collection, addDoc } from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { getFormBySlug } from '@/lib/ims-questions'
import type { FormDef, QuestionDef } from '@/lib/ims-questions'
import Link from 'next/link'

// ─── Types ────────────────────────────────────────────────────────────────────

type Difficulty = 'easy' | 'medium' | 'hard' | 'critical'

const DIFF_COLORS: Record<Difficulty, string> = {
  easy:     '#22c55e',
  medium:   '#f59e0b',
  hard:     '#ef4444',
  critical: '#a855f7',
}

const DIFF_LABELS: Record<Difficulty, string> = {
  easy:     'Easy',
  medium:   'Medium',
  hard:     'Hard',
  critical: 'Critical',
}

const EXPERIENCE_OPTIONS = [
  { value: '0-1',  label: '0–1 year (Junior)' },
  { value: '1-3',  label: '1–3 years (Junior/Medior)' },
  { value: '3-5',  label: '3–5 years (Medior)' },
  { value: '5-8',  label: '5–8 years (Senior)' },
  { value: '8+',   label: '8+ years (Senior+)' },
]

// ─── Score helpers ────────────────────────────────────────────────────────────

function scoreColor(pct: number) {
  if (pct >= 85) return 'var(--primary)'
  if (pct >= 70) return 'var(--secondary)'
  if (pct >= 50) return '#f59e0b'
  return '#ef4444'
}

function scoreLabel(pct: number) {
  if (pct === 0)    return 'Start checking answers!'
  if (pct < 30)     return 'Junior — Needs significant improvement'
  if (pct < 50)     return 'Junior/Medior — Good foundation, keep going'
  if (pct < 70)     return 'Medior — Solid knowledge'
  if (pct < 85)     return 'Medior/Senior — Excellent!'
  if (pct < 100)    return 'Senior — Outstanding!'
  return 'Senior+ — Perfect score!'
}

// ─── Question Block ───────────────────────────────────────────────────────────

function QuestionBlock({
  question,
  checked,
  onToggle,
  number,
}: {
  question: QuestionDef
  checked: boolean[]
  onToggle: (idx: number) => void
  number: number
}) {
  const diff = question.difficulty as Difficulty
  const color = DIFF_COLORS[diff]
  const anyChecked = checked.some(Boolean)

  return (
    <div style={{
      background: 'rgba(255,255,255,0.04)',
      border: '1px solid rgba(255,255,255,0.08)',
      borderLeft: `4px solid ${color}`,
      borderRadius: 12,
      padding: '20px 22px',
      marginBottom: 14,
      transition: 'border-color 0.2s',
      ...(anyChecked && { borderColor: `${color}66`, background: `${color}08` }),
    }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <span style={{
          width: 28, height: 28, borderRadius: '50%',
          background: 'var(--secondary)', color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '0.78rem', fontWeight: 700, flexShrink: 0,
        }}>{number}</span>
        <span style={{
          padding: '3px 10px', borderRadius: 12,
          background: `${color}22`, color,
          fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5,
        }}>{DIFF_LABELS[diff]}</span>
        <span style={{
          marginLeft: 'auto',
          padding: '3px 10px', borderRadius: 12,
          background: anyChecked ? `${color}22` : 'rgba(255,255,255,0.06)',
          color: anyChecked ? color : 'var(--text-dim)',
          fontSize: '0.72rem', fontWeight: 700,
          fontFamily: 'JetBrains Mono, monospace',
          transition: 'all 0.2s',
        }}>
          {anyChecked ? question.points : 0}/{question.points} pts
        </span>
      </div>

      {/* Title */}
      <div style={{
        fontSize: '0.88rem', fontWeight: 600, color: 'var(--text)',
        marginBottom: 14, lineHeight: 1.5,
      }}>
        {question.title}
      </div>

      {/* Answers */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {question.answers.map((answer, i) => (
          <label
            key={i}
            style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '10px 12px', borderRadius: 8, cursor: 'pointer',
              border: `1px solid ${checked[i] ? `${color}44` : 'rgba(255,255,255,0.06)'}`,
              background: checked[i] ? `${color}11` : 'rgba(255,255,255,0.02)',
              transition: 'all 0.15s',
            }}
          >
            <span style={{
              width: 18, height: 18, borderRadius: 4, flexShrink: 0,
              border: `2px solid ${checked[i] ? color : 'rgba(255,255,255,0.2)'}`,
              background: checked[i] ? color : 'transparent',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              marginTop: 1, transition: 'all 0.15s', fontSize: '0.65rem', color: '#fff',
            }}>
              {checked[i] ? '✓' : ''}
            </span>
            <input
              type="checkbox"
              checked={checked[i]}
              onChange={() => onToggle(i)}
              style={{ display: 'none' }}
            />
            <span style={{ fontSize: '0.82rem', color: 'var(--text)', lineHeight: 1.5 }}>
              {answer}
            </span>
          </label>
        ))}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function InterviewFormPage({ params }: { params: Promise<{ position: string }> }) {
  const { position } = use(params)
  const form = getFormBySlug(position) as FormDef | undefined

  // State
  const [firstName, setFirstName]   = useState('')
  const [lastName, setLastName]     = useState('')
  const [experience, setExperience] = useState('')
  const [checked, setChecked]       = useState<Record<number, boolean[]>>(() => {
    if (!form) return {}
    const init: Record<number, boolean[]> = {}
    form.questions.forEach(q => { init[q.id] = new Array(q.answers.length).fill(false) })
    return init
  })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved]   = useState(false)
  const [error, setError]   = useState<string | null>(null)

  // Score calculation
  const score = useMemo(() => {
    if (!form) return { total: 0, pct: 0, easy: 0, medium: 0, hard: 0, critical: 0 }
    let total = 0, easy = 0, medium = 0, hard = 0, critical = 0
    form.questions.forEach(q => {
      const anyChecked = checked[q.id]?.some(Boolean)
      if (anyChecked) {
        total += q.points
        if (q.difficulty === 'easy') easy += q.points
        else if (q.difficulty === 'medium') medium += q.points
        else if (q.difficulty === 'hard') hard += q.points
        else if (q.difficulty === 'critical') critical += q.points
      }
    })
    return { total, pct: Math.round((total / (form.totalPoints || 1)) * 100), easy, medium, hard, critical }
  }, [form, checked])

  function toggleAnswer(questionId: number, answerIdx: number) {
    setChecked(prev => ({
      ...prev,
      [questionId]: prev[questionId].map((v, i) => i === answerIdx ? !v : v),
    }))
  }

  function resetAll() {
    if (!form || !confirm('Reset all answers?')) return
    const init: Record<number, boolean[]> = {}
    form.questions.forEach(q => { init[q.id] = new Array(q.answers.length).fill(false) })
    setChecked(init)
    setSaved(false)
  }

  async function saveToFirebase() {
    if (!form || !firstName.trim() || !lastName.trim() || !experience) {
      setError('Please fill in all candidate information fields.')
      return
    }
    setSaving(true)
    setError(null)
    try {
      const answers = form.questions.map(q => ({
        questionNumber: q.id,
        questionTitle: q.title,
        difficulty: q.difficulty,
        points: q.points,
        earnedPoints: checked[q.id]?.some(Boolean) ? q.points : 0,
        maxPoints: q.points,
        answers: q.answers.map((text, i) => ({ text, checked: checked[q.id]?.[i] ?? false })),
      }))
      await addDoc(collection(db, 'candidates'), {
        name: `${firstName.trim()} ${lastName.trim()}`,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        position: form.position,
        experience,
        score: score.pct,
        totalPoints: score.total,
        maxPoints: form.totalPoints,
        easyScore: score.easy,
        mediumScore: score.medium,
        hardScore: score.hard,
        criticalScore: score.critical,
        timestamp: Date.now(),
        date: new Date().toISOString(),
        answers,
      })
      setSaved(true)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to save')
    } finally {
      setSaving(false)
    }
  }

  if (!form) {
    return (
      <div>
        <div style={{ marginBottom: 20 }}>
          <Link href="/ims" style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: '0.82rem' }}>← Back to IMS</Link>
        </div>
        <div className="glass-card" style={{ padding: 40, textAlign: 'center', color: 'var(--text-dim)' }}>
          <div style={{ fontSize: '2rem', marginBottom: 12, opacity: 0.4 }}>❓</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700 }}>Interview form not found</div>
          <div style={{ fontSize: '0.8rem', marginTop: 8 }}>Slug: {position}</div>
        </div>
      </div>
    )
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px',
    background: 'rgba(255,255,255,0.05)',
    border: '1px solid rgba(255,255,255,0.12)',
    borderRadius: 8, color: 'var(--text)',
    fontSize: '0.85rem', outline: 'none',
    fontFamily: 'JetBrains Mono, monospace',
  }

  return (
    <div style={{ maxWidth: 900 }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <Link href="/ims" style={{ color: 'var(--text-dim)', textDecoration: 'none', fontSize: '0.8rem' }}>← Back to IMS</Link>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)', marginTop: 8, marginBottom: 4 }}>
          {form.position}
        </h1>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)' }}>
          {form.questions.length} questions · {form.totalPoints} total points
        </p>
      </div>

      {/* Candidate info */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 14 }}>
          Candidate Information
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              First Name *
            </label>
            <input
              type="text"
              value={firstName}
              onChange={e => setFirstName(e.target.value)}
              placeholder="John"
              style={inputStyle}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
              Last Name *
            </label>
            <input
              type="text"
              value={lastName}
              onChange={e => setLastName(e.target.value)}
              placeholder="Doe"
              style={inputStyle}
            />
          </div>
        </div>
        <div>
          <label style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontWeight: 600, display: 'block', marginBottom: 6 }}>
            Years of Experience *
          </label>
          <select
            value={experience}
            onChange={e => setExperience(e.target.value)}
            style={{ ...inputStyle, cursor: 'pointer' }}
          >
            <option value="" style={{ background: '#1a2535' }}>Select experience level</option>
            {EXPERIENCE_OPTIONS.map(o => (
              <option key={o.value} value={o.value} style={{ background: '#1a2535' }}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Questions */}
      {form.questions.map((q, i) => (
        <QuestionBlock
          key={q.id}
          question={q}
          checked={checked[q.id] ?? []}
          onToggle={idx => toggleAnswer(q.id, idx)}
          number={i + 1}
        />
      ))}

      {/* Score panel */}
      <div className="glass-card" style={{
        padding: '24px 28px',
        marginTop: 24,
        borderColor: `rgba(${score.pct >= 70 ? '0,168,122' : '239,68,68'},0.3)`,
        position: 'sticky',
        bottom: 20,
        background: 'rgba(15,25,40,0.95)',
        backdropFilter: 'blur(12px)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Big score */}
          <div style={{ textAlign: 'center', minWidth: 80 }}>
            <div style={{
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: 800, fontSize: '2.4rem',
              color: scoreColor(score.pct),
              lineHeight: 1,
            }}>{score.pct}%</div>
            <div style={{ fontSize: '0.72rem', color: 'var(--text-dim)', marginTop: 4 }}>
              {score.total}/{form.totalPoints} pts
            </div>
          </div>

          {/* Breakdown */}
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: '0.78rem', color: 'var(--text)', marginBottom: 8, fontWeight: 600 }}>
              {scoreLabel(score.pct)}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { label: '🟢 Easy', val: score.easy, color: '#22c55e' },
                { label: '🟡 Medium', val: score.medium, color: '#f59e0b' },
                { label: '🔴 Hard', val: score.hard, color: '#ef4444' },
                { label: '❗ Critical', val: score.critical, color: '#a855f7' },
              ].map(b => (
                <span key={b.label} style={{
                  fontSize: '0.72rem', padding: '3px 10px', borderRadius: 12,
                  background: `${b.color}18`, color: b.color, fontWeight: 600,
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  {b.label} {b.val}
                </span>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button
              onClick={resetAll}
              style={{
                padding: '9px 16px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                borderRadius: 8, color: 'var(--text-dim)',
                fontSize: '0.8rem', fontWeight: 600, cursor: 'pointer',
              }}
            >Reset</button>
            <button
              onClick={saveToFirebase}
              disabled={saving || saved}
              style={{
                padding: '9px 20px',
                background: saved ? '#22c55e' : 'var(--primary)',
                border: 'none', borderRadius: 8,
                color: '#fff', fontSize: '0.8rem', fontWeight: 600,
                cursor: saving || saved ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : saved ? '✓ Saved' : 'Save Results'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#ef4444', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {saved && (
          <div style={{ marginTop: 10, fontSize: '0.78rem', color: '#22c55e', fontWeight: 600 }}>
            Results saved successfully. <Link href="/ims" style={{ color: '#22c55e' }}>View in dashboard →</Link>
          </div>
        )}
      </div>
    </div>
  )
}
