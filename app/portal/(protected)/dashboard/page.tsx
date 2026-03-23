'use client'

import { useState, useEffect, useRef } from 'react'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { usePortalAuth } from '@/lib/portal-auth-context'
import { useAuth } from '@/lib/auth-context'
import {
  getCandidateSubmissions, createPortalSubmission, uploadPortalFile, logPortalAccess,
  type PortalSubmission, type SubmissionType,
} from '@/lib/portal'
import { useRouter } from 'next/navigation'

export default function PortalDashboard() {
  const { candidate }     = usePortalAuth()
  const { user }          = useAuth()
  const router            = useRouter()
  const [submissions, setSubmissions] = useState<PortalSubmission[]>([])
  const [loadingData, setLoadingData] = useState(true)
  const [showUpload, setShowUpload]   = useState(false)

  useEffect(() => {
    if (!user) return
    getCandidateSubmissions(user.uid)
      .then(setSubmissions)
      .finally(() => setLoadingData(false))
  }, [user])

  async function handleSignOut() {
    await signOut(auth)
    router.replace('/portal/login')
  }

  const pending = submissions.filter(s => s.status === 'pending').length
  const paid    = submissions.filter(s => s.status === 'paid').length

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)', position: 'relative', overflow: 'hidden' }}>
      <div className="aurora">
        <div className="aurora-blob" /><div className="aurora-blob" /><div className="aurora-blob" />
      </div>

      {/* Header */}
      <header style={{
        position: 'relative', zIndex: 10,
        padding: '16px 32px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid rgba(0,168,122,0.12)',
        backdropFilter: 'blur(8px)',
        background: 'rgba(240,250,248,0.6)',
      }}>
        <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.1rem', color: 'var(--primary)' }}>
          Splendit<span style={{ color: 'var(--secondary)' }}>Portal</span>
        </span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{candidate?.name}</span>
          <button onClick={handleSignOut} style={outlineBtnStyle}>Sign out</button>
        </div>
      </header>

      <main style={{ maxWidth: 860, margin: '0 auto', padding: '36px 24px', position: 'relative', zIndex: 1 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.5rem', color: 'var(--text)', marginBottom: 4 }}>
          Welcome, {candidate?.name?.split(' ')[0]}
        </h1>
        <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginBottom: 28 }}>
          Upload your invoices and timesheets here. We&apos;ll notify the accounting team automatically.
        </p>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 28 }}>
          <StatCard label="Total submitted" value={submissions.length} color="var(--primary)" />
          <StatCard label="Pending" value={pending} color="var(--secondary)" />
          <StatCard label="Paid" value={paid} color="#6b46a8" />
        </div>

        <div style={{ marginBottom: 24 }}>
          <button onClick={() => setShowUpload(true)} style={primaryBtnStyle}>
            + Upload document
          </button>
        </div>

        {/* Table */}
        <div className="glass-card" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid rgba(0,168,122,0.1)' }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.9rem', color: 'var(--text)' }}>
              My Submissions
            </span>
          </div>

          {loadingData ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.83rem' }}>Loading...</div>
          ) : submissions.length === 0 ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.83rem' }}>
              No submissions yet. Upload your first document above.
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace' }}>
              <thead>
                <tr style={{ background: 'rgba(0,168,122,0.05)' }}>
                  {['Date', 'Type', 'Month', 'File', 'Amount', 'Status'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {submissions.map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid rgba(0,168,122,0.06)' }}>
                    <td style={tdStyle}>{formatDate(s.uploadedAt)}</td>
                    <td style={tdStyle}><span style={typeBadge(s.type)}>{s.type}</span></td>
                    <td style={tdStyle}>{s.month}</td>
                    <td style={tdStyle}>
                      <a href={s.fileUrl} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--secondary)', textDecoration: 'none' }}>
                        {truncate(s.fileName, 24)}
                      </a>
                    </td>
                    <td style={tdStyle}>{s.amount ? `${s.amount.toLocaleString()} CZK` : '—'}</td>
                    <td style={tdStyle}><span style={statusBadge(s.status)}>{s.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

      {showUpload && candidate && user && (
        <UploadModal
          candidate={candidate}
          userId={user.uid}
          onClose={() => setShowUpload(false)}
          onSuccess={sub => {
            setSubmissions(prev => [sub, ...prev])
            setShowUpload(false)
            logPortalAccess(user.uid, user.email!, 'upload', { fileName: sub.fileName, type: sub.type })
          }}
        />
      )}
    </div>
  )
}

// ─── Upload Modal ─────────────────────────────────────────────────────────────

interface UploadModalProps {
  candidate: { id: string; name: string; email: string }
  userId: string
  onClose: () => void
  onSuccess: (sub: PortalSubmission) => void
}

function UploadModal({ candidate, userId, onClose, onSuccess }: UploadModalProps) {
  const [type, setType]         = useState<SubmissionType>('invoice')
  const [month, setMonth]       = useState(currentMonth())
  const [amount, setAmount]     = useState('')
  const [note, setNote]         = useState('')
  const [file, setFile]         = useState<File | null>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError]       = useState('')
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleUpload(e: React.FormEvent) {
    e.preventDefault()
    if (!file) { setError('Please select a file.'); return }
    setError('')
    setProgress(0)

    try {
      const fileUrl = await uploadPortalFile(userId, file, pct => setProgress(pct))
      const id = await createPortalSubmission({
        candidateId:    userId,
        candidateEmail: candidate.email,
        candidateName:  candidate.name,
        type,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        month,
        ...(amount && { amount: Number(amount) }),
        ...(note   && { note }),
      })
      const sub: PortalSubmission = {
        id,
        candidateId: userId,
        candidateEmail: candidate.email,
        candidateName: candidate.name,
        type,
        fileName: file.name,
        fileUrl,
        fileSize: file.size,
        month,
        ...(amount && { amount: Number(amount) }),
        ...(note   && { note }),
        status: 'pending',
        uploadedAt: { seconds: Date.now() / 1000, nanoseconds: 0 } as never,
      }
      // Fire-and-forget email notification
      fetch('/api/portal/notify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          candidateName:  candidate.name,
          candidateEmail: candidate.email,
          type,
          month,
          fileName: file.name,
          fileUrl,
          ...(amount && { amount: Number(amount) }),
        }),
      }).catch(console.error)

      onSuccess(sub)
    } catch {
      setError('Upload failed. Please try again.')
      setProgress(null)
    }
  }

  return (
    <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="glass-card" style={{ width: 440, padding: '32px 28px', position: 'relative', zIndex: 1 }}>
        <h2 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', marginBottom: 20, color: 'var(--text)' }}>
          Upload document
        </h2>

        <form onSubmit={handleUpload} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {/* Type toggle */}
          <div>
            <label style={modalLabelStyle}>TYPE</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {(['invoice', 'timesheet'] as SubmissionType[]).map(t => (
                <button key={t} type="button" onClick={() => setType(t)} style={typeToggle(type === t)}>
                  {t}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={modalLabelStyle}>MONTH</label>
            <input type="month" value={month} onChange={e => setMonth(e.target.value)} required style={modalInputStyle} />
          </div>

          <div>
            <label style={modalLabelStyle}>AMOUNT (CZK) — optional</label>
            <input type="number" value={amount} onChange={e => setAmount(e.target.value)}
              min="0" placeholder="e.g. 45000" style={modalInputStyle} />
          </div>

          <div>
            <label style={modalLabelStyle}>NOTE — optional</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)}
              placeholder="Any notes for accounting" style={modalInputStyle} />
          </div>

          <div>
            <label style={modalLabelStyle}>FILE (PDF, JPG, PNG)</label>
            <div onClick={() => fileRef.current?.click()} style={{
              border: '1.5px dashed rgba(0,168,122,0.3)',
              borderRadius: 9, padding: 18, textAlign: 'center', cursor: 'pointer',
              background: 'rgba(240,250,248,0.5)',
              fontSize: '0.8rem',
              color: file ? 'var(--primary)' : 'var(--text-muted)',
            }}>
              {file ? file.name : 'Click to select file'}
            </div>
            <input ref={fileRef} type="file" accept=".pdf,.jpg,.jpeg,.png"
              style={{ display: 'none' }}
              onChange={e => e.target.files?.[0] && setFile(e.target.files[0])} />
          </div>

          {progress !== null && (
            <div style={{ background: 'rgba(0,168,122,0.1)', borderRadius: 6, overflow: 'hidden', height: 6 }}>
              <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', transition: 'width 0.2s' }} />
            </div>
          )}

          {error && <p style={{ fontSize: '0.75rem', color: '#e0457a' }}>{error}</p>}

          <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
            <button type="button" onClick={onClose} style={outlineBtnStyle}>Cancel</button>
            <button type="submit" disabled={progress !== null} style={{ ...primaryBtnStyle, flex: 1 }}>
              {progress !== null ? `Uploading ${progress}%...` : 'Upload'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="glass-card" style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: '1.6rem', fontWeight: 700, fontFamily: 'Syne, sans-serif', color }}>{value}</div>
      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: 2 }}>{label}</div>
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function currentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatDate(ts: { seconds: number }): string {
  return new Date(ts.seconds * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function truncate(str: string, len: number): string {
  return str.length > len ? str.slice(0, len) + '…' : str
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const thStyle: React.CSSProperties = {
  padding: '10px 14px', textAlign: 'left',
  fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600,
  letterSpacing: '0.05em', fontFamily: 'Syne, sans-serif',
}

const tdStyle: React.CSSProperties = {
  padding: '10px 14px', color: 'var(--text)', verticalAlign: 'middle',
}

const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, zIndex: 50,
  background: 'rgba(15,46,42,0.5)', backdropFilter: 'blur(4px)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
}

const primaryBtnStyle: React.CSSProperties = {
  padding: '10px 20px', borderRadius: 9, border: 'none',
  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
  color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
  fontSize: '0.85rem', cursor: 'pointer',
}

const outlineBtnStyle: React.CSSProperties = {
  padding: '8px 16px', borderRadius: 8,
  border: '1px solid rgba(0,168,122,0.3)', background: 'transparent',
  color: 'var(--text-muted)', fontFamily: 'Syne, sans-serif',
  fontWeight: 600, fontSize: '0.8rem', cursor: 'pointer',
}

const modalInputStyle: React.CSSProperties = {
  width: '100%', padding: '9px 13px', borderRadius: 9,
  border: '1px solid rgba(0,168,122,0.2)', background: 'rgba(240,250,248,0.8)',
  fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text)', outline: 'none', boxSizing: 'border-box',
}

const modalLabelStyle: React.CSSProperties = {
  fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 600,
  display: 'block', marginBottom: 5, letterSpacing: '0.05em',
}

const typeToggle = (active: boolean): React.CSSProperties => ({
  padding: '7px 16px', borderRadius: 8,
  border: active ? 'none' : '1px solid rgba(0,168,122,0.25)',
  background: active ? 'linear-gradient(135deg, var(--primary), var(--secondary))' : 'transparent',
  color: active ? 'white' : 'var(--text-muted)',
  fontFamily: 'Syne, sans-serif', fontWeight: 600, fontSize: '0.8rem',
  cursor: 'pointer', textTransform: 'capitalize',
})

const statusBadge = (status: string): React.CSSProperties => ({
  padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
  background: status === 'paid' ? 'rgba(0,168,122,0.15)' : status === 'rejected' ? 'rgba(224,69,122,0.12)' : 'rgba(0,145,199,0.12)',
  color: status === 'paid' ? 'var(--primary)' : status === 'rejected' ? '#e0457a' : 'var(--secondary)',
})

const typeBadge = (type: string): React.CSSProperties => ({
  padding: '2px 8px', borderRadius: 4, fontSize: '0.7rem', fontWeight: 600,
  background: type === 'invoice' ? 'rgba(107,70,168,0.12)' : 'rgba(43,184,176,0.12)',
  color: type === 'invoice' ? '#6b46a8' : '#2db8b0',
  textTransform: 'capitalize',
})
