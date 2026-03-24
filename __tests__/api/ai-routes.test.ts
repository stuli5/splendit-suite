import { NextRequest } from 'next/server'

// ── Shared mock ───────────────────────────────────────────────────────────────
jest.mock('@/lib/ai', () => ({
  askClaude:   jest.fn(),
  extractJson: jest.fn((text: string) => { try { return JSON.parse(text) } catch { return null } }),
}))

function req(url: string, body: object): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  })
}

// ── job-description ───────────────────────────────────────────────────────────
describe('POST /api/ai/job-description', () => {
  let POST: (r: NextRequest) => Promise<Response>
  const { askClaude } = require('@/lib/ai')

  beforeAll(async () => {
    POST = (await import('@/app/api/ai/job-description/route')).POST
  })

  beforeEach(() => askClaude.mockResolvedValue('Senior React Developer job description...'))

  it('returns job description text', async () => {
    const res  = await POST(req('http://localhost', { positionName: 'React Developer', companyName: 'Acme' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.text).toBeDefined()
  })

  it('returns 400 when positionName missing', async () => {
    const res = await POST(req('http://localhost', { companyName: 'Acme' }))
    expect(res.status).toBe(400)
  })

  it('includes position in AI prompt', async () => {
    askClaude.mockClear()
    await POST(req('http://localhost', { positionName: 'Backend Engineer', cooperationType: 'BS' }))
    expect(askClaude.mock.calls[0][0]).toContain('Backend Engineer')
    expect(askClaude.mock.calls[0][0]).toContain('BS')
  })
})

// ── fit-score ─────────────────────────────────────────────────────────────────
describe('POST /api/ai/fit-score', () => {
  let POST: (r: NextRequest) => Promise<Response>
  const { askClaude, extractJson } = require('@/lib/ai')

  beforeAll(async () => {
    POST = (await import('@/app/api/ai/fit-score/route')).POST
  })

  beforeEach(() => {
    askClaude.mockResolvedValue('{"score":82,"label":"Strong","reason":"Great match."}')
    extractJson.mockImplementation((t: string) => { try { return JSON.parse(t) } catch { return null } })
  })

  it('returns score, label and reason', async () => {
    const res  = await POST(req('http://localhost', {
      candidate: { firstName: 'Jan', lastName: 'Novak', position: 'React Dev' },
      project:   { positionName: 'React Developer', companyName: 'Acme' },
    }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.score).toBe(82)
    expect(json.label).toBe('Strong')
  })

  it('returns 400 when candidate or project missing', async () => {
    const res = await POST(req('http://localhost', { candidate: {} }))
    expect(res.status).toBe(400)
  })

  it('returns 422 when AI returns invalid JSON', async () => {
    askClaude.mockResolvedValue('I cannot evaluate this.')
    extractJson.mockReturnValue(null)
    const res = await POST(req('http://localhost', {
      candidate: { firstName: 'Jan', lastName: 'Novak', position: 'Dev' },
      project:   { positionName: 'Dev', companyName: 'Acme' },
    }))
    expect(res.status).toBe(422)
  })
})

// ── interview-questions ───────────────────────────────────────────────────────
describe('POST /api/ai/interview-questions', () => {
  let POST: (r: NextRequest) => Promise<Response>
  const { askClaude, extractJson } = require('@/lib/ai')

  beforeAll(async () => {
    POST = (await import('@/app/api/ai/interview-questions/route')).POST
  })

  const mockQuestions = [
    { question: 'Explain useEffect', category: 'Technical', difficulty: 'medium', hint: 'Check lifecycle knowledge' },
    { question: 'Describe a challenge', category: 'Behavioral', difficulty: 'medium', hint: 'STAR method' },
  ]

  beforeEach(() => {
    askClaude.mockResolvedValue(JSON.stringify(mockQuestions))
    extractJson.mockReturnValue(mockQuestions)
  })

  it('returns questions array', async () => {
    const res  = await POST(req('http://localhost', { position: 'React Developer' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(json.questions).toHaveLength(2)
  })

  it('returns 400 when position missing', async () => {
    const res = await POST(req('http://localhost', { difficulty: 'hard' }))
    expect(res.status).toBe(400)
  })

  it('returns 422 when AI response unparseable', async () => {
    askClaude.mockResolvedValue('Cannot generate questions')
    extractJson.mockReturnValue(null)
    const res = await POST(req('http://localhost', { position: 'Dev' }))
    expect(res.status).toBe(422)
  })
})

// ── meeting-summary ───────────────────────────────────────────────────────────
describe('POST /api/ai/meeting-summary', () => {
  let POST: (r: NextRequest) => Promise<Response>
  const { askClaude, extractJson } = require('@/lib/ai')

  beforeAll(async () => {
    POST = (await import('@/app/api/ai/meeting-summary/route')).POST
  })

  const mockSummary = {
    summary: 'Discussed Q2 targets.', keyDecisions: ['Hire 3 devs'],
    actionItems: [{ task: 'Post JD', assignee: 'Jan', deadline: '2024-04-01' }],
    sentiment: 'Positive', nextSteps: 'Schedule follow-up.',
  }

  beforeEach(() => {
    askClaude.mockResolvedValue(JSON.stringify(mockSummary))
    extractJson.mockReturnValue(mockSummary)
  })

  it('returns summary with all fields', async () => {
    const res  = await POST(req('http://localhost', { transcript: 'We discussed hiring plans for Q2.' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.summary).toBeDefined()
    expect(Array.isArray(json.keyDecisions)).toBe(true)
    expect(json.sentiment).toBe('Positive')
  })

  it('returns 400 when transcript is missing', async () => {
    const res = await POST(req('http://localhost', { meetName: 'Sprint review' }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when transcript is empty string', async () => {
    const res = await POST(req('http://localhost', { transcript: '   ' }))
    expect(res.status).toBe(400)
  })
})

// ── candidate-match ───────────────────────────────────────────────────────────
describe('POST /api/ai/candidate-match', () => {
  let POST: (r: NextRequest) => Promise<Response>
  const { askClaude, extractJson } = require('@/lib/ai')

  beforeAll(async () => {
    POST = (await import('@/app/api/ai/candidate-match/route')).POST
  })

  const mockMatches = [
    { candidateId: 'c1', score: 90, label: 'Excellent', reason: 'Perfect fit.' },
    { candidateId: 'c2', score: 70, label: 'Good',      reason: 'Solid match.' },
  ]

  beforeEach(() => {
    askClaude.mockResolvedValue(JSON.stringify(mockMatches))
    extractJson.mockReturnValue(mockMatches)
  })

  it('returns ranked matches', async () => {
    const res = await POST(req('http://localhost', {
      project:    { positionName: 'React Dev', companyName: 'Acme' },
      candidates: [
        { id: 'c1', firstName: 'Jan', lastName: 'Novak', position: 'React Dev' },
        { id: 'c2', firstName: 'Eva', lastName: 'Kova',  position: 'Frontend Dev' },
      ],
    }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.matches).toHaveLength(2)
    expect(json.matches[0].candidateId).toBe('c1')
  })

  it('returns 400 when project missing', async () => {
    const res = await POST(req('http://localhost', { candidates: [{ id: 'c1' }] }))
    expect(res.status).toBe(400)
  })

  it('returns 400 when candidates array is empty', async () => {
    const res = await POST(req('http://localhost', {
      project: { positionName: 'Dev' }, candidates: [],
    }))
    expect(res.status).toBe(400)
  })
})
