import Link from 'next/link'

const modules = [
  { href: '/crm/kandidati',   icon: '👤', label: 'Kandidáti',      desc: 'Správa kandidátů a pipeline',       color: '#00a87a' },
  { href: '/crm/spolecnosti', icon: '🏢', label: 'Společnosti',    desc: 'Klienti a partnerské firmy',        color: '#0091c7' },
  { href: '/crm/projekty',    icon: '📁', label: 'Projekty',       desc: 'Aktivní pozice a zakázky',          color: '#2db8b0' },
  { href: '/ims',             icon: '🎯', label: 'IMS',            desc: 'Interview Management System',       color: '#6b46a8' },
  { href: '/meet-visualizer', icon: '🕸', label: 'Meet Visualizer',desc: 'Vizualizace sítí a meetingů',       color: '#2db8b0' },
  { href: '/deal-radar',      icon: '📡', label: 'Deal Radar',     desc: 'Pipeline dealy a obchodní fáze',   color: '#e0457a' },
  { href: '/bodyshop',        icon: '🏗', label: 'Bodyshop',       desc: 'Správa kontraktorů',                color: '#f59e0b' },
  { href: '/bot',             icon: '🤖', label: 'SplenditBot',    desc: 'Automatizace a AI asistent',        color: '#0091c7' },
]

export default function DashboardPage() {
  return (
    <div>
      <div style={{ marginBottom: 32 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
          Dashboard
        </h1>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
          SplenditSuite — IT Recruitment Platform
        </p>
      </div>

      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
        gap: 16,
      }}>
        {modules.map((m) => (
          <Link key={m.href} href={m.href} style={{ textDecoration: 'none' }}>
            <div className="glass-card" style={{ padding: '24px 22px', cursor: 'pointer' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 10 }}>
                <span style={{
                  fontSize: '1.4rem',
                  width: 40, height: 40,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  borderRadius: 10,
                  background: `${m.color}18`,
                }}>
                  {m.icon}
                </span>
                <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text)' }}>
                  {m.label}
                </span>
              </div>
              <p style={{ fontSize: '0.73rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {m.desc}
              </p>
              <div style={{ marginTop: 14, fontSize: '0.68rem', color: m.color, fontWeight: 600, letterSpacing: '0.05em' }}>
                OTEVŘÍT →
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  )
}
