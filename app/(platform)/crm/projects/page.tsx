export default function Page() {
  return (
    <div>
      <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)', marginBottom: 8 }}>
        📁 Projekty
      </h1>
      <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginBottom: 32 }}>
        CRM — active positions & clients
      </p>
      <div className="glass-card" style={{ padding: 32, textAlign: 'center', color: 'var(--text-dim)', fontSize: '0.8rem' }}>
        Module is currently in development...
      </div>
    </div>
  )
}
