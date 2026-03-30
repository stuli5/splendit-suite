'use client'

import { useState } from 'react'

const STEPS = [
  {
    n: 1,
    title: 'Download the extension',
    body:  'Click the button below to download the SplenditSuite Chrome Extension as a ZIP file.',
  },
  {
    n: 2,
    title: 'Unzip the file',
    body:  'Unzip the downloaded file to a permanent folder on your computer (e.g. Documents/splendit-extension). Do not delete this folder after installation.',
  },
  {
    n: 3,
    title: 'Open Chrome Extensions',
    body:  'Type chrome://extensions in your browser address bar. Enable "Developer mode" using the toggle in the top-right corner.',
  },
  {
    n: 4,
    title: 'Load the extension',
    body:  'Click "Load unpacked" and select the unzipped folder.',
  },
  {
    n: 5,
    title: 'Configure the extension',
    body:  'Click the SplenditSuite (S) icon in your Chrome toolbar. Enter the SplenditSuite URL and the API key provided by your admin, then click Save.',
  },
  {
    n: 6,
    title: 'Start importing',
    body:  'Open any LinkedIn profile. You will see a green button (bottom-right). Click it to import the candidate directly into the CRM.',
  },
]

export default function ExtensionPage() {
  const [copied, setCopied] = useState(false)
  const siteUrl = typeof window !== 'undefined' ? window.location.origin : 'https://splendidjob.cz'

  function handleCopyUrl() {
    navigator.clipboard.writeText(siteUrl).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  return (
    <div style={{ maxWidth: 680 }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <h1 style={{
          fontFamily: 'Syne, sans-serif', fontWeight: 800,
          fontSize: '1.8rem', color: 'var(--text)', marginBottom: 8,
        }}>
          LinkedIn Importer Extension
        </h1>
        <p style={{
          fontSize: '0.88rem', color: 'var(--text-muted)',
          fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.6,
        }}>
          Import LinkedIn profiles directly into the CRM with one click — without leaving LinkedIn.
        </p>
      </div>

      {/* Download card */}
      <div className="glass-card" style={{ padding: '24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1rem', color: 'var(--text)', marginBottom: 4 }}>
              SplenditSuite LinkedIn Importer
            </div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-dim)', fontFamily: 'JetBrains Mono, monospace' }}>
              Chrome Extension · v1.1.0 · For internal use only
            </div>
            <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {['Auto-detects existing candidates', 'Update mode', 'Better headline extraction'].map(tag => (
                <span key={tag} style={{
                  padding: '2px 8px', borderRadius: 10,
                  background: 'rgba(0,168,122,0.08)',
                  border: '1px solid rgba(0,168,122,0.2)',
                  fontSize: '0.68rem', color: 'var(--primary)',
                  fontFamily: 'JetBrains Mono, monospace', fontWeight: 600,
                }}>{tag}</span>
              ))}
            </div>
          </div>
          <a
            href="/extension/splendit-linkedin-importer.zip"
            download
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              padding: '10px 22px', borderRadius: 9,
              background: 'var(--primary)', color: 'white',
              fontFamily: 'Syne, sans-serif', fontWeight: 700,
              fontSize: '0.85rem', textDecoration: 'none',
            }}
          >
            ↓ Download ZIP
          </a>
        </div>
      </div>

      {/* Config info */}
      <div className="glass-card" style={{ padding: '20px 24px', marginBottom: 28 }}>
        <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text)', marginBottom: 14 }}>
          Extension Configuration
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {/* URL */}
          <div>
            <div style={{ fontSize: '0.68rem', fontWeight: 600, color: '#555', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>
              SplenditSuite URL
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                readOnly
                value={siteUrl}
                style={{
                  flex: 1, padding: '9px 12px',
                  border: '1.5px solid rgba(0,168,122,0.25)',
                  borderRadius: 8, fontSize: '0.78rem',
                  fontFamily: 'JetBrains Mono, monospace',
                  background: 'rgba(0,168,122,0.04)',
                  color: 'var(--text)', outline: 'none',
                }}
              />
              <button
                onClick={handleCopyUrl}
                style={{
                  padding: '9px 16px', borderRadius: 8,
                  border: '1.5px solid rgba(0,168,122,0.3)',
                  background: copied ? 'var(--primary)' : 'transparent',
                  color: copied ? 'white' : 'var(--primary)',
                  fontFamily: 'Syne, sans-serif', fontWeight: 700,
                  fontSize: '0.78rem', cursor: 'pointer',
                  transition: 'all 0.15s', whiteSpace: 'nowrap',
                }}
              >
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </div>

          {/* API Key note */}
          <div style={{
            padding: '12px 14px',
            background: 'rgba(107,70,168,0.06)',
            border: '1px solid rgba(107,70,168,0.2)',
            borderRadius: 8,
            fontSize: '0.78rem', color: 'var(--text-muted)',
            fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.55,
          }}>
            <strong style={{ color: '#6b46a8' }}>API Key:</strong> Contact your administrator to get the API key.
            It is stored securely in the server environment and should be shared via a private channel (e.g. Slack DM).
          </div>
        </div>
      </div>

      {/* Installation steps */}
      <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.95rem', color: 'var(--text)', marginBottom: 16 }}>
        Installation Guide
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STEPS.map(step => (
          <div
            key={step.n}
            className="glass-card"
            style={{ padding: '14px 18px', display: 'flex', gap: 14, alignItems: 'flex-start' }}
          >
            <div style={{
              width: 26, height: 26, borderRadius: '50%', flexShrink: 0,
              background: 'rgba(0,168,122,0.1)',
              border: '2px solid var(--primary)',
              color: 'var(--primary)',
              fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '0.78rem',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {step.n}
            </div>
            <div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '0.83rem', color: 'var(--text)', marginBottom: 3 }}>
                {step.title}
              </div>
              <div style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.55 }}>
                {step.body}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Warning note */}
      <div style={{
        marginTop: 20, padding: '12px 16px',
        background: 'rgba(245,158,11,0.08)',
        border: '1px solid rgba(245,158,11,0.25)',
        borderRadius: 10,
        fontSize: '0.74rem', color: 'var(--text-muted)',
        fontFamily: 'JetBrains Mono, monospace', lineHeight: 1.55,
      }}>
        <strong style={{ color: '#d97706' }}>Important:</strong> Developer Mode must remain enabled in Chrome for the extension to work.
        This extension is for internal use only — it reads LinkedIn profile data only when you manually open a profile.
      </div>

    </div>
  )
}
