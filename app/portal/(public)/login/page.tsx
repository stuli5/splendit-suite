'use client'

import { useState, useEffect } from 'react'
import { sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { checkPortalAllowlist, logPortalAccess } from '@/lib/portal'
import { useRouter } from 'next/navigation'

const STORAGE_KEY = 'portalEmailForSignIn'

export default function PortalLoginPage() {
  const [email, setEmail]     = useState('')
  const [step, setStep]       = useState<'form' | 'sent' | 'completing'>('form')
  const [error, setError]     = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  // Handle magic link return
  useEffect(() => {
    if (!isSignInWithEmailLink(auth, window.location.href)) return

    const savedEmail = localStorage.getItem(STORAGE_KEY)
    if (!savedEmail) {
      setError('Session expired. Please request a new link.')
      return
    }

    setStep('completing')
    signInWithEmailLink(auth, savedEmail, window.location.href)
      .then(async result => {
        localStorage.removeItem(STORAGE_KEY)
        await logPortalAccess(result.user.uid, savedEmail, 'login')
        router.replace('/portal/dashboard')
      })
      .catch(() => {
        setError('Invalid or expired link. Please request a new one.')
        setStep('form')
      })
  }, [router])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')

    const candidate = await checkPortalAllowlist(email).catch(() => null)
    if (!candidate) {
      setError('This email is not registered. Please contact Splendit.')
      setLoading(false)
      return
    }

    const actionCodeSettings = {
      url: `${window.location.origin}/portal/login`,
      handleCodeInApp: true,
    }

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings)
      localStorage.setItem(STORAGE_KEY, email)
      setStep('sent')
    } catch {
      setError('Failed to send login link. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'completing') {
    return (
      <div style={centerStyle}>
        <Aurora />
        <div className="glass-card" style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={spinnerStyle} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            <p style={{ marginTop: 16, color: 'var(--text-muted)', fontSize: '0.85rem' }}>Signing you in...</p>
          </div>
        </div>
      </div>
    )
  }

  if (step === 'sent') {
    return (
      <div style={centerStyle}>
        <Aurora />
        <div className="glass-card" style={cardStyle}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>✉️</div>
            <h2 style={headingStyle}>Check your email</h2>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.83rem', marginTop: 8, lineHeight: 1.6 }}>
              We sent a login link to<br />
              <strong style={{ color: 'var(--text)' }}>{email}</strong>.<br />
              The link expires in 1 hour.
            </p>
            <button onClick={() => setStep('form')} style={linkBtnStyle}>
              Use a different email
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={centerStyle}>
      <Aurora />
      <div className="glass-card" style={cardStyle}>
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <h1 style={headingStyle}>
            Splendit<span style={{ color: 'var(--secondary)' }}>Portal</span>
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
            Contractor Self-Service
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={labelStyle}>EMAIL</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="your@email.com"
              style={inputStyle}
            />
          </div>

          {error && (
            <p style={{ fontSize: '0.75rem', color: '#e0457a', textAlign: 'center' }}>{error}</p>
          )}

          <button type="submit" disabled={loading} style={btnStyle(loading)}>
            {loading ? 'Checking...' : 'Send login link'}
          </button>
        </form>

        <p style={{ marginTop: 20, fontSize: '0.72rem', color: 'var(--text-dim)', textAlign: 'center', lineHeight: 1.5 }}>
          No password needed — we&apos;ll email you a secure one-click login link.
        </p>
      </div>
    </div>
  )
}

function Aurora() {
  return (
    <div className="aurora">
      <div className="aurora-blob" />
      <div className="aurora-blob" />
      <div className="aurora-blob" />
    </div>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const centerStyle: React.CSSProperties = {
  minHeight: '100vh',
  background: 'var(--bg0)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  position: 'relative',
  overflow: 'hidden',
}

const cardStyle: React.CSSProperties = {
  width: 380,
  padding: '40px 36px',
  position: 'relative',
  zIndex: 1,
}

const headingStyle: React.CSSProperties = {
  fontFamily: 'Syne, sans-serif',
  fontWeight: 800,
  fontSize: '1.6rem',
  color: 'var(--primary)',
}

const labelStyle: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--text-muted)',
  fontWeight: 500,
  display: 'block',
  marginBottom: 5,
}

const inputStyle: React.CSSProperties = {
  width: '100%',
  padding: '10px 14px',
  borderRadius: 9,
  border: '1px solid rgba(0,168,122,0.2)',
  background: 'rgba(240,250,248,0.8)',
  fontSize: '0.82rem',
  fontFamily: 'JetBrains Mono, monospace',
  color: 'var(--text)',
  outline: 'none',
  boxSizing: 'border-box',
}

const btnStyle = (loading: boolean): React.CSSProperties => ({
  marginTop: 6,
  padding: '11px',
  borderRadius: 9,
  border: 'none',
  background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
  color: 'white',
  fontFamily: 'Syne, sans-serif',
  fontWeight: 700,
  fontSize: '0.9rem',
  cursor: loading ? 'not-allowed' : 'pointer',
  opacity: loading ? 0.7 : 1,
  transition: 'opacity 0.2s',
})

const linkBtnStyle: React.CSSProperties = {
  marginTop: 20,
  background: 'none',
  border: 'none',
  color: 'var(--primary)',
  fontSize: '0.78rem',
  cursor: 'pointer',
  textDecoration: 'underline',
}

const spinnerStyle: React.CSSProperties = {
  width: 36, height: 36,
  border: '3px solid rgba(0,168,122,0.2)',
  borderTopColor: 'var(--primary)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
  margin: '0 auto',
}
