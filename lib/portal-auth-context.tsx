'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { useAuth } from './auth-context'
import { checkPortalAllowlist, type PortalCandidate } from './portal'

interface PortalAuthContextType {
  candidate: PortalCandidate | null
  loading: boolean
}

const PortalAuthContext = createContext<PortalAuthContextType>({ candidate: null, loading: true })

export function PortalAuthProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth()
  const [candidate, setCandidate] = useState<PortalCandidate | null>(null)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    if (authLoading) return
    if (!user?.email) {
      setCandidate(null)
      setLoading(false)
      return
    }
    checkPortalAllowlist(user.email)
      .then(c => setCandidate(c))
      .finally(() => setLoading(false))
  }, [user, authLoading])

  return (
    <PortalAuthContext.Provider value={{ candidate, loading }}>
      {children}
    </PortalAuthContext.Provider>
  )
}

export const usePortalAuth = () => useContext(PortalAuthContext)
