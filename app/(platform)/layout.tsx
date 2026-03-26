'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import Sidebar from '@/components/layout/Sidebar'
import { upsertTeamMember } from '@/lib/team'

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !user) {
      router.replace('/login')
    }
  }, [user, loading, router])

  useEffect(() => {
    if (!user) return
    upsertTeamMember({
      uid:         user.uid,
      displayName: user.displayName ?? user.email ?? 'Unknown',
      email:       user.email ?? '',
    }).catch(() => {})
  }, [user?.uid])

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg0)',
      }}>
        <div style={{
          width: 36, height: 36,
          border: '3px solid rgba(0,168,122,0.2)',
          borderTopColor: 'var(--primary)',
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    )
  }

  if (!user) return null

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg0)', position: 'relative' }}>
      {/* Aurora */}
      <div className="aurora">
        <div className="aurora-blob" />
        <div className="aurora-blob" />
        <div className="aurora-blob" />
      </div>

      <Sidebar />

      <main style={{
        marginLeft: 'var(--sidebar-width)',
        flex: 1,
        padding: '32px 36px',
        position: 'relative',
        zIndex: 1,
      }}>
        {children}
      </main>
    </div>
  )
}
