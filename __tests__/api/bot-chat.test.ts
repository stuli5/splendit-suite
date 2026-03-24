import { POST } from '@/app/api/ai/bot-chat/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/ai', () => ({
  askClaude: jest.fn(() => Promise.resolve('Hello! How can I help you with SplenditSuite?')),
}))

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/ai/bot-chat', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/ai/bot-chat', () => {
  it('returns reply for valid messages', async () => {
    const req = makeRequest({ messages: [{ role: 'user', content: 'How does Deal Radar work?' }] })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.reply).toBeDefined()
  })

  it('returns 400 when messages are missing', async () => {
    const req = makeRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when messages is not an array', async () => {
    const req = makeRequest({ messages: 'hello' })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('returns 400 when no user message is present', async () => {
    const req = makeRequest({ messages: [{ role: 'assistant', content: 'Hi' }] })
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('handles multi-turn conversation', async () => {
    const { askClaude } = require('@/lib/ai')
    askClaude.mockClear()
    const req = makeRequest({
      messages: [
        { role: 'user',      content: 'What is IMS?' },
        { role: 'assistant', content: 'IMS is Interview Management System.' },
        { role: 'user',      content: 'How do I add a candidate?' },
      ],
    })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const prompt = askClaude.mock.calls[0][0]
    expect(prompt).toContain('IMS is Interview Management System')
  })
})
