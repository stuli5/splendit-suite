import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

jest.mock('../../src/firebase.js', () => ({
  db: { collection: jest.fn() },
}))

import { db } from '../../src/firebase.js'
import { registerLiRegisterTools } from '../../src/tools/li-register.js'

// ── Typed helpers ──────────────────────────────────────────────────────────────
const mockDb = db as unknown as { collection: jest.Mock }

function makeSnap(docs: Record<string, unknown>[]) {
  return {
    docs: docs.map((d) => ({ id: String(d['id'] ?? 'mid'), data: () => d })),
  }
}

/** Build a reusable collection mock with chainable .where() and .limit() */
function makeColMock() {
  const mockGet     = jest.fn()
  const mockLimit   = jest.fn().mockReturnValue({ get: mockGet })
  const mockWhere   = jest.fn()
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

// ── record_li_applicant ────────────────────────────────────────────────────────
describe('record_li_applicant', () => {
  let server: McpServer

  beforeEach(() => {
    jest.clearAllMocks()
    server = new McpServer({ name: 'test', version: '1.0.0' })
    registerLiRegisterTools(server)
  })

  it('creates a new applicant doc when none exists', async () => {
    const li = makeColMock()
    setupCollections({ liApplicants: li.obj })
    li.mockGet.mockResolvedValue(makeSnap([]))
    li.mockAdd.mockResolvedValue({ id: 'li-new' })

    const result = await callTool(server, 'record_li_applicant', {
      projectId: 'proj-1',
      linkedin:  'https://linkedin.com/in/Jana-Novakova/',
      name:      'Jana Novakova',
      headline:  'Senior AI Engineer',
      status:    'new',
    })
    const data = JSON.parse(result.content[0].text)

    expect(result.isError).toBeFalsy()
    expect(data.created).toBe(true)
    expect(data.id).toBe('li-new')
    expect(data.linkedinId).toBe('jana-novakova')
    expect(data.status).toBe('new')
    expect(li.mockAdd).toHaveBeenCalledTimes(1)
  })

  it('updates existing doc per (linkedinId, projectId) — idempotent', async () => {
    const li = makeColMock()
    setupCollections({ liApplicants: li.obj })
    li.mockGet.mockResolvedValue(makeSnap([
      { id: 'li-existing', linkedinId: 'jana-novakova', projectId: 'proj-1', status: 'new' },
    ]))
    li.mockUpdate.mockResolvedValue(undefined)
    li.mockDoc.mockReturnValue({ update: li.mockUpdate })

    const result = await callTool(server, 'record_li_applicant', {
      projectId: 'proj-1',
      linkedin:  'https://linkedin.com/in/Jana-Novakova/',
      status:    'reviewed',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.updated).toBe(true)
    expect(data.status).toBe('reviewed')
    expect(li.mockUpdate).toHaveBeenCalledTimes(1)
    expect(li.mockAdd).not.toHaveBeenCalled()
  })

  it('stores signals when provided', async () => {
    const li = makeColMock()
    setupCollections({ liApplicants: li.obj })
    li.mockGet.mockResolvedValue(makeSnap([]))
    li.mockAdd.mockResolvedValue({ id: 'li-sig' })

    await callTool(server, 'record_li_applicant', {
      projectId: 'proj-2',
      linkedin:  'https://linkedin.com/in/test-person',
      signals:   { hasWorkHistory: false, aiSummarySuspected: true, locationMatchesJD: false },
    })

    const addedDoc = li.mockAdd.mock.calls[0][0] as Record<string, unknown>
    const signals  = addedDoc['signals'] as Record<string, unknown>
    expect(signals['hasWorkHistory']).toBe(false)
    expect(signals['aiSummarySuspected']).toBe(true)
  })
})

// ── analyze_li_register ────────────────────────────────────────────────────────
describe('analyze_li_register', () => {
  let server: McpServer

  beforeEach(() => {
    jest.clearAllMocks()
    server = new McpServer({ name: 'test', version: '1.0.0' })
    registerLiRegisterTools(server)
  })

  /** Seed:
   *  - 'spammer'    in proj-1, proj-2, proj-3  (should appear in crossJdOverlap with projectCount 3)
   *  - 'double-app' in proj-1, proj-2           (should appear with projectCount 2)
   *  - 'clean-one'  in proj-1 only              (should NOT appear in crossJdOverlap)
   *  - 'low-cred'   in proj-2, aiSummarySuspected:true (should appear in flagged)
   */
  function seedDocs() {
    return [
      { id: 'a1', linkedinId: 'spammer',    projectId: 'proj-1', status: 'new',      signals: undefined },
      { id: 'a2', linkedinId: 'spammer',    projectId: 'proj-2', status: 'rejected', signals: undefined },
      { id: 'a3', linkedinId: 'spammer',    projectId: 'proj-3', status: 'new',      signals: undefined },
      { id: 'a4', linkedinId: 'double-app', projectId: 'proj-1', status: 'new',      signals: undefined },
      { id: 'a5', linkedinId: 'double-app', projectId: 'proj-2', status: 'reviewed', signals: undefined },
      { id: 'a6', linkedinId: 'clean-one',  projectId: 'proj-1', status: 'shortlisted', signals: undefined },
      { id: 'a7', linkedinId: 'low-cred',   projectId: 'proj-2', status: 'new',
        signals: { hasWorkHistory: false, aiSummarySuspected: true, locationMatchesJD: true } },
    ]
  }

  it('identifies all applicants present in >=2 projects in crossJdOverlap', async () => {
    const li = makeColMock()
    setupCollections({ liApplicants: li.obj })
    li.mockGet.mockResolvedValue(makeSnap(seedDocs()))

    const result = await callTool(server, 'analyze_li_register', {})
    const data   = JSON.parse(result.content[0].text)

    expect(result.isError).toBeFalsy()
    const overlap = data.crossJdOverlap as { linkedinId: string; projectCount: number }[]
    expect(overlap.length).toBe(2)

    const spammer = overlap.find((o) => o.linkedinId === 'spammer')
    expect(spammer?.projectCount).toBe(3)

    const doubleApp = overlap.find((o) => o.linkedinId === 'double-app')
    expect(doubleApp?.projectCount).toBe(2)

    // clean-one must NOT appear
    expect(overlap.find((o) => o.linkedinId === 'clean-one')).toBeUndefined()
  })

  it('sorts crossJdOverlap by projectCount descending', async () => {
    const li = makeColMock()
    setupCollections({ liApplicants: li.obj })
    li.mockGet.mockResolvedValue(makeSnap(seedDocs()))

    const result = await callTool(server, 'analyze_li_register', {})
    const data   = JSON.parse(result.content[0].text)
    const counts = (data.crossJdOverlap as { projectCount: number }[]).map((o) => o.projectCount)

    expect(counts[0]).toBeGreaterThanOrEqual(counts[1])
  })

  it('flags applicants with low-credibility signals', async () => {
    const li = makeColMock()
    setupCollections({ liApplicants: li.obj })
    li.mockGet.mockResolvedValue(makeSnap(seedDocs()))

    const result = await callTool(server, 'analyze_li_register', {})
    const data   = JSON.parse(result.content[0].text)
    const flagged = data.flagged as { linkedinId: string; trippedSignals: string[] }[]

    expect(flagged.length).toBeGreaterThanOrEqual(1)
    const lowCred = flagged.find((f) => f.linkedinId === 'low-cred')
    expect(lowCred).toBeDefined()
    expect(lowCred?.trippedSignals).toContain('hasWorkHistory:false')
    expect(lowCred?.trippedSignals).toContain('aiSummarySuspected:true')
  })

  it('respects projectIds filter', async () => {
    const li = makeColMock()
    setupCollections({ liApplicants: li.obj })
    li.mockGet.mockResolvedValue(makeSnap(seedDocs()))

    const result = await callTool(server, 'analyze_li_register', { projectIds: ['proj-1'] })
    const data   = JSON.parse(result.content[0].text)

    // Only proj-1 docs: spammer, double-app, clean-one
    expect(data.totalApplications).toBe(3)
    // With only proj-1 no linkedinId spans >=2 projects
    expect(data.crossJdOverlap).toHaveLength(0)
  })

  it('returns correct perProject counts', async () => {
    const li = makeColMock()
    setupCollections({ liApplicants: li.obj })
    li.mockGet.mockResolvedValue(makeSnap(seedDocs()))

    const result = await callTool(server, 'analyze_li_register', {})
    const data   = JSON.parse(result.content[0].text)
    const perProject = data.perProject as { projectId: string; count: number }[]

    const p1 = perProject.find((p) => p.projectId === 'proj-1')
    expect(p1?.count).toBe(3)  // spammer, double-app, clean-one

    const p2 = perProject.find((p) => p.projectId === 'proj-2')
    expect(p2?.count).toBe(3)  // spammer, double-app, low-cred
  })
})

// ── promote_li_applicant ───────────────────────────────────────────────────────
describe('promote_li_applicant', () => {
  let server: McpServer

  beforeEach(() => {
    jest.clearAllMocks()
    server = new McpServer({ name: 'test', version: '1.0.0' })
    registerLiRegisterTools(server)
  })

  it('creates candidate, adds to pipeline, and back-links the register doc', async () => {
    const li  = makeColMock()
    const crm = makeColMock()
    const pc  = makeColMock()

    // getDocById path: collection('liApplicants').doc(id).get()
    li.mockDoc.mockReturnValue({ get: li.mockGet, update: li.mockUpdate })
    li.mockGet.mockResolvedValueOnce({
      exists: true,
      id: 'li-1',
      data: () => ({
        linkedinId: 'promo-person',
        profileUrl: 'https://linkedin.com/in/promo-person',
        projectId:  'proj-1',
        name:       'Promo Person',
        status:     'new',
      }),
    })

    crm.mockAdd.mockResolvedValue({ id: 'crm-new' })

    // pipeline check: no existing entry
    pc.mockGet.mockResolvedValue(makeSnap([]))
    pc.mockAdd.mockResolvedValue({ id: 'pc-new' })

    li.mockUpdate.mockResolvedValue(undefined)

    setupCollections({
      liApplicants:      li.obj,
      crmCandidates:     crm.obj,
      projectCandidates: pc.obj,
    })

    const result = await callTool(server, 'promote_li_applicant', {
      registerId: 'li-1',
      position:   'AI Engineer',
      source:     'linkedin',
    })
    const data = JSON.parse(result.content[0].text)

    expect(result.isError).toBeFalsy()
    expect(data.promoted).toBe(true)
    expect(data.candidateId).toBe('crm-new')
    expect(crm.mockAdd).toHaveBeenCalledTimes(1)
    expect(pc.mockAdd).toHaveBeenCalledTimes(1)
    expect(li.mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('returns error when register doc does not exist', async () => {
    const li = makeColMock()
    li.mockDoc.mockReturnValue({ get: li.mockGet, update: li.mockUpdate })
    li.mockGet.mockResolvedValue({ exists: false })
    setupCollections({ liApplicants: li.obj })

    const result = await callTool(server, 'promote_li_applicant', {
      registerId: 'missing',
      position:   'Engineer',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('not found')
  })

  it('returns alreadyPromoted when doc already has promotedCandidateId', async () => {
    const li = makeColMock()
    li.mockDoc.mockReturnValue({ get: li.mockGet, update: li.mockUpdate })
    li.mockGet.mockResolvedValue({
      exists: true,
      id: 'li-1',
      data: () => ({
        linkedinId: 'already-done',
        projectId:  'proj-1',
        promotedCandidateId: 'crm-existing',
      }),
    })
    setupCollections({ liApplicants: li.obj })

    const result = await callTool(server, 'promote_li_applicant', {
      registerId: 'li-1',
      position:   'Engineer',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.alreadyPromoted).toBe(true)
    expect(data.promotedCandidateId).toBe('crm-existing')
  })
})
