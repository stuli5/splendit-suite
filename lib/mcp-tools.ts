import type { CollectionReference, Query, DocumentData } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase-admin'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface McpContent { type: 'text'; text: string }
export interface McpResult  { content: McpContent[]; isError?: boolean }

export interface McpToolDef {
  name: string
  description: string
  inputSchema: { type: 'object'; properties: Record<string, unknown>; required?: string[] }
}

interface McpTool extends McpToolDef {
  handler: (args: Record<string, unknown>) => Promise<McpResult>
}

// ── Firestore helpers ──────────────────────────────────────────────────────────

type WithId<T> = T & { id: string }

async function listDocs<T extends DocumentData>(
  ref: CollectionReference<DocumentData> | Query<DocumentData>,
  limit: number,
): Promise<WithId<T>[]> {
  const snap = await ref.limit(limit).get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<T>))
}

async function getDoc<T extends DocumentData>(collection: string, id: string): Promise<WithId<T> | null> {
  const snap = await adminDb.collection(collection).doc(id).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() } as WithId<T>
}

function ok(data: unknown): McpResult {
  return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] }
}

function fail(msg: string): McpResult {
  return { content: [{ type: 'text', text: msg }], isError: true }
}

function num(v: unknown, def: number): number {
  const n = Number(v)
  return isNaN(n) ? def : n
}

// ── Tools ─────────────────────────────────────────────────────────────────────

const tools: McpTool[] = [

  // ── Candidates ────────────────────────────────────────────────────────────

  {
    name: 'list_candidates',
    description: 'List CRM candidates. Optionally filter by stage or source. Returns up to limit records (default 50).',
    inputSchema: {
      type: 'object',
      properties: {
        stage:  { type: 'string', enum: ['new', 'screening', 'interview', 'offer'] },
        source: { type: 'string', enum: ['linkedin', 'recru', 'manual', 'portal'] },
        limit:  { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
    },
    async handler({ stage, source, limit }) {
      try {
        const lim = Math.min(num(limit, 50), 200)
        const all = await listDocs(adminDb.collection('crmCandidates').orderBy('createdAt', 'desc'), 200)
        const filtered = all
          .filter((c) => !stage  || c['stage']  === stage)
          .filter((c) => !source || c['source'] === source)
          .slice(0, lim)
        return ok({ count: filtered.length, candidates: filtered })
      } catch (e) { return fail(`list_candidates failed: ${String(e)}`) }
    },
  },

  {
    name: 'get_candidate',
    description: 'Get a single CRM candidate by ID including full stage history.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Firestore document ID' } },
      required: ['id'],
    },
    async handler({ id }) {
      try {
        const c = await getDoc('crmCandidates', String(id))
        return c ? ok(c) : fail(`Candidate ${id} not found`)
      } catch (e) { return fail(`get_candidate failed: ${String(e)}`) }
    },
  },

  {
    name: 'search_candidates',
    description: 'Search CRM candidates by name, position, or skills (case-insensitive substring match).',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term' },
        limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
      },
      required: ['query'],
    },
    async handler({ query, limit }) {
      try {
        const lim = Math.min(num(limit, 20), 100)
        const all = await listDocs(adminDb.collection('crmCandidates'), 1000)
        const q = String(query).toLowerCase()
        const matches = all
          .filter((c) => {
            const name   = `${c['firstName'] ?? ''} ${c['lastName'] ?? ''}`.toLowerCase()
            const pos    = (c['position'] ?? '').toString().toLowerCase()
            const skills = ((c['skills'] as string[] | undefined) ?? []).join(' ').toLowerCase()
            return name.includes(q) || pos.includes(q) || skills.includes(q)
          })
          .slice(0, lim)
        return ok({ count: matches.length, candidates: matches })
      } catch (e) { return fail(`search_candidates failed: ${String(e)}`) }
    },
  },

  {
    name: 'create_candidate',
    description: 'Create a new CRM candidate.',
    inputSchema: {
      type: 'object',
      properties: {
        firstName: { type: 'string' },
        lastName:  { type: 'string' },
        position:  { type: 'string' },
        stage:     { type: 'string', enum: ['new', 'screening', 'interview', 'offer'], default: 'new' },
        source:    { type: 'string', enum: ['linkedin', 'recru', 'manual', 'portal'], default: 'manual' },
        linkedIn:  { type: 'string' },
        email:     { type: 'string' },
        phone:     { type: 'string' },
        skills:    { type: 'array', items: { type: 'string' } },
        note:      { type: 'string' },
      },
      required: ['firstName', 'lastName', 'position'],
    },
    async handler(data) {
      try {
        const now    = Date.now()
        const stage  = (data['stage']  as string | undefined) ?? 'new'
        const source = (data['source'] as string | undefined) ?? 'manual'
        const doc = {
          firstName: String(data['firstName']),
          lastName:  String(data['lastName']),
          position:  String(data['position']),
          stage,
          source,
          ...(data['linkedIn']  ? { linkedIn: String(data['linkedIn']) }  : {}),
          ...(data['email']     ? { email:    String(data['email']) }    : {}),
          ...(data['phone']     ? { phone:    String(data['phone']) }    : {}),
          ...(data['skills']    ? { skills:   data['skills'] }           : {}),
          ...(data['note']      ? { note:     String(data['note']) }     : {}),
          stageHistory: [{ stage, ts: now }],
          createdAt: now,
          updatedAt: now,
        }
        const ref = await adminDb.collection('crmCandidates').add(doc)
        return ok({ id: ref.id, ...doc })
      } catch (e) { return fail(`create_candidate failed: ${String(e)}`) }
    },
  },

  {
    name: 'update_candidate',
    description: 'Update a CRM candidate. Stage changes are appended to stageHistory automatically.',
    inputSchema: {
      type: 'object',
      properties: {
        id:       { type: 'string', description: 'Firestore document ID' },
        stage:    { type: 'string', enum: ['new', 'screening', 'interview', 'offer'] },
        position: { type: 'string' },
        email:    { type: 'string' },
        phone:    { type: 'string' },
        skills:   { type: 'array', items: { type: 'string' } },
        note:     { type: 'string' },
      },
      required: ['id'],
    },
    async handler({ id, stage, ...rest }) {
      try {
        const existing = await getDoc<{ stage?: string; stageHistory?: unknown[] }>('crmCandidates', String(id))
        if (!existing) return fail(`Candidate ${id} not found`)

        const now = Date.now()
        const updates: Record<string, unknown> = { updatedAt: now }
        if (rest['position'] !== undefined) updates['position'] = rest['position']
        if (rest['email']    !== undefined) updates['email']    = rest['email']
        if (rest['phone']    !== undefined) updates['phone']    = rest['phone']
        if (rest['skills']   !== undefined) updates['skills']   = rest['skills']
        if (rest['note']     !== undefined) updates['note']     = rest['note']

        if (stage && stage !== existing.stage) {
          updates['stage'] = stage
          const history = Array.isArray(existing.stageHistory) ? [...existing.stageHistory] : []
          history.push({ stage, ts: now })
          updates['stageHistory'] = history
        }

        await adminDb.collection('crmCandidates').doc(String(id)).update(updates)
        return ok({ id, updated: updates })
      } catch (e) { return fail(`update_candidate failed: ${String(e)}`) }
    },
  },

  // ── Projects ──────────────────────────────────────────────────────────────

  {
    name: 'list_projects',
    description: 'List all CRM projects (open positions). Filter by status or type.',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'on-hold', 'closed'] },
        type:   { type: 'string', enum: ['recruitment', 'contracting', 'other'] },
        limit:  { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
    },
    async handler({ status, type, limit }) {
      try {
        const lim = Math.min(num(limit, 50), 200)
        const all = await listDocs(adminDb.collection('projects').orderBy('createdAt', 'desc'), 200)
        const filtered = all
          .filter((p) => !status || p['status'] === status)
          .filter((p) => !type   || p['type']   === type)
          .slice(0, lim)
        return ok({ count: filtered.length, projects: filtered })
      } catch (e) { return fail(`list_projects failed: ${String(e)}`) }
    },
  },

  {
    name: 'get_project',
    description: 'Get a single project by ID including full job description.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Firestore document ID' } },
      required: ['id'],
    },
    async handler({ id }) {
      try {
        const p = await getDoc('projects', String(id))
        return p ? ok(p) : fail(`Project ${id} not found`)
      } catch (e) { return fail(`get_project failed: ${String(e)}`) }
    },
  },

  // ── Deals ─────────────────────────────────────────────────────────────────

  {
    name: 'list_deals',
    description: 'List all deals in the sales pipeline. Filter by stage or responsible person.',
    inputSchema: {
      type: 'object',
      properties: {
        stage:       { type: 'string', enum: ['lead', 'qualified', 'proposal', 'search', 'offer', 'won', 'lost'] },
        responsible: { type: 'string', description: 'Name of responsible person' },
        limit:       { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
    },
    async handler({ stage, responsible, limit }) {
      try {
        const lim = Math.min(num(limit, 50), 200)
        const all = await listDocs(adminDb.collection('deals').orderBy('createdAt', 'desc'), 200)
        const filtered = all
          .filter((d) => !stage       || d['stage'] === stage)
          .filter((d) => !responsible || (d['responsible'] as string | undefined)
            ?.toLowerCase().includes(String(responsible).toLowerCase()))
          .slice(0, lim)
        const enriched = filtered.map((d) => {
          const feeValue  = num(d['feeValue'], 0)
          const salary    = num(d['salaryCzk'], 0)
          const prob      = num(d['probability'], 0)
          const estimated = d['feeType'] === 'percentage' ? salary * (feeValue / 100) : feeValue
          return { ...d, estimatedFee: estimated, weightedFee: estimated * (prob / 100) }
        })
        return ok({ count: enriched.length, deals: enriched })
      } catch (e) { return fail(`list_deals failed: ${String(e)}`) }
    },
  },

  {
    name: 'get_deal',
    description: 'Get a single deal by ID.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string' } },
      required: ['id'],
    },
    async handler({ id }) {
      try {
        const d = await getDoc('deals', String(id))
        return d ? ok(d) : fail(`Deal ${id} not found`)
      } catch (e) { return fail(`get_deal failed: ${String(e)}`) }
    },
  },

  {
    name: 'create_deal',
    description: 'Create a new deal in the sales pipeline.',
    inputSchema: {
      type: 'object',
      properties: {
        title:         { type: 'string', description: 'Position/deal name' },
        companyName:   { type: 'string' },
        companyId:     { type: 'string' },
        stage:         { type: 'string', enum: ['lead', 'qualified', 'proposal', 'search', 'offer', 'won', 'lost'], default: 'lead' },
        feeType:       { type: 'string', enum: ['percentage', 'fixed'], default: 'percentage' },
        feeValue:      { type: 'number', description: 'Percentage (e.g. 18) or fixed CZK amount' },
        salaryCzk:     { type: 'number', description: 'Annual salary estimate in CZK (used for % deals)' },
        currency:      { type: 'string', enum: ['CZK', 'EUR'], default: 'CZK' },
        probability:   { type: 'integer', minimum: 0, maximum: 100, default: 50 },
        expectedClose: { type: 'string', description: 'YYYY-MM-DD' },
        responsible:   { type: 'string' },
        note:          { type: 'string' },
      },
      required: ['title', 'companyName', 'feeValue'],
    },
    async handler(data) {
      try {
        const now = Date.now()
        const doc = {
          title:       String(data['title']),
          companyName: String(data['companyName']),
          ...(data['companyId']     ? { companyId:     String(data['companyId']) }    : {}),
          stage:       (data['stage']    as string | undefined) ?? 'lead',
          feeType:     (data['feeType']  as string | undefined) ?? 'percentage',
          feeValue:    num(data['feeValue'], 0),
          ...(data['salaryCzk']     ? { salaryCzk:     num(data['salaryCzk'], 0) } : {}),
          currency:    (data['currency'] as string | undefined) ?? 'CZK',
          probability: num(data['probability'], 50),
          ...(data['expectedClose'] ? { expectedClose: String(data['expectedClose']) } : {}),
          ...(data['responsible']   ? { responsible:   String(data['responsible']) }   : {}),
          ...(data['note']          ? { note:          String(data['note']) }           : {}),
          createdAt: now,
        }
        const ref = await adminDb.collection('deals').add(doc)
        return ok({ id: ref.id, ...doc })
      } catch (e) { return fail(`create_deal failed: ${String(e)}`) }
    },
  },

  // ── Companies ─────────────────────────────────────────────────────────────

  {
    name: 'list_companies',
    description: 'List all companies. Optionally filter by type (klient/partner/dodavatel/ostatní).',
    inputSchema: {
      type: 'object',
      properties: {
        type:  { type: 'string', enum: ['klient', 'partner', 'dodavatel', 'ostatní'] },
        limit: { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
    },
    async handler({ type, limit }) {
      try {
        const lim = Math.min(num(limit, 50), 200)
        const all = await listDocs(adminDb.collection('companies'), 200)
        const filtered = all
          .filter((c) => !type || c['type'] === type)
          .slice(0, lim)
        return ok({ count: filtered.length, companies: filtered })
      } catch (e) { return fail(`list_companies failed: ${String(e)}`) }
    },
  },

  {
    name: 'get_company',
    description: 'Get a single company by ID including contact persons.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Firestore document ID' } },
      required: ['id'],
    },
    async handler({ id }) {
      try {
        const c = await getDoc('companies', String(id))
        return c ? ok(c) : fail(`Company ${id} not found`)
      } catch (e) { return fail(`get_company failed: ${String(e)}`) }
    },
  },

  // ── Pipeline ──────────────────────────────────────────────────────────────

  {
    name: 'list_pipeline',
    description: 'List all candidates on a specific project pipeline, optionally filtered by phase.',
    inputSchema: {
      type: 'object',
      properties: {
        projectId: { type: 'string' },
        phase: { type: 'string', enum: ['contacted', 'presentation', 'interview', 'rejected', 'onboarding', 'closed'] },
      },
      required: ['projectId'],
    },
    async handler({ projectId, phase }) {
      try {
        const all = await listDocs(
          adminDb.collection('projectCandidates')
            .where('projectId', '==', String(projectId))
            .orderBy('addedAt', 'desc'),
          200,
        )
        const filtered = phase ? all.filter((c) => c['phase'] === phase) : all
        return ok({ count: filtered.length, pipeline: filtered })
      } catch (e) { return fail(`list_pipeline failed: ${String(e)}`) }
    },
  },

  {
    name: 'get_candidate_pipeline_history',
    description: 'Get all projects a candidate has been part of, with phase history.',
    inputSchema: {
      type: 'object',
      properties: { candidateId: { type: 'string' } },
      required: ['candidateId'],
    },
    async handler({ candidateId }) {
      try {
        const entries = await listDocs(
          adminDb.collection('projectCandidates')
            .where('candidateId', '==', String(candidateId))
            .orderBy('addedAt', 'desc'),
          100,
        )
        return ok({ count: entries.length, history: entries })
      } catch (e) { return fail(`get_candidate_pipeline_history failed: ${String(e)}`) }
    },
  },

  // ── Activity ──────────────────────────────────────────────────────────────

  {
    name: 'get_recent_activity',
    description: 'Get the most recent activity log entries across the whole platform.',
    inputSchema: {
      type: 'object',
      properties: { count: { type: 'integer', minimum: 1, maximum: 50, default: 20 } },
    },
    async handler({ count }) {
      try {
        const c = Math.min(num(count, 20), 50)
        const entries = await listDocs(adminDb.collection('activityLog').orderBy('ts', 'desc'), c)
        return ok({ count: entries.length, activity: entries })
      } catch (e) { return fail(`get_recent_activity failed: ${String(e)}`) }
    },
  },

  {
    name: 'get_entity_activity',
    description: 'Get activity history for a specific entity (candidate, project, or project_candidate).',
    inputSchema: {
      type: 'object',
      properties: {
        entityType: { type: 'string', enum: ['candidate', 'project', 'project_candidate'] },
        entityId:   { type: 'string' },
      },
      required: ['entityType', 'entityId'],
    },
    async handler({ entityType, entityId }) {
      try {
        const entries = await listDocs(
          adminDb.collection('activityLog')
            .where('entityType', '==', String(entityType))
            .where('entityId',   '==', String(entityId))
            .orderBy('ts', 'desc'),
          50,
        )
        return ok({ entityType, entityId, count: entries.length, activity: entries })
      } catch (e) { return fail(`get_entity_activity failed: ${String(e)}`) }
    },
  },

  // ── Bodyshop ──────────────────────────────────────────────────────────────

  {
    name: 'list_contracts',
    description: 'List all bodyshop contractor agreements. Filter by status (active/ended).',
    inputSchema: {
      type: 'object',
      properties: {
        status: { type: 'string', enum: ['active', 'ended'] },
        limit:  { type: 'integer', minimum: 1, maximum: 200, default: 50 },
      },
    },
    async handler({ status, limit }) {
      try {
        const lim = Math.min(num(limit, 50), 200)
        const all = await listDocs(adminDb.collection('contracts').orderBy('createdAt', 'desc'), 200)
        const filtered = all
          .filter((c) => !status || c['status'] === status)
          .slice(0, lim)
        const enriched = filtered.map((c) => {
          const client     = num(c['mdRateClient'], 0)
          const contractor = num(c['mdRateContractor'], 0)
          const margin     = client > 0 ? Math.round(((client - contractor) / client) * 100) : 0
          return { ...c, marginPercent: margin }
        })
        return ok({ count: enriched.length, contracts: enriched })
      } catch (e) { return fail(`list_contracts failed: ${String(e)}`) }
    },
  },

  {
    name: 'get_worklogs',
    description: 'Get monthly worklogs for a specific contract, sorted newest first.',
    inputSchema: {
      type: 'object',
      properties: { contractId: { type: 'string' } },
      required: ['contractId'],
    },
    async handler({ contractId }) {
      try {
        const worklogs = await listDocs(
          adminDb.collection('worklogs')
            .where('contractId', '==', String(contractId))
            .orderBy('month', 'desc'),
          100,
        )
        const totals = {
          revenue: worklogs.reduce((s, w) => s + num(w['revenue'], 0), 0),
          cost:    worklogs.reduce((s, w) => s + num(w['cost'],    0), 0),
          profit:  worklogs.reduce((s, w) => s + num(w['profit'],  0), 0),
        }
        return ok({ contractId, totals, count: worklogs.length, worklogs })
      } catch (e) { return fail(`get_worklogs failed: ${String(e)}`) }
    },
  },

  // ── Team ──────────────────────────────────────────────────────────────────

  {
    name: 'list_team_members',
    description: 'List all team members (SplenditSuite users) with their display names and emails.',
    inputSchema: { type: 'object', properties: {} },
    async handler() {
      try {
        const members = await listDocs(adminDb.collection('users'), 100)
        return ok({ count: members.length, members })
      } catch (e) { return fail(`list_team_members failed: ${String(e)}`) }
    },
  },
]

// ── Exports ───────────────────────────────────────────────────────────────────

/** Tool definitions (schema only, no handlers) — sent to Claude Cowork via tools/list. */
export const MCP_TOOLS: McpToolDef[] = tools.map(({ handler: _h, ...def }) => def)

/** Execute a tool by name with the given arguments. */
export async function callMcpTool(
  name: string,
  args: Record<string, unknown>,
): Promise<McpResult> {
  const tool = tools.find((t) => t.name === name)
  if (!tool) return { content: [{ type: 'text', text: `Unknown tool: ${name}` }], isError: true }
  return tool.handler(args)
}
