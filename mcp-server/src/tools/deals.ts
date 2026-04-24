import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '../firebase.js'
import { listDocs, getDocById, toText, toError } from '../utils/firestore.js'

const DealStage    = z.enum(['lead', 'qualified', 'proposal', 'search', 'offer', 'won', 'lost'])
const FeeType      = z.enum(['percentage', 'fixed'])
const DealCurrency = z.enum(['CZK', 'EUR'])

export function registerDealTools(server: McpServer): void {
  // ── list_deals ─────────────────────────────────────────────────────────────
  server.tool(
    'list_deals',
    'List all deals in the sales pipeline. Filter by stage or responsible person.',
    {
      stage:       DealStage.optional(),
      responsible: z.string().optional().describe('Name of responsible person'),
      limit:       z.number().int().min(1).max(200).default(50),
    },
    async ({ stage, responsible, limit }) => {
      try {
        const all = await listDocs(
          db.collection('deals').orderBy('createdAt', 'desc'),
          200,
        )
        const filtered = all
          .filter((d) => (!stage       || d['stage']       === stage))
          .filter((d) => (!responsible || (d['responsible'] as string | undefined)
            ?.toLowerCase().includes(responsible.toLowerCase())))
          .slice(0, limit)

        // Compute estimated and weighted fees client-side for context
        const enriched = filtered.map((d) => {
          const feeValue  = Number(d['feeValue'] ?? 0)
          const salary    = Number(d['salaryCzk'] ?? 0)
          const prob      = Number(d['probability'] ?? 0)
          const estimated = d['feeType'] === 'percentage'
            ? salary * (feeValue / 100)
            : feeValue
          return { ...d, estimatedFee: estimated, weightedFee: estimated * (prob / 100) }
        })

        return toText({ count: enriched.length, deals: enriched })
      } catch (err) {
        return toError(`list_deals failed: ${String(err)}`)
      }
    },
  )

  // ── get_deal ───────────────────────────────────────────────────────────────
  server.tool(
    'get_deal',
    'Get a single deal by ID.',
    { id: z.string().min(1) },
    async ({ id }) => {
      try {
        const deal = await getDocById('deals', id)
        if (!deal) return toError(`Deal ${id} not found`)
        return toText(deal)
      } catch (err) {
        return toError(`get_deal failed: ${String(err)}`)
      }
    },
  )

  // ── create_deal ────────────────────────────────────────────────────────────
  server.tool(
    'create_deal',
    'Create a new deal in the sales pipeline.',
    {
      title:         z.string().min(1).describe('Position/deal name'),
      companyName:   z.string().min(1),
      companyId:     z.string().optional(),
      stage:         DealStage.default('lead'),
      feeType:       FeeType.default('percentage'),
      feeValue:      z.number().min(0).describe('Percentage or fixed amount'),
      salaryCzk:     z.number().optional().describe('Annual salary estimate (for % deals)'),
      currency:      DealCurrency.default('CZK'),
      probability:   z.number().int().min(0).max(100).default(50),
      expectedClose: z.string().optional().describe('YYYY-MM-DD'),
      responsible:   z.string().optional(),
      note:          z.string().optional(),
    },
    async (data) => {
      try {
        const now = Date.now()
        const doc = {
          title:       data.title,
          companyName: data.companyName,
          ...(data.companyId     && { companyId:     data.companyId }),
          stage:       data.stage,
          feeType:     data.feeType,
          feeValue:    data.feeValue,
          ...(data.salaryCzk     && { salaryCzk:     data.salaryCzk }),
          currency:    data.currency,
          probability: data.probability,
          ...(data.expectedClose && { expectedClose: data.expectedClose }),
          ...(data.responsible   && { responsible:   data.responsible }),
          ...(data.note          && { note:           data.note }),
          createdAt:   now,
        }
        const ref = await db.collection('deals').add(doc)
        return toText({ id: ref.id, ...doc })
      } catch (err) {
        return toError(`create_deal failed: ${String(err)}`)
      }
    },
  )
}
