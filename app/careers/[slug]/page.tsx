'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { getJobBySlug, submitApplication, formatSalary, JOB_TYPE_LABELS, WORK_MODE_LABELS, WORK_MODE_COLORS } from '@/lib/jobs'
import type { Job } from '@/lib/types'

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
      <main style={{ maxWidth: 760, margin: '0 auto', padding: '80px 24px', textAlign: 'center', color: '#aaa', fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem' }}>
        Loading...
      </main>
    )
  }

  if (!job) return null

  const salary    = formatSalary(job)
  const modeColor = WORK_MODE_COLORS[job.workMode] ?? '#888'

  const infoRows = [
    { icon: '📍', label: 'Location',  value: job.location },
    { icon: '💻', label: 'Work mode', value: WORK_MODE_LABELS[job.workMode] },
    { icon: '📄', label: 'Job type',  value: JOB_TYPE_LABELS[job.type] },
    ...(salary ? [{ icon: '💰', label: 'Salary', value: `${salary} / month` }] : []),
  ]

  return (
    <main style={{ maxWidth: 960, margin: '0 auto', padding: '44px 28px' }}>
      {/* Back */}
      <a href="/careers" style={{ fontSize: '0.78rem', color: '#888', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 32 }}>
        ← All positions
      </a>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 340px', gap: 40, alignItems: 'start' }}>

        {/* ── Left: title + content ── */}
        <div>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: '2.1rem', color: '#111', marginBottom: 16, letterSpacing: '-0.03em', lineHeight: 1.2 }}>
            {job.title}
          </h1>

          {job.tags.length > 0 && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 32, flexWrap: 'wrap' }}>
              {job.tags.map(tag => (
                <span key={tag} style={{ fontSize: '0.72rem', padding: '4px 11px', borderRadius: 20, background: '#f0faf8', color: '#00a87a', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, border: '1px solid rgba(0,168,122,0.15)' }}>
                  {tag}
                </span>
              ))}
            </div>
          )}

          <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', border: '1px solid #eee', marginBottom: 20 }}>
            <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#111', marginBottom: 16, letterSpacing: '0.08em' }}>
              ABOUT THE ROLE
            </h2>
            <p style={{ fontSize: '0.875rem', color: '#444', lineHeight: 1.85, whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace' }}>
              {job.description}
            </p>
          </div>

          {job.requirements && (
            <div style={{ background: '#fff', borderRadius: 14, padding: '28px 32px', border: '1px solid #eee' }}>
              <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.85rem', color: '#111', marginBottom: 16, letterSpacing: '0.08em' }}>
                REQUIREMENTS
              </h2>
              <p style={{ fontSize: '0.875rem', color: '#444', lineHeight: 1.85, whiteSpace: 'pre-wrap', fontFamily: 'JetBrains Mono, monospace' }}>
                {job.requirements}
              </p>
            </div>
          )}
        </div>

        {/* ── Right: info + apply ── */}
        <div style={{ position: 'sticky', top: 82 }}>

          {/* Info card */}
          <div style={{ background: '#fff', borderRadius: 14, border: '1px solid #eee', overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ background: '#f8f8f8', padding: '14px 20px', borderBottom: '1px solid #eee' }}>
              <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.78rem', color: '#111', letterSpacing: '0.06em' }}>
                JOB DETAILS
              </span>
            </div>
            {infoRows.map(row => (
              <div key={row.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '13px 20px', borderBottom: '1px solid #f5f5f5' }}>
                <span style={{ fontSize: '1rem', width: 22, textAlign: 'center', flexShrink: 0 }}>{row.icon}</span>
                <div>
                  <div style={{ fontSize: '0.65rem', color: '#aaa', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600, letterSpacing: '0.05em', marginBottom: 1 }}>{row.label.toUpperCase()}</div>
                  <div style={{ fontSize: '0.82rem', color: '#111', fontFamily: 'JetBrains Mono, monospace', fontWeight: 600 }}>{row.value}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Apply panel */}
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px', border: '1px solid #eee' }}>
            {submitted ? (
              <div style={{ textAlign: 'center', padding: '16px 0' }}>
                <div style={{ fontSize: '2rem', marginBottom: 12 }}>✓</div>
                <h3 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, color: '#00a87a', marginBottom: 8, fontSize: '1rem' }}>Application Sent!</h3>
                <p style={{ fontSize: '0.8rem', color: '#666', lineHeight: 1.6, fontFamily: 'JetBrains Mono, monospace' }}>
                  Thank you for applying. We will get back to you shortly.
                </p>
              </div>
            ) : (
              <>
                <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.95rem', color: '#111', marginBottom: 18 }}>
                  Apply for this position
                </h2>
                <ApplyForm job={job} onSubmitted={() => setSubmitted(true)} />
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
