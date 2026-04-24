import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '../firebase.js'
import { listDocs, getDocById, toText, toError } from '../utils/firestore.js'

const CRMStage = z.enum(['new', 'screening', 'interview', 'offer'])
const CandidateSource = z.enum(['linkedin', 'recru', 'manual', 'portal'])

export function registerCandidateTools(server: McpServer): void {
  // ── list_candidates ────────────────────────────────────────────────────────
  server.tool(
    'list_candidates',
    'List CRM candidates. Optionally filter by stage or source. Returns up to `limit` records (default 50).',
    {
      stage:  CRMStage.optional().describe('Pipeline stage filter'),
      source: CandidateSource.optional().describe('Candidate source filter'),
      limit:  z.number().int().min(1).max(200).default(50),
    },
    async ({ stage, source, limit }) => {
      try {
        const all = await listDocs(
          db.collection('crmCandidates').orderBy('createdAt', 'desc'),
          200,
        )
        const filtered = all
          .filter((c) => (!stage  || c['stage']  === stage))
          .filter((c) => (!source || c['source'] === source))
          .slice(0, limit)
        return toText({ count: filtered.length, candidates: filtered })
      } catch (err) {
        return toError(`list_candidates failed: ${String(err)}`)
      }
    },
  )

  // ── get_candidate ──────────────────────────────────────────────────────────
  server.tool(
    'get_candidate',
    'Get a single CRM candidate by ID including full stage history.',
    { id: z.string().min(1).describe('Firestore document ID') },
    async ({ id }) => {
      try {
        const candidate = await getDocById('crmCandidates', id)
        if (!candidate) return toError(`Candidate ${id} not found`)
        return toText(candidate)
      } catch (err) {
        return toError(`get_candidate failed: ${String(err)}`)
      }
    },
  )

  // ── search_candidates ──────────────────────────────────────────────────────
  server.tool(
    'search_candidates',
    'Search CRM candidates by name, position, or skills (case-insensitive substring match).',
    {
      query: z.string().min(1).describe('Search term'),
      limit: z.number().int().min(1).max(100).default(20),
    },
    async ({ query, limit }) => {
      try {
        const all = await listDocs(db.collection('crmCandidates'), 1000)
        const q = query.toLowerCase()
        const matches = all
          .filter((c) => {
            const name     = `${c['firstName'] ?? ''} ${c['lastName'] ?? ''}`.toLowerCase()
            const position = (c['position'] ?? '').toLowerCase()
            const skills   = ((c['skills'] as string[] | undefined) ?? []).join(' ').toLowerCase()
            return name.includes(q) || position.includes(q) || skills.includes(q)
          })
          .slice(0, limit)
        return toText({ count: matches.length, candidates: matches })
      } catch (err) {
        return toError(`search_candidates failed: ${String(err)}`)
      }
    },
  )

  // ── create_candidate ───────────────────────────────────────────────────────
  server.tool(
    'create_candidate',
    'Create a new CRM candidate.',
    {
      firstName: z.string().min(1),
      lastName:  z.string().min(1),
      position:  z.string().min(1),
      stage:     CRMStage.default('new'),
      source:    CandidateSource.default('manual'),
      linkedIn:  z.string().url().optional(),
      email:     z.string().email().optional(),
      phone:     z.string().optional(),
      skills:    z.array(z.string()).optional(),
      note:      z.string().optional(),
    },
    async (data) => {
      try {
        const now = Date.now()
        const doc = {
          firstName:    data.firstName,
          lastName:     data.lastName,
          position:     data.position,
          stage:        data.stage,
          source:       data.source,
          ...(data.linkedIn && { linkedIn: data.linkedIn }),
          ...(data.email    && { email:    data.email }),
          ...(data.phone    && { phone:    data.phone }),
          ...(data.skills   && { skills:   data.skills }),
          ...(data.note     && { note:     data.note }),
          stageHistory: [{ stage: data.stage, ts: now }],
          createdAt:    now,
          updatedAt:    now,
        }
        const ref = await db.collection('crmCandidates').add(doc)
        return toText({ id: ref.id, ...doc })
      } catch (err) {
        return toError(`create_candidate failed: ${String(err)}`)
      }
    },
  )

  // ── update_candidate ───────────────────────────────────────────────────────
  server.tool(
    'update_candidate',
    'Update a CRM candidate. Stage changes are appended to stageHistory automatically.',
    {
      id:       z.string().min(1).describe('Firestore document ID'),
      stage:    CRMStage.optional(),
      position: z.string().optional(),
      email:    z.string().email().optional(),
      phone:    z.string().optional(),
      skills:   z.array(z.string()).optional(),
      note:     z.string().optional(),
    },
    async ({ id, stage, ...rest }) => {
      try {
        const existing = await getDocById<{ stage?: string; stageHistory?: unknown[] }>('crmCandidates', id)
        if (!existing) return toError(`Candidate ${id} not found`)

        const now = Date.now()
        const updates: Record<string, unknown> = { updatedAt: now }

        if (rest.position !== undefined) updates['position'] = rest.position
        if (rest.email    !== undefined) updates['email']    = rest.email
        if (rest.phone    !== undefined) updates['phone']    = rest.phone
        if (rest.skills   !== undefined) updates['skills']   = rest.skills
        if (rest.note     !== undefined) updates['note']     = rest.note

        if (stage && stage !== existing.stage) {
          updates['stage'] = stage
          const history: unknown[] = Array.isArray(existing.stageHistory)
            ? [...existing.stageHistory]
            : []
          history.push({ stage, ts: now })
          updates['stageHistory'] = history
        }

        await db.collection('crmCandidates').doc(id).update(updates)
        return toText({ id, updated: updates })
      } catch (err) {
        return toError(`update_candidate failed: ${String(err)}`)
      }
    },
  )
}
