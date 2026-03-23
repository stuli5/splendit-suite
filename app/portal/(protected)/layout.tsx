'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { PortalAuthProvider, usePortalAuth } from '@/lib/portal-auth-context'

function PortalGuard({ children }: { children: React.ReactNode }) {
  const { candidate, loading } = usePortalAuth()
  const router = useRouter()

  useEffect(() => {
    if (!loading && !candidate) {
      router.replace('/portal/login')
    }
  }, [candidate, loading, router])

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

  if (!candidate) return null

  return <>{children}</>
}

export default function PortalProtectedLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalAuthProvider>
      <PortalGuard>{children}</PortalGuard>
    </PortalAuthProvider>
  )
}
