'use client'

import { useEffect, useRef, useState } from 'react'
import { authFetch } from '@/lib/auth-fetch'

interface Message {
  role: 'user' | 'assistant'
  content: string
  ts: number
}

const SUGGESTIONS = [
  'How do I add a new candidate to a project pipeline?',
  'What\'s the difference between HPP and BS cooperation?',
  'Write interview questions for a Senior React Developer',
  'How should I calculate a recruitment fee?',
  'Explain how the Deal Radar pipeline stages work',
  'What metrics should I track for a recruitment pipeline?',
]

export default function BotPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input,    setInput]    = useState('')
  const [loading,  setLoading]  = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  async function sendMessage(text: string) {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: Message = { role: 'user', content: trimmed, ts: Date.now() }
    const updated = [...messages, userMsg]
    setMessages(updated)
    setInput('')
    setLoading(true)

    try {
      const res  = await authFetch('/api/ai/bot-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: updated.map(m => ({ role: m.role, content: m.content })) }),
      })
      const json = await res.json()
      if (json.reply) {
        setMessages(prev => [...prev, { role: 'assistant', content: json.reply, ts: Date.now() }])
      }
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, something went wrong. Please try again.', ts: Date.now() }])
    }
    setLoading(false)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', maxWidth: 780, margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'Syne, sans-serif', fontWeight: 800, fontSize: '1.8rem', color: 'var(--text)' }}>
          🤖 SplenditBot
        </h1>
        <p style={{ fontSize: '0.78rem', color: 'var(--text-dim)', marginTop: 4 }}>
          AI assistant for recruitment, platform help & strategy
        </p>
      </div>

      {/* Chat area */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '8px 4px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        {messages.length === 0 ? (
          /* Welcome + suggestions */
          <div>
            <div className="glass-card" style={{ padding: '28px 32px', marginBottom: 20, textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: 12 }}>🤖</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontWeight: 700, fontSize: '1.1rem', color: 'var(--text)', marginBottom: 8 }}>
                Hi, I'm SplenditBot
              </div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-dim)', maxWidth: 480, margin: '0 auto' }}>
                I can help you with the SplenditSuite platform, IT recruitment strategy,
                writing job descriptions, interview questions, and more.
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => sendMessage(s)}
                  className="glass-card"
                  style={{
                    padding: '12px 16px', textAlign: 'left', cursor: 'pointer',
                    border: '1px solid var(--card-border)', background: 'rgba(255,255,255,0.6)',
                    fontSize: '0.78rem', color: 'var(--text-muted)', lineHeight: 1.4,
                    borderRadius: 10, transition: 'all 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(0,168,122,0.4)'; e.currentTarget.style.color = 'var(--text)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--card-border)'; e.currentTarget.style.color = 'var(--text-muted)' }}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          messages.map((m, i) => (
            <div key={i} style={{
              display: 'flex',
              flexDirection: m.role === 'user' ? 'row-reverse' : 'row',
              gap: 10,
              alignItems: 'flex-start',
            }}>
              {/* Avatar */}
              <div style={{
                width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, var(--primary), var(--secondary))'
                  : 'rgba(107,70,168,0.12)',
                fontSize: '0.85rem',
              }}>
                {m.role === 'user' ? '👤' : '🤖'}
              </div>

              {/* Bubble */}
              <div style={{
                maxWidth: '75%',
                padding: '12px 16px',
                borderRadius: m.role === 'user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px',
                background: m.role === 'user'
                  ? 'linear-gradient(135deg, rgba(0,168,122,0.15), rgba(0,145,199,0.12))'
                  : 'rgba(255,255,255,0.8)',
                border: '1px solid',
                borderColor: m.role === 'user' ? 'rgba(0,168,122,0.2)' : 'var(--card-border)',
                fontSize: '0.82rem',
                color: 'var(--text)',
                lineHeight: 1.65,
                whiteSpace: 'pre-wrap',
              }}>
                {m.content}
              </div>
            </div>
          ))
        )}

        {loading && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: 'rgba(107,70,168,0.12)', fontSize: '0.85rem',
            }}>
              🤖
            </div>
            <div style={{
              padding: '12px 16px', borderRadius: '4px 16px 16px 16px',
              background: 'rgba(255,255,255,0.8)', border: '1px solid var(--card-border)',
              fontSize: '0.82rem', color: 'var(--text-dim)',
            }}>
              <span style={{ animation: 'pulse 1s infinite' }}>Thinking...</span>
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div style={{
        borderTop: '1px solid var(--card-border)', paddingTop: 16, marginTop: 8,
        display: 'flex', gap: 10, alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything... (Enter to send, Shift+Enter for new line)"
          disabled={loading}
          rows={1}
          style={{
            flex: 1, padding: '12px 16px', borderRadius: 12,
            border: '1px solid rgba(0,168,122,0.25)', background: 'rgba(255,255,255,0.9)',
            fontSize: '0.82rem', fontFamily: 'JetBrains Mono, monospace',
            color: 'var(--text)', outline: 'none', resize: 'none',
            maxHeight: 120, overflowY: 'auto', lineHeight: 1.5,
          }}
          onInput={e => {
            const t = e.currentTarget
            t.style.height = 'auto'
            t.style.height = Math.min(t.scrollHeight, 120) + 'px'
          }}
        />
        <button
          onClick={() => sendMessage(input)}
          disabled={loading || !input.trim()}
          style={{
            padding: '12px 20px', borderRadius: 12, border: 'none',
            background: 'linear-gradient(135deg, var(--primary), var(--secondary))',
            color: 'white', fontFamily: 'Syne, sans-serif', fontWeight: 700,
            fontSize: '0.85rem', cursor: (loading || !input.trim()) ? 'not-allowed' : 'pointer',
            opacity: (loading || !input.trim()) ? 0.5 : 1, transition: 'opacity 0.15s',
          }}
        >
          Send →
        </button>
      </div>

      {messages.length > 0 && (
        <button
          onClick={() => setMessages([])}
          style={{
            alignSelf: 'center', marginTop: 8,
            background: 'none', border: 'none', cursor: 'pointer',
            fontSize: '0.72rem', color: 'var(--text-dim)',
          }}
        >
          Clear conversation
        </button>
      )}
    </div>
  )
}
