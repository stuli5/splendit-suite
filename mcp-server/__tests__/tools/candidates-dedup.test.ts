import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

// Mock must come before imports that use firebase
jest.mock('../../src/firebase.js', () => ({
  db: { collection: jest.fn() },
}))

import { db } from '../../src/firebase.js'
import { registerCandidateTools, normalizeLinkedin } from '../../src/tools/candidates.js'

// ── Typed helpers ──────────────────────────────────────────────────────────────
const mockDb = db as unknown as { collection: jest.Mock }

function makeSnap(docs: Record<string, unknown>[]) {
  return {
    docs: docs.map((d) => ({ id: String(d['id'] ?? 'mid'), data: () => d })),
  }
}

/** Build a collection mock with chainable .where() and .limit() */
function makeColMock() {
  const mockGet     = jest.fn()
  const mockLimit   = jest.fn().mockReturnValue({ get: mockGet })
  const mockWhere   = jest.fn()
  // chainable: .where().where() and .where().limit()
  mockWhere.mockReturnValue({ limit: mockLimit, where: mockWhere, get: mockGet })
  const mockUpdate  = jest.fn()
  const mockAdd     = jest.fn()
  const mockDoc     = jest.fn().mockReturnValue({ get: mockGet, update: mockUpdate })
  const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit })
  return {
    mockGet, mockLimit, mockWhere, mockUpdate, mockAdd, mockDoc, mockOrderBy,
    obj: { where: mockWhere, add: mockAdd, doc: mockDoc, limit: mockLimit, get: mockGet, orderBy: mockOrderBy },
  }
}

/** Route collection() calls by name — supports up to two distinct collections */
function setupCollections(map: Record<string, ReturnType<typeof makeColMock>['obj']>) {
  mockDb.collection.mockImplementation((name: string) => map[name] ?? {})
}

async function callTool(
  server: McpServer,
  name: string,
  args: Record<string, unknown>,
): Promise<{ content: { text: string }[]; isError?: boolean }> {
  const tools = (server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }>
  })._registeredTools
  const tool = tools[name]
  if (!tool) throw new Error(`Tool "${name}" not registered`)
  return tool.handler(args) as Promise<{ content: { text: string }[]; isError?: boolean }>
}

// ── normalizeLinkedin ──────────────────────────────────────────────────────────
describe('normalizeLinkedin', () => {
  it('extracts slug from full URL with locale and trailing slash', () => {
    expect(normalizeLinkedin('https://www.linkedin.com/in/Jan-Novak-123/?locale=sk')).toBe('jan-novak-123')
  })

  it('extracts slug from URL without www', () => {
    expect(normalizeLinkedin('https://linkedin.com/in/jan-novak-123')).toBe('jan-novak-123')
  })

  it('lowercases a bare slug (no URL)', () => {
    expect(normalizeLinkedin('Jan-Novak-123')).toBe('jan-novak-123')
  })

  it('handles mixed case', () => {
    expect(normalizeLinkedin('https://www.linkedin.com/in/JAN-NOVAK-123')).toBe('jan-novak-123')
  })

  it('strips query params', () => {
    expect(normalizeLinkedin('https://linkedin.com/in/jan-novak-123?ref=abc')).toBe('jan-novak-123')
  })

  it('produces identical output from full URL and bare slug', () => {
    const fromUrl  = normalizeLinkedin('https://www.linkedin.com/in/Jan-Novak-123/')
    const fromSlug = normalizeLinkedin('jan-novak-123')
    expect(fromUrl).toBe(fromSlug)
  })
})

// ── create_candidate sets linkedinId ──────────────────────────────────────────
describe('create_candidate — linkedinId', () => {
  let server: McpServer

  beforeEach(() => {
    jest.clearAllMocks()
    server = new McpServer({ name: 'test', version: '1.0.0' })
    registerCandidateTools(server)
  })

  it('writes linkedinId when linkedIn is provided', async () => {
    const crm = makeColMock()
    setupCollections({ crmCandidates: crm.obj })
    crm.mockAdd.mockResolvedValue({ id: 'new-id' })

    const result = await callTool(server, 'create_candidate', {
      firstName: 'Jan',
      lastName:  'Novak',
      position:  'Engineer',
      linkedIn:  'https://www.linkedin.com/in/Jan-Novak-123/',
      stage:     'new',
      source:    'linkedin',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.linkedinId).toBe('jan-novak-123')
    expect(data.linkedIn).toBe('https://www.linkedin.com/in/Jan-Novak-123/')
  })

  it('does not set linkedinId when linkedIn is absent', async () => {
    const crm = makeColMock()
    setupCollections({ crmCandidates: crm.obj })
    crm.mockAdd.mockResolvedValue({ id: 'no-li' })

    const result = await callTool(server, 'create_candidate', {
      firstName: 'Eva',
      lastName:  'Mala',
      position:  'Designer',
      stage:     'new',
      source:    'manual',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.linkedinId).toBeUndefined()
  })
})

// ── find_candidate_by_linkedin ─────────────────────────────────────────────────
describe('find_candidate_by_linkedin', () => {
  let server: McpServer

  beforeEach(() => {
    jest.clearAllMocks()
    server = new McpServer({ name: 'test', version: '1.0.0' })
    registerCandidateTools(server)
  })

  it('returns found:true with candidate on a match', async () => {
    const crm = makeColMock()
    setupCollections({ crmCandidates: crm.obj })
    crm.mockGet.mockResolvedValue(makeSnap([
      { id: 'c1', firstName: 'Jan', linkedinId: 'jan-novak-123' },
    ]))

    const result = await callTool(server, 'find_candidate_by_linkedin', {
      linkedin: 'https://www.linkedin.com/in/Jan-Novak-123/',
    })
    const data = JSON.parse(result.content[0].text)

    expect(result.isError).toBeFalsy()
    expect(data.found).toBe(true)
    expect(data.linkedinId).toBe('jan-novak-123')
    expect(data.candidate.id).toBe('c1')
  })

  it('returns found:false when no match', async () => {
    const crm = makeColMock()
    setupCollections({ crmCandidates: crm.obj })
    crm.mockGet.mockResolvedValue(makeSnap([]))

    const result = await callTool(server, 'find_candidate_by_linkedin', {
      linkedin: 'https://linkedin.com/in/nobody-here',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.found).toBe(false)
    expect(data.candidate).toBeNull()
  })

  it('returns error on firestore failure', async () => {
    const crm = makeColMock()
    setupCollections({ crmCandidates: crm.obj })
    crm.mockGet.mockRejectedValue(new Error('Firestore down'))

    const result = await callTool(server, 'find_candidate_by_linkedin', { linkedin: 'x' })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('find_candidate_by_linkedin failed')
  })
})

// ── check_applicant ────────────────────────────────────────────────────────────
describe('check_applicant', () => {
  let server: McpServer

  beforeEach(() => {
    jest.clearAllMocks()
    server = new McpServer({ name: 'test', version: '1.0.0' })
    registerCandidateTools(server)
  })

  it('returns verdict:new for an unknown profile', async () => {
    const crm = makeColMock()
    const pc  = makeColMock()
    setupCollections({ crmCandidates: crm.obj, projectCandidates: pc.obj })
    crm.mockGet.mockResolvedValue(makeSnap([]))

    const result = await callTool(server, 'check_applicant', {
      linkedin: 'https://linkedin.com/in/totally-new',
      targetProjectId: 'proj-1',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.known).toBe(false)
    expect(data.verdict).toBe('new')
    expect(data.otherProjectCount).toBe(0)
    expect(data.projects).toHaveLength(0)
  })

  it('returns verdict:known_clean when candidate is only in the target project', async () => {
    const crm = makeColMock()
    const pc  = makeColMock()
    setupCollections({ crmCandidates: crm.obj, projectCandidates: pc.obj })
    crm.mockGet.mockResolvedValue(makeSnap([{ id: 'c1', linkedinId: 'known-person' }]))
    pc.mockGet.mockResolvedValue(makeSnap([
      { id: 'pc1', candidateId: 'c1', projectId: 'proj-1', phase: 'reviewed' },
    ]))

    const result = await callTool(server, 'check_applicant', {
      linkedin: 'https://linkedin.com/in/known-person',
      targetProjectId: 'proj-1',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.verdict).toBe('known_clean')
    expect(data.otherProjectCount).toBe(0)
  })

  it('returns verdict:warn when candidate appears in 1 other project', async () => {
    const crm = makeColMock()
    const pc  = makeColMock()
    setupCollections({ crmCandidates: crm.obj, projectCandidates: pc.obj })
    crm.mockGet.mockResolvedValue(makeSnap([{ id: 'c1', linkedinId: 'multi-person' }]))
    pc.mockGet.mockResolvedValue(makeSnap([
      { id: 'pc1', candidateId: 'c1', projectId: 'proj-other', phase: 'contacted' },
    ]))

    const result = await callTool(server, 'check_applicant', {
      linkedin: 'https://linkedin.com/in/multi-person',
      targetProjectId: 'proj-1',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.verdict).toBe('warn')
    expect(data.otherProjectCount).toBe(1)
    expect(data.projects).toHaveLength(1)
  })

  it('returns verdict:serial_spam when candidate appears in 2+ other projects', async () => {
    const crm = makeColMock()
    const pc  = makeColMock()
    setupCollections({ crmCandidates: crm.obj, projectCandidates: pc.obj })
    crm.mockGet.mockResolvedValue(makeSnap([{ id: 'c1', linkedinId: 'spammer' }]))
    pc.mockGet.mockResolvedValue(makeSnap([
      { id: 'pc1', candidateId: 'c1', projectId: 'proj-other-1', phase: 'contacted' },
      { id: 'pc2', candidateId: 'c1', projectId: 'proj-other-2', phase: 'rejected' },
    ]))

    const result = await callTool(server, 'check_applicant', {
      linkedin: 'https://linkedin.com/in/spammer',
      targetProjectId: 'proj-1',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.verdict).toBe('serial_spam')
    expect(data.otherProjectCount).toBe(2)
    expect(data.projects).toHaveLength(2)
  })
})
