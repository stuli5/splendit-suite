import { POST } from '@/app/api/ai/dashboard-insights/route'
import { NextRequest } from 'next/server'

const mockInsights = {
  headline: '5 active projects, strong pipeline',
  insights: ['Pipeline growing', 'New candidates up 20%'],
  alerts:   ['2 projects stalled'],
  focus:    'Follow up on stalled projects',
}

jest.mock('@/lib/ai', () => ({
  askClaude:   jest.fn(() => Promise.resolve(JSON.stringify(mockInsights))),
  extractJson: jest.fn((text: string) => {
    try { return JSON.parse(text) } catch { return null }
  }),
}))

function makeRequest(body: object): NextRequest {
  return new NextRequest('http://localhost/api/ai/dashboard-insights', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

describe('POST /api/ai/dashboard-insights', () => {
  it('returns insights for valid stats', async () => {
    const req = makeRequest({ stats: { activeProjects: 5, totalCandidates: 120 } })
    const res = await POST(req)
    expect(res.status).toBe(200)
    const json = await res.json()
    expect(json.headline).toBeDefined()
  })

  it('returns 400 when stats are missing', async () => {
    const req = makeRequest({})
    const res = await POST(req)
    expect(res.status).toBe(400)
  })

  it('includes all stat fields in AI prompt', async () => {
    const { askClaude } = require('@/lib/ai')
    askClaude.mockClear()
    const stats = { activeProjects: 3, totalCandidates: 50, candidatesInPipeline: 12, newCandidatesWeek: 4 }
    const req = makeRequest({ stats })
    await POST(req)
    const prompt = askClaude.mock.calls[0][0]
    expect(prompt).toContain('3')
    expect(prompt).toContain('50')
  })
})
