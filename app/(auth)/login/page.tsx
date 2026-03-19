'use client'

import { useState } from 'react'
import { signInWithEmailAndPassword } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)
  const router = useRouter()

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push('/dashboard')
    } catch {
      setError('Invalid email or password.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'var(--bg0)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Aurora */}
      <div className="aurora">
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
      </div>

      {/* Card */}
      <div className="glass-card" style={{ width: 380, padding: '40px 36px', position: 'relative', zIndex: 1 }}>
        <div style={{ marginBottom: 32, textAlign: 'center' }}>
          <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.6rem', color: 'var(--primary)' }}>
            Splendit<span style={{ color: 'var(--secondary)' }}>Suite</span>
          </h1>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-dim)', marginTop: 4 }}>
            IT Recruitment Platform
          </p>
        </div>

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 5 }}>
              EMAIL
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 9,
                border: '1px solid rgba(0,168,122,0.2)',
                background: 'rgba(240,250,248,0.8)',
                fontSize: '0.82rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 500, display: 'block', marginBottom: 5 }}>
              PASSWORD
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '10px 14px',
                borderRadius: 9,
                border: '1px solid rgba(0,168,122,0.2)',
                background: 'rgba(240,250,248,0.8)',
                fontSize: '0.82rem',
                fontFamily: 'JetBrains Mono, monospace',
                color: 'var(--text)',
                outline: 'none',
              }}
            />
          </div>

          {error && (
            <p style={{ fontSize: '0.75rem', color: '#e0457a', textAlign: 'center' }}>{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            style={{
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
            }}
          >
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}
