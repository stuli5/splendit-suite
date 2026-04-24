import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'

jest.mock('../../src/firebase.js', () => ({
  db: { collection: jest.fn() },
}))

import { db } from '../../src/firebase.js'
import { registerDealTools } from '../../src/tools/deals.js'

const mockDb = db as unknown as { collection: jest.Mock }

function makeSnap(docs: Record<string, unknown>[]) {
  return { docs: docs.map((d) => ({ id: String(d['id'] ?? 'mid'), data: () => d })) }
}

function setupCollection() {
  const mockGet     = jest.fn()
  const mockLimit   = jest.fn().mockReturnValue({ get: mockGet })
  const mockOrderBy = jest.fn().mockReturnValue({ limit: mockLimit, get: mockGet })
  const mockWhere   = jest.fn().mockReturnValue({ limit: mockLimit, get: mockGet, orderBy: mockOrderBy })
  const mockAdd     = jest.fn()
  const mockDoc     = jest.fn().mockReturnValue({ get: mockGet })

  mockDb.collection.mockReturnValue({
    orderBy: mockOrderBy,
    where:   mockWhere,
    add:     mockAdd,
    doc:     mockDoc,
    limit:   mockLimit,
    get:     mockGet,
  })

  return { mockGet, mockLimit, mockOrderBy, mockAdd, mockDoc }
}

async function callTool(server: McpServer, name: string, args: Record<string, unknown>) {
  const tools = (server as unknown as {
    _registeredTools: Record<string, { handler: (a: unknown) => Promise<unknown> }>
  })._registeredTools
  const tool = tools[name]
  if (!tool) throw new Error(`Tool "${name}" not registered`)
  return tool.handler(args) as Promise<{ content: { text: string }[]; isError?: boolean }>
}

describe('deal tools', () => {
  let server: McpServer

  beforeEach(() => {
    jest.clearAllMocks()
    server = new McpServer({ name: 'test', version: '1.0.0' })
    registerDealTools(server)
  })

  describe('list_deals', () => {
    it('returns deals with computed estimated and weighted fees', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue(makeSnap([
        { id: '1', title: 'CTO',    stage: 'lead', feeType: 'percentage', feeValue: 15, salaryCzk: 2000000, probability: 50,  createdAt: 1000 },
        { id: '2', title: 'DevOps', stage: 'won',  feeType: 'fixed',      feeValue: 80000,                  probability: 100, createdAt: 900 },
      ]))

      const result = await callTool(server, 'list_deals', { limit: 50 })
      const data = JSON.parse(result.content[0].text)

      expect(data.count).toBe(2)
      expect(data.deals[0].estimatedFee).toBe(300000) // 15% of 2M
      expect(data.deals[0].weightedFee).toBe(150000)  // 50% of 300k
      expect(data.deals[1].estimatedFee).toBe(80000)
      expect(data.deals[1].weightedFee).toBe(80000)   // 100%
    })

    it('filters by stage', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue(makeSnap([
        { id: '1', stage: 'lead', feeType: 'fixed', feeValue: 0, probability: 10, createdAt: 1000 },
        { id: '2', stage: 'won',  feeType: 'fixed', feeValue: 0, probability: 100, createdAt: 900 },
      ]))

      const result = await callTool(server, 'list_deals', { stage: 'won', limit: 50 })
      const data = JSON.parse(result.content[0].text)

      expect(data.count).toBe(1)
      expect(data.deals[0].id).toBe('2')
    })

    it('filters by responsible person (case-insensitive partial match)', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockResolvedValue(makeSnap([
        { id: '1', stage: 'lead', responsible: 'Martin Kos',  feeType: 'fixed', feeValue: 0, probability: 10, createdAt: 1000 },
        { id: '2', stage: 'lead', responsible: 'Jana Novak',  feeType: 'fixed', feeValue: 0, probability: 20, createdAt: 900 },
      ]))

      const result = await callTool(server, 'list_deals', { responsible: 'martin', limit: 50 })
      const data = JSON.parse(result.content[0].text)

      expect(data.count).toBe(1)
      expect(data.deals[0].id).toBe('1')
    })

    it('returns error on firestore failure', async () => {
      const { mockGet } = setupCollection()
      mockGet.mockRejectedValue(new Error('unavailable'))

      const result = await callTool(server, 'list_deals', { limit: 50 })

      expect(result.isError).toBe(true)
      expect(result.content[0].text).toContain('list_deals failed')
    })
  })

  describe('create_deal', () => {
    it('creates deal and returns new id', async () => {
      const { mockAdd } = setupCollection()
      mockAdd.mockResolvedValue({ id: 'deal-123' })

      const result = await callTool(server, 'create_deal', {
        title:       'Senior Developer',
        companyName: 'Acme s.r.o.',
        stage:       'qualified',
        feeType:     'percentage',
        feeValue:    15,
        salaryCzk:   1800000,
        currency:    'CZK',
        probability: 60,
      })
      const data = JSON.parse(result.content[0].text)

      expect(data.id).toBe('deal-123')
      expect(data.title).toBe('Senior Developer')
      expect(data.companyName).toBe('Acme s.r.o.')
      expect(mockAdd).toHaveBeenCalledTimes(1)
    })

    it('stores optional fields when provided', async () => {
      const { mockAdd } = setupCollection()
      mockAdd.mockResolvedValue({ id: 'x' })

      const result = await callTool(server, 'create_deal', {
        title:         'CTO',
        companyName:   'BigCorp',
        stage:         'lead',
        feeType:       'fixed',
        feeValue:      100000,
        currency:      'EUR',
        probability:   30,
        expectedClose: '2026-06-30',
        responsible:   'Jana Novak',
        note:          'Hot lead',
      })
      const data = JSON.parse(result.content[0].text)

      expect(data.expectedClose).toBe('2026-06-30')
      expect(data.responsible).toBe('Jana Novak')
      expect(data.note).toBe('Hot lead')
    })
  })
})
