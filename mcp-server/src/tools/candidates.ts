import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '../firebase.js'
import { listDocs, getDocById, toText, toError } from '../utils/firestore.js'

const CRMStage = z.enum(['new', 'screening', 'interview', 'offer'])
const CandidateSource = z.enum(['linkedin', 'recru', 'manual', 'portal'])

/** Normalize a LinkedIn profile URL or /in/ slug to a stable dedup key. */
export function normalizeLinkedin(input: string): string {
  const m = input.match(/\/in\/([^/?#]+)/i)
  return (m ? m[1] : input).toLowerCase().replace(/\/+$/, '')
}

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
          ...(data.linkedIn && { linkedIn: data.linkedIn, linkedinId: normalizeLinkedin(data.linkedIn) }),
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

  // ── find_candidate_by_linkedin ────────────────────────────────────────────
  server.tool(
    'find_candidate_by_linkedin',
    'Resolve an inbound LinkedIn profile (URL or /in/ slug) to an existing CRM candidate. Returns found:false if unknown.',
    { linkedin: z.string().min(1).describe('LinkedIn profile URL or /in/ slug') },
    async ({ linkedin }) => {
      try {
        const linkedinId = normalizeLinkedin(linkedin)
        const matches = await listDocs(
          db.collection('crmCandidates').where('linkedinId', '==', linkedinId),
          2,
        )
        return toText({ linkedinId, found: matches.length > 0, candidate: matches[0] ?? null })
      } catch (err) {
        return toError(`find_candidate_by_linkedin failed: ${String(err)}`)
      }
    },
  )

  // ── check_applicant ───────────────────────────────────────────────────────
  server.tool(
    'check_applicant',
    'One-shot inbound applicant check: resolves a LinkedIn profile to a CRM candidate, pulls cross-project history, and returns a credibility verdict for the given target project.',
    {
      linkedin:        z.string().min(1),
      targetProjectId: z.string().min(1).describe('The JD/project currently being reviewed'),
    },
    async ({ linkedin, targetProjectId }) => {
      try {
        const linkedinId = normalizeLinkedin(linkedin)
        const found = await listDocs(
          db.collection('crmCandidates').where('linkedinId', '==', linkedinId), 1,
        )
        if (found.length === 0) {
          return toText({ linkedinId, known: false, verdict: 'new', otherProjectCount: 0, projects: [] })
        }
        const candidate = found[0]
        const history = await listDocs(
          db.collection('projectCandidates').where('candidateId', '==', candidate.id), 100,
        )
        const others            = history.filter((h) => h['projectId'] !== targetProjectId)
        const otherProjectCount = new Set(others.map((h) => h['projectId'])).size
        const verdict =
          otherProjectCount >= 2 ? 'serial_spam' :
          otherProjectCount === 1 ? 'warn' : 'known_clean'
        return toText({
          linkedinId, known: true, candidateId: candidate.id, verdict,
          otherProjectCount,
          projects: others.map((h) => ({ projectId: h['projectId'], phase: h['phase'] })),
        })
      } catch (err) {
        return toError(`check_applicant failed: ${String(err)}`)
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
