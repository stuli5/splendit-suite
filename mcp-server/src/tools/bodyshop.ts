import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '../firebase.js'
import { listDocs, toText, toError } from '../utils/firestore.js'

const ContractStatus = z.enum(['active', 'ended'])

export function registerBodyshopTools(server: McpServer): void {
  // ── list_contracts ─────────────────────────────────────────────────────────
  server.tool(
    'list_contracts',
    'List all bodyshop contractor agreements. Filter by status (active/ended).',
    {
      status: ContractStatus.optional(),
      limit:  z.number().int().min(1).max(200).default(50),
    },
    async ({ status, limit }) => {
      try {
        const all = await listDocs(
          db.collection('contracts').orderBy('createdAt', 'desc'),
          200,
        )
        const filtered = all
          .filter((c) => (!status || c['status'] === status))
          .slice(0, limit)

        // Compute margin % for context
        const enriched = filtered.map((c) => {
          const client     = Number(c['mdRateClient']     ?? 0)
          const contractor = Number(c['mdRateContractor'] ?? 0)
          const margin     = client > 0 ? Math.round(((client - contractor) / client) * 100) : 0
          return { ...c, marginPercent: margin }
        })

        return toText({ count: enriched.length, contracts: enriched })
      } catch (err) {
        return toError(`list_contracts failed: ${String(err)}`)
      }
    },
  )

  // ── get_worklogs ───────────────────────────────────────────────────────────
  server.tool(
    'get_worklogs',
    'Get monthly worklogs for a specific contract, sorted newest first.',
    { contractId: z.string().min(1) },
    async ({ contractId }) => {
      try {
        const worklogs = await listDocs(
          db.collection('worklogs')
            .where('contractId', '==', contractId)
            .orderBy('month', 'desc'),
          100,
        )
        const total = {
          revenue: worklogs.reduce((s, w) => s + Number(w['revenue'] ?? 0), 0),
          cost:    worklogs.reduce((s, w) => s + Number(w['cost']    ?? 0), 0),
          profit:  worklogs.reduce((s, w) => s + Number(w['profit']  ?? 0), 0),
        }
        return toText({ contractId, totals: total, count: worklogs.length, worklogs })
      } catch (err) {
        return toError(`get_worklogs failed: ${String(err)}`)
      }
    },
  )
}
