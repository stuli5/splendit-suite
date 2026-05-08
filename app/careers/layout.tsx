import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Open Positions | SplendIT',
  description: 'Open IT positions at SplendIT — IT consulting and staffing based in Prague.',
}

export default function CareersLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5' }}>
      <header style={{
        background: '#fff',
        borderBottom: '1px solid #ebebeb',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ maxWidth: 960, margin: '0 auto', padding: '0 28px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 66 }}>
          <a href="https://splendit.cz" target="_blank" rel="noreferrer" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 0 }}>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 900, fontSize: '1.45rem', color: '#111', letterSpacing: '-0.03em' }}>
              Splend<span style={{ color: '#00a87a' }}>IT</span>
            </span>
            <span style={{ margin: '0 10px', color: '#ccc', fontWeight: 300, fontSize: '1.2rem' }}>/</span>
            <span style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: '#111', letterSpacing: '-0.01em' }}>
              jobs
            </span>
          </a>
          <a href="mailto:info@splendit.cz" style={{ fontSize: '0.78rem', color: '#555', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontWeight: 500 }}>
            info@splendit.cz
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
