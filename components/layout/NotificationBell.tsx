'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useNotifications } from '@/lib/use-notifications'
import type { AppNotification } from '@/lib/types'

const ENTITY_ROUTES: Partial<Record<string, string>> = {
  meet:              '/meet-visualizer',
  candidate:         '/crm/candidates',
  project:           '/crm/projects',
  project_candidate: '/crm/candidates',
}

const TYPE_COLORS: Record<string, string> = {
  success: '#00a87a',
  info:    '#0091c7',
  warning: '#f59e0b',
}

const TYPE_ICONS: Record<string, string> = {
  success: '✓',
  info:    'i',
  warning: '!',
}

interface Props {
  userId: string
}

export default function NotificationBell({ userId }: Props) {
  const { notifications, unreadCount, markRead, markAllRead } = useNotifications(userId)
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleOpen() {
    setOpen(o => !o)
  }

  function formatTs(ts: number): string {
    const now   = Date.now()
    const diff  = now - ts
    const mins  = Math.floor(diff / 60_000)
    const hours = Math.floor(diff / 3_600_000)
    const days  = Math.floor(diff / 86_400_000)
    if (mins < 1)    return 'just now'
    if (mins < 60)   return `${mins}m ago`
    if (hours < 24)  return `${hours}h ago`
    return `${days}d ago`
  }

  function handleNotificationClick(n: AppNotification) {
    if (!n.read) markRead(n.id)
    const base = ENTITY_ROUTES[n.entityType]
    if (base) {
      const url = n.entityType === 'meet'
        ? `${base}?meetId=${n.entityId}`
        : `${base}?id=${n.entityId}`
      setOpen(false)
      router.push(url)
    }
  }

  return (
    <div style={{ position: 'relative' }}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        style={{
          position: 'relative',
          width: 36, height: 36, borderRadius: 9,
          border: 'none',
          background: open ? 'rgba(0,168,122,0.12)' : 'transparent',
          cursor: 'pointer', display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          transition: 'background 0.15s',
          fontSize: '1rem',
        }}
        title="Notifications"
      >
        🔔
        {unreadCount > 0 && (
          <span style={{
            position: 'absolute', top: 3, right: 3,
            minWidth: 16, height: 16, borderRadius: 8,
            background: '#e0457a', color: 'white',
            fontSize: '0.6rem', fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'Syne, sans-serif', lineHeight: 1,
            padding: '0 3px',
          }}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Drawer */}
      {open && (
        <>
          {/* Backdrop */}
          <div
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed', inset: 0, zIndex: 198,
            }}
          />

          {/* Panel */}
          <div style={{
            position: 'fixed', bottom: 60, left: 10,
            width: 320, maxHeight: 420,
            background: 'rgba(255,255,255,0.98)',
            borderRadius: 14,
            boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
            border: '1px solid rgba(0,168,122,0.15)',
            backdropFilter: 'blur(12px)',
            zIndex: 199,
            display: 'flex', flexDirection: 'column',
            overflow: 'hidden',
          }}>
            {/* Header */}
            <div style={{
              padding: '14px 16px 12px',
              borderBottom: '1px solid rgba(0,168,122,0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{
                fontFamily: 'Syne, sans-serif', fontWeight: 800,
                fontSize: '0.88rem', color: 'var(--text)',
              }}>
                Notifications
                {unreadCount > 0 && (
                  <span style={{
                    marginLeft: 8, padding: '1px 7px', borderRadius: 10,
                    background: 'rgba(224,69,122,0.1)', color: '#e0457a',
                    fontSize: '0.72rem', fontWeight: 700,
                  }}>
                    {unreadCount} new
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={() => markAllRead()}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer',
                    fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 600,
                    fontFamily: 'JetBrains Mono, monospace', padding: 0,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notifications.length === 0 ? (
                <div style={{
                  padding: '32px 16px', textAlign: 'center',
                  fontSize: '0.78rem', color: 'var(--text-dim)',
                  fontFamily: 'JetBrains Mono, monospace',
                }}>
                  No notifications yet
                </div>
              ) : (
                notifications.map(n => (
                  <div
                    key={n.id}
                    onClick={() => handleNotificationClick(n)}
                    style={{
                      padding: '11px 16px',
                      borderBottom: '1px solid rgba(0,168,122,0.06)',
                      background: n.read ? 'transparent' : 'rgba(0,168,122,0.04)',
                      cursor: ENTITY_ROUTES[n.entityType] ? 'pointer' : 'default',
                      display: 'flex', gap: 10, alignItems: 'flex-start',
                      transition: 'background 0.1s',
                    }}
                  >
                    {/* Type dot */}
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                      background: `${TYPE_COLORS[n.type]}18`,
                      border: `1.5px solid ${TYPE_COLORS[n.type]}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.65rem', fontWeight: 700,
                      color: TYPE_COLORS[n.type],
                      marginTop: 1,
                    }}>
                      {TYPE_ICONS[n.type]}
                    </div>

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontSize: '0.78rem', fontWeight: n.read ? 500 : 700,
                        color: 'var(--text)', fontFamily: 'Syne, sans-serif',
                        lineHeight: 1.3,
                      }}>
                        {n.title}
                      </div>
                      <div style={{
                        fontSize: '0.72rem', color: 'var(--text-dim)',
                        fontFamily: 'JetBrains Mono, monospace', marginTop: 2,
                        lineHeight: 1.4,
                      }}>
                        {n.body}
                      </div>
                      <div style={{
                        fontSize: '0.65rem', color: 'var(--text-dim)',
                        fontFamily: 'JetBrains Mono, monospace', marginTop: 3,
                      }}>
                        {formatTs(n.ts)}
                      </div>
                    </div>

                    {!n.read && (
                      <div style={{
                        width: 7, height: 7, borderRadius: '50%',
                        background: '#e0457a', flexShrink: 0, marginTop: 6,
                      }} />
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
