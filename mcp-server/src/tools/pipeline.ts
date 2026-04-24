import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '../firebase.js'
import { listDocs, toText, toError } from '../utils/firestore.js'

const ProjectPhase = z.enum([
  'contacted', 'presentation', 'interview', 'rejected', 'onboarding', 'closed',
])

export function registerPipelineTools(server: McpServer): void {
  // ── list_pipeline ──────────────────────────────────────────────────────────
  server.tool(
    'list_pipeline',
    'List all candidates on a specific project pipeline, optionally filtered by phase.',
    {
      projectId: z.string().min(1),
      phase:     ProjectPhase.optional(),
    },
    async ({ projectId, phase }) => {
      try {
        const all = await listDocs(
          db.collection('projectCandidates')
            .where('projectId', '==', projectId)
            .orderBy('addedAt', 'desc'),
          200,
        )
        const filtered = phase ? all.filter((c) => c['phase'] === phase) : all
        return toText({ count: filtered.length, pipeline: filtered })
      } catch (err) {
        return toError(`list_pipeline failed: ${String(err)}`)
      }
    },
  )

  // ── get_candidate_pipeline_history ────────────────────────────────────────
  server.tool(
    'get_candidate_pipeline_history',
    'Get all projects a candidate has been part of, with phase history.',
    { candidateId: z.string().min(1) },
    async ({ candidateId }) => {
      try {
        const entries = await listDocs(
          db.collection('projectCandidates')
            .where('candidateId', '==', candidateId)
            .orderBy('addedAt', 'desc'),
          100,
        )
        return toText({ count: entries.length, history: entries })
      } catch (err) {
        return toError(`get_candidate_pipeline_history failed: ${String(err)}`)
      }
    },
  )
}
