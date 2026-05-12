'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getJobBySlug, submitApplication, formatSalary, JOB_TYPE_LABELS, WORK_MODE_LABELS } from '@/lib/jobs'
import type { Job } from '@/lib/types'

// ── Markdown Renderer ─────────────────────────────────────────────────────────

function parseInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = []
  // Match **bold** or *italic*
  const re = /(\*\*(.+?)\*\*|\*(.+?)\*)/g
  let last = 0
  let m: RegExpExecArray | null
  let idx = 0
  while ((m = re.exec(text)) !== null) {
    if (m.index > last) parts.push(text.slice(last, m.index))
    if (m[0].startsWith('**')) {
      parts.push(<strong key={idx++}>{m[2]}</strong>)
    } else {
      parts.push(<em key={idx++}>{m[3]}</em>)
    }
    last = m.index + m[0].length
  }
  if (last < text.length) parts.push(text.slice(last))
  return parts
}

function MarkdownText({ text }: { text: string }) {
  const lines = text.split('\n')
  const nodes: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (/^## (.+)/.test(line)) {
      nodes.push(
        <div key={i} style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#111', marginTop: 24, marginBottom: 8, letterSpacing: '0.02em' }}>
          {line.replace(/^## /, '')}
        </div>
      )
    } else if (/^### (.+)/.test(line)) {
      nodes.push(
        <div key={i} style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.85rem', color: '#333', marginTop: 16, marginBottom: 6 }}>
          {line.replace(/^### /, '')}
        </div>
      )
    } else if (/^- (.+)/.test(line)) {
      nodes.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ color: '#00a87a', flexShrink: 0 }}>•</span>
          <span>{parseInline(line.replace(/^- /, ''))}</span>
        </div>
      )
    } else if (/^\d+\. (.+)/.test(line)) {
      const num = line.match(/^(\d+)\./)?.[1]
      nodes.push(
        <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 4 }}>
          <span style={{ color: '#00a87a', flexShrink: 0, minWidth: 18 }}>{num}.</span>
          <span>{parseInline(line.replace(/^\d+\. /, ''))}</span>
        </div>
      )
    } else if (line.trim() === '') {
      nodes.push(<div key={i} style={{ height: 8 }} />)
    } else {
      nodes.push(
        <div key={i} style={{ marginBottom: 2 }}>
          {parseInline(line)}
        </div>
      )
    }
    i++
  }

  return (
    <div style={{ fontSize: '0.9rem', color: '#444', lineHeight: 1.8, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {nodes}
    </div>
  )
}

// ── Application Form ──────────────────────────────────────────────────────────

function ApplyForm({ job, onSubmitted }: { job: Job; onSubmitted: () => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName,  setLastName]  = useState('')
  const [email,     setEmail]     = useState('')
  const [phone,     setPhone]     = useState('')
  const [linkedIn,  setLinkedIn]  = useState('')
  const [message,   setMessage]   = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error,     setError]     = useState('')

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!firstName.trim() || !lastName.trim() || !email.trim()) return
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address.')
      return
    }
    setError('')
    setSubmitting(true)
    try {
      await submitApplication({
        jobId:     job.id,
        jobTitle:  job.title,
        firstName: firstName.trim(),
        lastName:  lastName.trim(),
        email:     email.trim(),
        ...(phone.trim()    ? { phone: phone.trim() }       : {}),
        ...(linkedIn.trim() ? { linkedIn: linkedIn.trim() } : {}),
        ...(message.trim()  ? { message: message.trim() }   : {}),
      })
      onSubmitted()
    } catch {
      setError('Submission failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '11px 14px', borderRadius: 9,
    border: '1px solid rgba(0,168,122,0.22)', background: 'rgba(255,255,255,0.95)',
    fontSize: '0.85rem', fontFamily: 'JetBrains Mono, monospace',
    color: '#0f2e2a', outline: 'none', boxSizing: 'border-box',
  }
  const lbl: React.CSSProperties = {
    fontSize: '0.68rem', color: '#7ab8ae', fontWeight: 600,
    letterSpacing: '0.05em', display: 'block', marginBottom: 5,
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>FIRST NAME *</label>
          <input style={inp} value={firstName} onChange={e => setFirstName(e.target.value)} placeholder="Jan" required />
        </div>
        <div>
          <label style={lbl}>LAST NAME *</label>
          <input style={inp} value={lastName} onChange={e => setLastName(e.target.value)} placeholder="Novák" required />
        </div>
      </div>

      <div>
        <label style={lbl}>EMAIL *</label>
        <input style={inp} type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="jan.novak@email.cz" required />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={lbl}>PHONE</label>
          <input style={inp} type="tel" value={phone} onChange={e => setPhone(e.target.value)} placeholder="+420 ..." />
        </div>
        <div>
          <label style={lbl}>LINKEDIN</label>
          <input style={inp} value={linkedIn} onChange={e => setLinkedIn(e.target.value)} placeholder="linkedin.com/in/..." />
        </div>
      </div>

      <div>
        <label style={lbl}>MESSAGE</label>
        <textarea
          style={{ ...inp, resize: 'vertical', minHeight: 100 }}
          value={message}
          onChange={e => setMessage(e.target.value)}
          placeholder="Tell us why you are a great fit..."
        />
      </div>

      {error && (
        <div style={{ fontSize: '0.8rem', color: '#e0457a', fontFamily: 'JetBrains Mono, monospace' }}>
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={submitting || !firstName.trim() || !lastName.trim() || !email.trim()}
        style={{
          padding: '13px 0', borderRadius: 10, border: 'none',
          background: 'linear-gradient(135deg, #00a87a, #0091c7)',
          color: '#fff', fontFamily: 'Syne, sans-serif', fontWeight: 700,
          fontSize: '0.95rem', cursor: submitting ? 'not-allowed' : 'pointer',
          opacity: submitting ? 0.7 : 1, width: '100%',
        }}
      >
        {submitting ? 'Sending...' : 'Send Application'}
      </button>
    </form>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function JobDetailPage() {
  const params    = useParams()
  const router    = useRouter()
  const slug      = typeof params.slug === 'string' ? params.slug : ''
  const [job,       setJob]       = useState<Job | null>(null)
  const [loading,   setLoading]   = useState(true)
  const [submitted, setSubmitted] = useState(false)
  const applyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!slug) return
    getJobBySlug(slug)
      .then(j => {
        if (!j || j.status !== 'published') {
          router.replace('/careers')
          return
        }
        setJob(j)
      })
      .finally(() => setLoading(false))
  }, [slug, router])

  if (loading) {
    return (
      <main style={{ maxWidth: 1200, margin: '0 auto', padding: '80px 24px', textAlign: 'center', color: '#aaa', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
        Loading...
      </main>
    )
  }

  if (!job) return null

  const salary = formatSalary(job)

  return (
    <main style={{ maxWidth: '100%', margin: 0, padding: 0, background: '#f5f5f5', minHeight: '100vh' }}>

      {/* ── Hero Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #00a87a 0%, #0091c7 100%)',
      }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '28px 40px 0' }}>
          <a href="/careers" style={{
            fontSize: '0.78rem', color: 'rgba(255,255,255,0.75)', textDecoration: 'none',
            fontFamily: 'JetBrains Mono, monospace', display: 'inline-flex', alignItems: 'center', gap: 4,
          }}>
            ← All positions
          </a>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '24px 40px 36px' }}>
          {/* Company badge */}
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 6,
            background: 'rgba(255,255,255,0.15)', borderRadius: 20,
            padding: '4px 12px', marginBottom: 18,
          }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.78rem', color: '#fff', letterSpacing: '-0.01em' }}>
              Splend<span style={{ color: '#d4f5ec' }}>IT</span>
            </span>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem' }}>·</span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.72rem', color: 'rgba(255,255,255,0.85)' }}>
              {JOB_TYPE_LABELS[job.type]}
            </span>
          </div>

          {/* Title */}
          <h1 style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: 'clamp(1.8rem, 4vw, 2.6rem)',
            color: '#fff', margin: '0 0 20px', letterSpacing: '-0.03em', lineHeight: 1.15,
          }}>
            {job.title}
          </h1>

          {/* Info row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 20px', marginBottom: job.tags.length > 0 ? 22 : 28 }}>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>📍</span> {job.location}
            </span>
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 5 }}>
              <span>💻</span> {WORK_MODE_LABELS[job.workMode]}
            </span>
            {salary && (
              <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.8rem', color: 'rgba(255,255,255,0.9)', display: 'flex', alignItems: 'center', gap: 5 }}>
                <span>💰</span> {salary} / mo
              </span>
            )}
          </div>

          {/* Tags */}
          {job.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 28 }}>
              {job.tags.map(tag => (
                <span key={tag} style={{
                  fontSize: '0.7rem', padding: '4px 12px', borderRadius: 20,
                  background: 'rgba(255,255,255,0.18)', color: '#fff',
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                  border: '1px solid rgba(255,255,255,0.25)',
                }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          {/* Apply CTA */}
          <button
            onClick={() => applyRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
            style={{
              padding: '13px 32px', borderRadius: 10, border: '2px solid rgba(255,255,255,0.9)',
              background: '#fff', color: '#00a87a',
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.95rem',
              cursor: 'pointer', letterSpacing: '-0.01em',
            }}
          >
            Apply for this position →
          </button>
        </div>
      </div>

      {/* ── Body ── */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '36px 40px 60px' }}>

        <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', border: '1px solid #eee', marginBottom: 16 }}>
          <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: '#111', marginBottom: 16, letterSpacing: '0.08em' }}>
            ABOUT THE ROLE
          </h2>
          <MarkdownText text={job.description} />
        </div>

        {job.requirements && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', border: '1px solid #eee', marginBottom: 16 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.82rem', color: '#111', marginBottom: 16, letterSpacing: '0.08em' }}>
              REQUIREMENTS
            </h2>
            <MarkdownText text={job.requirements} />
          </div>
        )}

        {/* ── Apply Form ── */}
        <div ref={applyRef} style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', border: '1px solid #eee', scrollMarginTop: 80 }}>
          {submitted ? (
            <div style={{ textAlign: 'center', padding: '20px 0' }}>
              <div style={{
                width: 52, height: 52, borderRadius: '50%',
                background: 'linear-gradient(135deg, #00a87a, #0091c7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 14px', fontSize: '1.4rem', color: '#fff',
              }}>✓</div>
              <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#00a87a', marginBottom: 8, fontSize: '1rem' }}>
                Application Sent!
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.6, fontFamily: 'JetBrains Mono, monospace' }}>
                Thank you for applying. We will get back to you shortly.
              </p>
            </div>
          ) : (
            <>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.92rem', color: '#111', marginBottom: 18 }}>
                Apply for this position
              </h2>
              <ApplyForm job={job} onSubmitted={() => setSubmitted(true)} />
            </>
          )}
        </div>

      </div>
    </main>
  )
}
