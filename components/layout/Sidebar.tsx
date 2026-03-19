'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'firebase/auth'
import { auth } from '@/lib/firebase'

const modules = [
  { href: '/dashboard',       icon: '⬡', label: 'Dashboard' },
  { href: '/crm/kandidati',   icon: '👤', label: 'Kandidáti' },
  { href: '/crm/spolecnosti', icon: '🏢', label: 'Společnosti' },
  { href: '/crm/projekty',    icon: '📁', label: 'Projekty' },
  { href: '/ims',             icon: '🎯', label: 'IMS' },
  { href: '/meet-visualizer', icon: '🕸', label: 'Meet Visualizer' },
  { href: '/deal-radar',      icon: '📡', label: 'Deal Radar' },
  { href: '/bodyshop',        icon: '🏗', label: 'Bodyshop' },
  { href: '/bot',             icon: '🤖', label: 'SplenditBot' },
]

export default function Sidebar() {
  const pathname = usePathname()

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      minHeight: '100vh',
      background: 'rgba(255,255,255,0.75)',
      borderRight: '1px solid rgba(0,168,122,0.12)',
      backdropFilter: 'blur(16px)',
      display: 'flex',
      flexDirection: 'column',
      padding: '0',
      position: 'fixed',
      top: 0,
      left: 0,
      zIndex: 50,
    }}>
      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid rgba(0,168,122,0.1)',
      }}>
        <span style={{
          fontFamily: 'Syne, sans-serif',
          fontWeight: 800,
          fontSize: '1.2rem',
          color: 'var(--primary)',
          letterSpacing: '-0.02em',
        }}>
          Splendit<span style={{ color: 'var(--secondary)' }}>Suite</span>
        </span>
        <div style={{ fontSize: '0.65rem', color: 'var(--text-dim)', marginTop: 2 }}>
          splendidjob.cz
        </div>
      </div>

      {/* Nav */}
      <nav style={{ flex: 1, padding: '12px 10px', display: 'flex', flexDirection: 'column', gap: 2 }}>
        {modules.map((m) => {
          const active = pathname.startsWith(m.href)
          return (
            <Link
              key={m.href}
              href={m.href}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '9px 12px',
                borderRadius: 9,
                textDecoration: 'none',
                fontFamily: 'JetBrains Mono, monospace',
                fontSize: '0.78rem',
                fontWeight: active ? 600 : 400,
                color: active ? 'var(--primary)' : 'var(--text-muted)',
                background: active ? 'rgba(0,168,122,0.1)' : 'transparent',
                borderLeft: active ? '3px solid var(--primary)' : '3px solid transparent',
                transition: 'all 0.15s',
              }}
            >
              <span style={{ fontSize: '1rem', opacity: 0.85 }}>{m.icon}</span>
              {m.label}
            </Link>
          )
        })}
      </nav>

      {/* Odhlásit */}
      <div style={{ padding: '12px 10px', borderTop: '1px solid rgba(0,168,122,0.1)' }}>
        <button
          onClick={() => signOut(auth)}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 9,
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.78rem',
            color: 'var(--text-dim)',
            transition: 'all 0.15s',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#e0457a')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-dim)')}
        >
          <span>🚪</span> Odhlásit se
        </button>
      </div>
    </aside>
  )
}
