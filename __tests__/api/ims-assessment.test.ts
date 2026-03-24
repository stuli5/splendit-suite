import { POST } from '@/app/api/ai/ims-assessment/route'
import { NextRequest } from 'next/server'

jest.mock('@/lib/ai', () => ({
  askClaude: jest.fn(() => Promise.resolve('Strong candidate. Recommend Yes.')),
}))

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/ai/ims-assessment', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/ai/ims-assessment', () => {
  it('returns assessment for valid input', async () => {
    const req = makeRequest({ name: 'Jan Novak', position: 'React Developer', score: 78 })
    const res = await POST(req)
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.assessment).toBe('Strong candidate. Recommend Yes.')
  })

  it('returns 400 when position is missing', async () => {
    const req = makeRequest({ name: 'Jan Novak', score: 78 })
    const res = await POST(req)
    expect(res.status).toBe(400)
    const json = await res.json()
    expect(json.error).toBeDefined()
  })

  it('handles missing optional fields gracefully', async () => {
    const req = makeRequest({ position: 'Backend Developer' })
    const res = await POST(req)
    expect(res.status).toBe(200)
  })

  it('passes all score fields to AI', async () => {
    const { askClaude } = require('@/lib/ai')
    askClaude.mockClear()
    const req = makeRequest({
      position: 'Dev', name: 'Eva', score: 90,
      easyScore: 30, mediumScore: 40, hardScore: 20,
      conclusion: 'Very strong candidate',
    })
    await POST(req)
    const prompt = askClaude.mock.calls[0][0]
    expect(prompt).toContain('90%')
    expect(prompt).toContain('Very strong candidate')
  })
})
