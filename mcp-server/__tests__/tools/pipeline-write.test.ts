import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

jest.mock('../../src/firebase.js', () => ({
  db: { collection: jest.fn() },
}))

import { db } from '../../src/firebase.js'
import { registerPipelineTools } from '../../src/tools/pipeline.js'

// ── Typed helpers ──────────────────────────────────────────────────────────────
const mockDb = db as unknown as { collection: jest.Mock }

function makeSnap(docs: Record<string, unknown>[]) {
  return {
    docs: docs.map((d) => ({ id: String(d['id'] ?? 'mid'), data: () => d })),
  }
}

function setupCollection() {
  const mockGet     = jest.fn()
  const mockLimit   = jest.fn().mockReturnValue({ get: mockGet })
  const mockWhere   = jest.fn()
  // chainable .where().where() and .where().limit()
  mockWhere.mockReturnValue({ limit: mockLimit, where: mockWhere, get: mockGet })
  const mockUpdate  = jest.fn()
  const mockAdd     = jest.fn()
  const mockDoc     = jest.fn().mockReturnValue({ get: mockGet, update: mockUpdate })
  const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit })

  mockDb.collection.mockReturnValue({
    where: mockWhere, add: mockAdd, doc: mockDoc,
    limit: mockLimit, get: mockGet, orderBy: mockOrderBy,
  })

  return { mockGet, mockLimit, mockWhere, mockUpdate, mockAdd, mockDoc }
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

// ── Tests ──────────────────────────────────────────────────────────────────────
describe('add_to_pipeline', () => {
  let server: McpServer

  beforeEach(() => {
    jest.clearAllMocks()
    server = new McpServer({ name: 'test', version: '1.0.0' })
    registerPipelineTools(server)
  })

  it('creates a new pipeline entry when none exists', async () => {
    const { mockGet, mockAdd } = setupCollection()
    mockGet.mockResolvedValue(makeSnap([]))
    mockAdd.mockResolvedValue({ id: 'pc-new' })

    const result = await callTool(server, 'add_to_pipeline', {
      projectId:   'proj-1',
      candidateId: 'cand-1',
      phase:       'reviewed',
    })
    const data = JSON.parse(result.content[0].text)

    expect(result.isError).toBeFalsy()
    expect(data.created).toBe(true)
    expect(data.id).toBe('pc-new')
    expect(data.phase).toBe('reviewed')
    expect(mockAdd).toHaveBeenCalledTimes(1)
  })

  it('updates existing entry when already present (idempotent)', async () => {
    const { mockGet, mockUpdate, mockDoc } = setupCollection()
    mockGet.mockResolvedValue(makeSnap([
      { id: 'pc-existing', projectId: 'proj-1', candidateId: 'cand-1', phase: 'contacted' },
    ]))
    mockDoc.mockReturnValue({ update: mockUpdate })
    mockUpdate.mockResolvedValue(undefined)

    const result = await callTool(server, 'add_to_pipeline', {
      projectId:   'proj-1',
      candidateId: 'cand-1',
      phase:       'reviewed',
      reason:      'Promoted from LI register',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.updated).toBe(true)
    expect(data.phase).toBe('reviewed')
    expect(mockUpdate).toHaveBeenCalledTimes(1)
  })

  it('uses reviewed as the default phase', async () => {
    const { mockGet, mockAdd } = setupCollection()
    mockGet.mockResolvedValue(makeSnap([]))
    mockAdd.mockResolvedValue({ id: 'pc-default' })

    const result = await callTool(server, 'add_to_pipeline', {
      projectId:   'proj-2',
      candidateId: 'cand-2',
      phase:       'reviewed',
    })
    const data = JSON.parse(result.content[0].text)

    expect(data.phase).toBe('reviewed')
  })

  it('accepts serial_spam as a valid phase', async () => {
    const { mockGet, mockAdd } = setupCollection()
    mockGet.mockResolvedValue(makeSnap([]))
    mockAdd.mockResolvedValue({ id: 'pc-spam' })

    const result = await callTool(server, 'add_to_pipeline', {
      projectId:   'proj-3',
      candidateId: 'cand-3',
      phase:       'serial_spam',
    })
    const data = JSON.parse(result.content[0].text)

    expect(result.isError).toBeFalsy()
    expect(data.phase).toBe('serial_spam')
  })

  it('returns error on firestore failure', async () => {
    const { mockGet } = setupCollection()
    mockGet.mockRejectedValue(new Error('Firestore unavailable'))

    const result = await callTool(server, 'add_to_pipeline', {
      projectId:   'proj-1',
      candidateId: 'cand-1',
    })

    expect(result.isError).toBe(true)
    expect(result.content[0].text).toContain('add_to_pipeline failed')
  })
})
