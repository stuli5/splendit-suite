import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '../firebase.js'
import { listDocs, getDocById, toText, toError } from '../utils/firestore.js'

const ProjectStatus = z.enum(['active', 'on-hold', 'closed'])
const ProjectType   = z.enum(['recruitment', 'contracting', 'other'])

export function registerProjectTools(server: McpServer): void {
  // ── list_projects ──────────────────────────────────────────────────────────
  server.tool(
    'list_projects',
    'List all CRM projects (open positions). Filter by status or type.',
    {
      status: ProjectStatus.optional(),
      type:   ProjectType.optional(),
      limit:  z.number().int().min(1).max(200).default(50),
    },
    async ({ status, type, limit }) => {
      try {
        const all = await listDocs(
          db.collection('projects').orderBy('createdAt', 'desc'),
          200,
        )
        const filtered = all
          .filter((p) => (!status || p['status'] === status))
          .filter((p) => (!type   || p['type']   === type))
          .slice(0, limit)
        return toText({ count: filtered.length, projects: filtered })
      } catch (err) {
        return toError(`list_projects failed: ${String(err)}`)
      }
    },
  )

  // ── get_project ────────────────────────────────────────────────────────────
  server.tool(
    'get_project',
    'Get a single project by ID including full job description.',
    { id: z.string().min(1).describe('Firestore document ID') },
    async ({ id }) => {
      try {
        const project = await getDocById('projects', id)
        if (!project) return toError(`Project ${id} not found`)
        return toText(project)
      } catch (err) {
        return toError(`get_project failed: ${String(err)}`)
      }
    },
  )
}
