import { NextRequest } from 'next/server'

// ── Mock firebase-admin ────────────────────────────────────────────────────────

const mockAdd    = jest.fn()
const mockUpdate = jest.fn()
const mockGet    = jest.fn()
const mockWhere  = jest.fn()
const mockLimit  = jest.fn()

const mockCollection = jest.fn(() => ({
  add:    mockAdd,
  doc:    jest.fn(() => ({ update: mockUpdate })),
  where:  mockWhere,
}))

mockWhere.mockReturnValue({ limit: mockLimit })
mockLimit.mockReturnValue({ get: mockGet })

jest.mock('@/lib/firebase-admin', () => ({
  adminDb: { collection: mockCollection },
}))

// ── Env ────────────────────────────────────────────────────────────────────────

const IMPORT_KEY = 'test-import-key-123'
process.env.LINKEDIN_IMPORT_KEY = IMPORT_KEY

function authHeader() {
  return { Authorization: `Bearer ${IMPORT_KEY}` }
}

// ── POST /api/crm/linkedin-import ──────────────────────────────────────────────

describe('POST /api/crm/linkedin-import', () => {
  let POST: (r: NextRequest) => Promise<Response>

  beforeAll(async () => {
    POST = (await import('@/app/api/crm/linkedin-import/route')).POST
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockAdd.mockResolvedValue({ id: 'new-doc-id' })
  })

  function req(body: object, headers: Record<string, string> = authHeader()): NextRequest {
    return new NextRequest('http://localhost/api/crm/linkedin-import', {
      method: 'POST',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...headers },
    })
  }

  it('creates candidate and returns 201', async () => {
    const res  = await POST(req({ firstName: 'Jan', lastName: 'Novak', position: 'Dev' }))
    const json = await res.json()
    expect(res.status).toBe(201)
    expect(json.ok).toBe(true)
    expect(json.id).toBe('new-doc-id')
    expect(mockAdd).toHaveBeenCalledTimes(1)
  })

  it('returns 401 with wrong key', async () => {
    const res = await POST(req({ firstName: 'Jan', lastName: 'Novak' }, { Authorization: 'Bearer wrong' }))
    expect(res.status).toBe(401)
  })

  it('returns 422 when firstName missing', async () => {
    const res = await POST(req({ lastName: 'Novak' }))
    expect(res.status).toBe(422)
  })

  it('stores skills array capped at 30', async () => {
    const skills = Array.from({ length: 35 }, (_, i) => `Skill${i}`)
    await POST(req({ firstName: 'Jan', lastName: 'Novak', skills }))
    const saved = mockAdd.mock.calls[0][0]
    expect(saved.skills).toHaveLength(30)
  })

  it('defaults stage to "new" if invalid', async () => {
    await POST(req({ firstName: 'Jan', lastName: 'Novak', stage: 'invalid' }))
    const saved = mockAdd.mock.calls[0][0]
    expect(saved.stage).toBe('new')
  })
})

// ── GET /api/crm/linkedin-lookup ───────────────────────────────────────────────

describe('GET /api/crm/linkedin-lookup', () => {
  let GET: (r: NextRequest) => Promise<Response>

  beforeAll(async () => {
    GET = (await import('@/app/api/crm/linkedin-lookup/route')).GET
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockWhere.mockReturnValue({ limit: mockLimit })
    mockLimit.mockReturnValue({ get: mockGet })
  })

  function req(url: string, headers: Record<string, string> = authHeader()): NextRequest {
    return new NextRequest(`http://localhost/api/crm/linkedin-lookup?url=${encodeURIComponent(url)}`, {
      method: 'GET',
      headers,
    })
  }

  it('returns found: false when no match', async () => {
    mockGet.mockResolvedValue({ empty: true, docs: [] })
    const res  = await GET(req('https://linkedin.com/in/nobody'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.found).toBe(false)
  })

  it('returns found: true with id and candidate when match exists', async () => {
    const candidateData = { firstName: 'Jan', lastName: 'Novak', stage: 'new' }
    mockGet.mockResolvedValue({
      empty: false,
      docs: [{ id: 'abc123', data: () => candidateData }],
    })
    const res  = await GET(req('https://linkedin.com/in/jan-novak'))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.found).toBe(true)
    expect(json.id).toBe('abc123')
    expect(json.candidate.firstName).toBe('Jan')
  })

  it('returns 401 with wrong key', async () => {
    const res = await GET(req('https://linkedin.com/in/test', { Authorization: 'Bearer wrong' }))
    expect(res.status).toBe(401)
  })

  it('returns 400 when url param missing', async () => {
    const res = await GET(new NextRequest('http://localhost/api/crm/linkedin-lookup', {
      method: 'GET',
      headers: authHeader(),
    }))
    expect(res.status).toBe(400)
  })
})

// ── PATCH /api/crm/linkedin-update ────────────────────────────────────────────

describe('PATCH /api/crm/linkedin-update', () => {
  let PATCH: (r: NextRequest) => Promise<Response>

  beforeAll(async () => {
    PATCH = (await import('@/app/api/crm/linkedin-update/route')).PATCH
  })

  beforeEach(() => {
    jest.clearAllMocks()
    mockUpdate.mockResolvedValue(undefined)
  })

  function req(body: object, headers: Record<string, string> = authHeader()): NextRequest {
    return new NextRequest('http://localhost/api/crm/linkedin-update', {
      method: 'PATCH',
      body: JSON.stringify(body),
      headers: { 'Content-Type': 'application/json', ...headers },
    })
  }

  it('updates candidate and returns ok', async () => {
    const res  = await PATCH(req({ id: 'abc123', firstName: 'Jan', lastName: 'Novak', position: 'Dev' }))
    const json = await res.json()
    expect(res.status).toBe(200)
    expect(json.ok).toBe(true)
    expect(mockUpdate).toHaveBeenCalledTimes(1)
    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg.firstName).toBe('Jan')
    expect(updateArg.updatedAt).toBeDefined()
  })

  it('returns 401 with wrong key', async () => {
    const res = await PATCH(req({ id: 'abc123', firstName: 'Jan', lastName: 'Novak' }, { Authorization: 'Bearer wrong' }))
    expect(res.status).toBe(401)
  })

  it('returns 422 when id missing', async () => {
    const res = await PATCH(req({ firstName: 'Jan', lastName: 'Novak' }))
    expect(res.status).toBe(422)
  })

  it('returns 422 when firstName missing', async () => {
    const res = await PATCH(req({ id: 'abc123', lastName: 'Novak' }))
    expect(res.status).toBe(422)
  })

  it('caps skills at 30', async () => {
    const skills = Array.from({ length: 35 }, (_, i) => `Skill${i}`)
    await PATCH(req({ id: 'abc123', firstName: 'Jan', lastName: 'Novak', skills }))
    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg.skills).toHaveLength(30)
  })

  it('only sets stage if valid', async () => {
    await PATCH(req({ id: 'abc123', firstName: 'Jan', lastName: 'Novak', stage: 'invalid' }))
    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg.stage).toBeUndefined()
  })

  it('sets valid stage', async () => {
    await PATCH(req({ id: 'abc123', firstName: 'Jan', lastName: 'Novak', stage: 'screening' }))
    const updateArg = mockUpdate.mock.calls[0][0]
    expect(updateArg.stage).toBe('screening')
  })
})
