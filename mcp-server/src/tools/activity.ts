import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '../firebase.js'
import { listDocs, toText, toError } from '../utils/firestore.js'

const EntityType = z.enum(['candidate', 'project', 'project_candidate'])

export function registerActivityTools(server: McpServer): void {
  // ── get_recent_activity ────────────────────────────────────────────────────
  server.tool(
    'get_recent_activity',
    'Get the most recent activity log entries across the whole platform.',
    { count: z.number().int().min(1).max(50).default(20) },
    async ({ count }) => {
      try {
        const entries = await listDocs(
          db.collection('activityLog').orderBy('ts', 'desc'),
          count,
        )
        return toText({ count: entries.length, activity: entries })
      } catch (err) {
        return toError(`get_recent_activity failed: ${String(err)}`)
      }
    },
  )

  // ── get_entity_activity ────────────────────────────────────────────────────
  server.tool(
    'get_entity_activity',
    'Get activity history for a specific entity (candidate, project, or project_candidate).',
    {
      entityType: EntityType,
      entityId:   z.string().min(1),
    },
    async ({ entityType, entityId }) => {
      try {
        const entries = await listDocs(
          db.collection('activityLog')
            .where('entityType', '==', entityType)
            .where('entityId',   '==', entityId)
            .orderBy('ts', 'desc'),
          50,
        )
        return toText({ entityType, entityId, count: entries.length, activity: entries })
      } catch (err) {
        return toError(`get_entity_activity failed: ${String(err)}`)
      }
    },
  )
}
