import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { z } from 'zod'
import { db } from '../firebase.js'
import { listDocs, toText, toError } from '../utils/firestore.js'

export function registerUserTools(server: McpServer): void {
  // ── list_team_members ──────────────────────────────────────────────────────
  server.tool(
    'list_team_members',
    'List all team members (SplenditSuite users) with their display names and emails.',
    {},
    async () => {
      try {
        const members = await listDocs(db.collection('users'), 100)
        return toText({ count: members.length, members })
      } catch (err) {
        return toError(`list_team_members failed: ${String(err)}`)
      }
    },
  )
}
