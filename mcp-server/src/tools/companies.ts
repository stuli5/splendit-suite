import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '../firebase.js'
import { listDocs, getDocById, toText, toError } from '../utils/firestore.js'

const CompanyType = z.enum(['klient', 'partner', 'dodavatel', 'ostatní'])

export function registerCompanyTools(server: McpServer): void {
  // ── list_companies ─────────────────────────────────────────────────────────
  server.tool(
    'list_companies',
    'List all companies. Optionally filter by type (klient/partner/dodavatel/ostatní).',
    {
      type:  CompanyType.optional(),
      limit: z.number().int().min(1).max(200).default(50),
    },
    async ({ type, limit }) => {
      try {
        const all = await listDocs(db.collection('companies'), 200)
        const filtered = all
          .filter((c) => (!type || c['type'] === type))
          .slice(0, limit)
        return toText({ count: filtered.length, companies: filtered })
      } catch (err) {
        return toError(`list_companies failed: ${String(err)}`)
      }
    },
  )

  // ── get_company ────────────────────────────────────────────────────────────
  server.tool(
    'get_company',
    'Get a single company by ID including contact persons.',
    { id: z.string().min(1).describe('Firestore document ID') },
    async ({ id }) => {
      try {
        const company = await getDocById('companies', id)
        if (!company) return toError(`Company ${id} not found`)
        return toText(company)
      } catch (err) {
        return toError(`get_company failed: ${String(err)}`)
      }
    },
  )
}
