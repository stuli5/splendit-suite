import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

// Mock must come before imports that use firebase
jest.mock('../../src/firebase.js', () => ({
  db: { collection: jest.fn() },
}))

import { db } from '../../src/firebase.js'
import { registerCandidateTools } from '../../src/tools/candidates.js'

// ── Typed helpers ─────────────────────────────────────────────────────────────
const mockDb = db as unknown as { collection: jest.Mock }

function makeSnap(docs: Record<string, unknown>[]) {
  return {
    docs: docs.map((d) => ({ id: String(d['id'] ?? 'mid'), data: () => d })),
  }
}

function setupCollection(overrides: Record<string, jest.Mock> = {}) {
  const mockGet    = jest.fn()
  const mockLimit  = jest.fn().mockReturnValue({ get: mockGet })
  const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit, get: mockGet })
  const mockWhere  = jest.fn().mockReturnValue({ limit: mockLimit, orderBy: mockOrderBy, get: mockGet })
  const mockUpdate = jest.fn()
  const mockAdd    = jest.fn()
  const mockDoc    = jest.fn().mockReturnValue({ get: mockGet, update: mockUpdate })

  mockDb.collection.mockReturnValue({
    orderBy:  mockOrderBy,
    where:    mockWhere,
    add:      mockAdd,
    doc:      mockDoc,
    limit:    mockLimit,
    get:      mockGet,
    ...overrides,
  })

  return { mockGet, mockLimit, mockOrderBy, mockWhere, mockUpdate, mockAdd, mockDoc }
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

// ── Tests ─────────────────────────────────────────────────────────────────────
describe('candidate tools', () => {
  let server: McpServer

  beforeEach(() => {
    jest.clearAllMocks()
    server = new McpServer({ name: 'test', version: '1.0.0' })
    registerCandidateTools(server)
  })

  describe('list_candidates', () => {
    it('returns all candidates when no filter provided', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue(makeSnap([
        { id: '1', firstName: 'Jan',  lastName: 'Novak', stage: 'new',       source: 'manual',   createdAt: 1000 },
        { id: '2', firstName: 'Eva',  lastName: 'Mala',  stage: 'screening', source: 'linkedin', createdAt: 900 },
      ]))

      const result = await callTool(server, 'list_candidates', { limit: 50 })
      const data = JSON.parse(result.content[0].text)

      expect(result.isError).toBeFalsy()
      expect(data.count).toBe(2)
      expect(data.candidates).toHaveLength(2)
    })

    it('filters by stage', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue(makeSnap([
        { id: '1', stage: 'new',       createdAt: 1000 },
        { id: '2', stage: 'screening', createdAt: 900 },
      ]))

      const result = await callTool(server, 'list_candidates', { stage: 'new', limit: 50 })
      const data = JSON.parse(result.content[0].text)

      expect(data.count).toBe(1)
      expect(data.candidates[0].id).toBe('1')
    })

    it('filters by source', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue(makeSnap([
        { id: '1', source: 'linkedin', createdAt: 1000 },
        { id: '2', source: 'manual',   createdAt: 900 },
      ]))

      const result = await callTool(server, 'list_candidates', { source: 'linkedin', limit: 50 })
      const data = JSON.parse(result.content[0].text)

      expect(data.count).toBe(1)
      expect(data.candidates[0].id).toBe('1')
    })

    it('returns error on firestore failure', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockRejectedValue(new Error('Firestore unavailable'))

      const result = await callTool(server, 'list_candidates', { limit: 50 })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('list_candidates failed')
    })
  })

  describe('get_candidate', () => {
    it('returns candidate when found', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue({
        exists: true,
        id: 'abc',
        data: () => ({ firstName: 'Jan', lastName: 'Novak', position: 'Dev' }),
      })

      const result = await callTool(server, 'get_candidate', { id: 'abc' })
      const data = JSON.parse(result.content[0].text)

      expect(data.id).toBe('abc')
      expect(data.firstName).toBe('Jan')
    })

    it('returns error when not found', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue({ exists: false })

      const result = await callTool(server, 'get_candidate', { id: 'missing' })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('not found')
    })
  })

  describe('search_candidates', () => {
    it('matches on position (case-insensitive)', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue(makeSnap([
        { id: '1', firstName: 'Jan', lastName: 'Novak', position: 'Senior React Developer', skills: [], createdAt: 1000 },
        { id: '2', firstName: 'Eva', lastName: 'Mala',  position: 'UX Designer',            skills: [], createdAt: 900 },
      ]))

      const result = await callTool(server, 'search_candidates', { query: 'react', limit: 10 })
      const data = JSON.parse(result.content[0].text)

      expect(data.count).toBe(1)
      expect(data.candidates[0].id).toBe('1')
    })

    it('matches on skills', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue(makeSnap([
        { id: '1', firstName: 'Jan', lastName: 'Novak', position: 'Dev', skills: ['TypeScript', 'Node.js'], createdAt: 1000 },
        { id: '2', firstName: 'Eva', lastName: 'Mala',  position: 'Dev', skills: ['Python'], createdAt: 900 },
      ]))

      const result = await callTool(server, 'search_candidates', { query: 'typescript', limit: 10 })
      const data = JSON.parse(result.content[0].text)

      expect(data.count).toBe(1)
      expect(data.candidates[0].id).toBe('1')
    })
  })

  describe('create_candidate', () => {
    it('creates candidate and returns id with stageHistory', async () => {
      const { mockAdd } = setupCollection()
      mockAdd.mockResolvedValue({ id: 'new-id' })

      const result = await callTool(server, 'create_candidate', {
        firstName: 'Lukas',
        lastName:  'Novotny',
        position:  'Backend Developer',
        stage:     'new',
        source:    'manual',
      })
      const data = JSON.parse(result.content[0].text)

      expect(data.id).toBe('new-id')
      expect(data.firstName).toBe('Lukas')
      expect(data.stageHistory).toHaveLength(1)
      expect(data.stageHistory[0].stage).toBe('new')
      expect(mockAdd).toHaveBeenCalledTimes(1)
    })

    it('includes optional fields when provided', async () => {
      const { mockAdd } = setupCollection()
      mockAdd.mockResolvedValue({ id: 'x' })

      const result = await callTool(server, 'create_candidate', {
        firstName: 'Anna',
        lastName:  'Kova',
        position:  'Designer',
        email:     'anna@example.com',
        skills:    ['Figma', 'Sketch'],
        stage:     'screening',
        source:    'linkedin',
      })
      const data = JSON.parse(result.content[0].text)

      expect(data.email).toBe('anna@example.com')
      expect(data.skills).toEqual(['Figma', 'Sketch'])
    })
  })

  describe('update_candidate', () => {
    it('updates stage and appends to stageHistory', async () => {
      const { mockGet, mockUpdate } = setupCollection()
      // First call for getDocById
      mockGet.mockResolvedValue({
        exists: true,
        id:     'abc',
        data:   () => ({ stage: 'new', stageHistory: [{ stage: 'new', ts: 100 }] }),
      })
      mockUpdate.mockResolvedValue(undefined)

      const result = await callTool(server, 'update_candidate', { id: 'abc', stage: 'screening' })
      const data = JSON.parse(result.content[0].text)

      expect(data.updated.stage).toBe('screening')
      expect(data.updated.stageHistory).toHaveLength(2)
      expect(mockUpdate).toHaveBeenCalledTimes(1)
    })

    it('does not append stageHistory if stage unchanged', async () => {
      const { mockGet, mockUpdate } = setupCollection()
      mockGet.mockResolvedValue({
        exists: true,
        id:     'abc',
        data:   () => ({ stage: 'new', stageHistory: [{ stage: 'new', ts: 100 }] }),
      })
      mockUpdate.mockResolvedValue(undefined)

      const result = await callTool(server, 'update_candidate', { id: 'abc', note: 'updated note' })
      const data = JSON.parse(result.content[0].text)

      expect(data.updated.stage).toBeUndefined()
      expect(data.updated.stageHistory).toBeUndefined()
    })

    it('returns error when candidate not found', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue({ exists: false })

      const result = await callTool(server, 'update_candidate', { id: 'missing', stage: 'screening' })

      expect(result.isError).toBe(true)
    })
  })
})
