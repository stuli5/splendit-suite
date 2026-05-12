'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import { useAuth } from '@/lib/auth-context'
import { useSidebar } from '@/lib/sidebar-context'
import NotificationBell from './NotificationBell'

const modules = [
  { href: '/dashboard',       icon: '⬡', label: 'Dashboard' },
  { href: '/crm/candidates',  icon: '👤', label: 'Candidates' },
  { href: '/crm/analytics',  icon: '📊', label: 'Funnel Analytics' },
  { href: '/crm/spolecnosti', icon: '🏢', label: 'Companies' },
  { href: '/crm/projects',    icon: '📁', label: 'Projects' },
  { href: '/ims',             icon: '🎯', label: 'IMS' },
  { href: '/meet-visualizer', icon: '🕸', label: 'Meet Visualizer' },
  { href: '/deal-radar',      icon: '📡', label: 'Deal Radar' },
  { href: '/bodyshop',        icon: '🏗', label: 'Bodyshop' },
  { href: '/bot',             icon: '🤖', label: 'SplenditBot' },
  { href: '/jobs',            icon: '💼', label: 'Jobs' },
]

export default function Sidebar() {
  const pathname  = usePathname()
  const { user }  = useAuth()
  const { collapsed } = useSidebar()

  return (
    <aside style={{
      width: collapsed ? 64 : 220,
      minHeight: '100vh',
      background: 'rgba(255,255,255,0.75)',
      borderRight: '1px solid rgba(0,168,122,0.12)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      flexDirection: 'column',
      padding: 0,
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 50,
      transition: 'width 0.22s ease',
      overflow: 'hidden',
    }}>

      {/* Logo */}
      <div style={{
        padding: collapsed ? '24px 0' : '24px 20px 20px',
        borderBottom: '1px solid rgba(0,168,122,0.1)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'flex-start',
        overflow: 'hidden',
        flexShrink: 0,
      }}>
        {collapsed ? (
          <span style={{
            fontFamily: 'Syne, sans-serif', fontWeight: 800,
            fontSize: '1.15rem', color: 'var(--primary)', letterSpacing: '-0.02em',
          }}>S</span>
        ) : (
          <div>
            <span style={{
              fontFamily: 'Syne, sans-serif', fontWeight: 800,
              fontSize: '1.2rem', color: 'var(--primary)', letterSpacing: '-0.02em',
            }}>
              Splendit<span style={{ color: 'var(--secondary)' }}>Suite</span>
            </span>
            <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>
              splendidjob.cz
            </div>
          </div>
        )}
      </div>

      {/* Nav */}
      <nav style={{
        flex: 1,
        padding: collapsed ? '12px 0' : '12px 10px',
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        overflowY: 'auto',
      }}>
        {modules.map((m) => {
          const active = pathname.startsWith(m.href)
          return (
            <Link
              key={m.href}
              href={m.href}
              title={collapsed ? m.label : undefined}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                gap: collapsed ? 0 : 10,
                padding: collapsed ? '11px 0' : '9px 12px',
                borderRadius: collapsed ? 0 : 9,
                textDecoration: 'none',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.78rem',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                background: active ? 'rgba(0,168,122,0.1)' : 'transparent',
                borderLeft: active ? `3px solid var(--primary)` : '3px solid transparent',
                transition: 'all 0.15s',
                whiteSpace: 'nowrap',
              }}
            >
              <span style={{ fontSize: '1.05rem', opacity: 0.85, flexShrink: 0 }}>{m.icon}</span>
              {!collapsed && m.label}
            </Link>
          )
        })}
      </nav>

      {/* Notifications */}
      {user && !collapsed && (
        <div style={{ padding: '8px 10px', borderTop: '1px solid rgba(0,168,122,0.1)' }}>
          <NotificationBell userId={user.uid} />
        </div>
      )}

      {/* Settings */}
      {!collapsed && (
        <div style={{ padding: '4px 10px' }}>
          <Link
            href="/settings/extension"
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 9,
              fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem',
              color: 'var(--text-dim)', textDecoration: 'none',
              transition: 'color 0.15s',
            }}
          >
            <span>🔌</span> LinkedIn Extension
          </Link>
        </div>
      )}

      {/* Sign out */}
      <div style={{ padding: collapsed ? '12px 0' : '12px 10px', borderTop: '1px solid rgba(0,168,122,0.1)' }}>
        <button
          onClick={() => signOut(auth)}
          title={collapsed ? 'Sign out' : undefined}
          style={{
            width: '100%',
            padding: collapsed ? '11px 0' : '9px 12px',
            borderRadius: collapsed ? 0 : 9,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: collapsed ? 'center' : 'flex-start',
            gap: collapsed ? 0 : 10,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#e0457a')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          <span>🚪</span>
          {!collapsed && ' Sign out'}
        </button>
      </div>
    </aside>
  )
}
