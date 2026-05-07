import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Open Positions | SplendIT',
  description: 'Open IT positions at SplendIT — IT consulting and staffing based in Prague.',
}

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg0)' }}>
      <header style={{
        background: 'rgba(255,255,255,0.88)',
        borderBottom: '1px solid rgba(0,168,122,0.12)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 900, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
          <a href="https://splendit.cz" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.25rem', color: '#00a87a', letterSpacing: '-0.02em' }}>
              Splendit<span style={{ color: '#0091c7' }}>IT</span>
            </span>
            <span style={{ fontSize: '0.7rem', color: '#aaa', borderLeft: '1px solid rgba(0,168,122,0.2)', paddingLeft: 10, fontFamily: 'JetBrains Mono, monospace' }}>
              jobs
            </span>
          </a>
          <a href="mailto:kariera@splendit.cz" style={{ fontSize: '0.78rem', color: 'var(--primary, #00a87a)', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>
            kariera@splendit.cz
          </a>
        </div>
      </header>
      {children}
      <footer style={{
        borderTop: '1px solid rgba(0,168,122,0.1)',
        padding: '28px 24px',
        textAlign: 'center',
        fontSize: '0.72rem',
        color: '#aaa',
        fontFamily: 'JetBrains Mono, monospace',
        marginTop: 60,
      }}>
        © {new Date().getFullYear()} SplendIT s.r.o. · Praha · splendit.cz
      </footer>
    </div>
  )
}
