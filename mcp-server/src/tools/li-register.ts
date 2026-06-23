import { z } from 'zod'
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { db } from '../firebase.js'
import { listDocs, getDocById, toText, toError } from '../utils/firestore.js'
import { normalizeLinkedin } from './candidates.js'

const LiApplicantStatus = z.enum(['new', 'reviewed', 'shortlisted', 'rejected', 'serial_spam'])

const LiSignals = z.object({
  hasWorkHistory:     z.boolean().optional(),
  yearsExperience:    z.number().optional(),
  connectionCount:    z.number().optional(),
  aiSummarySuspected: z.boolean().optional(),
  locationMatchesJD:  z.boolean().optional(),
  notes:              z.string().optional(),
}).optional()

export function registerLiRegisterTools(server: McpServer): void {
  // ── record_li_applicant ───────────────────────────────────────────────────
  server.tool(
    'record_li_applicant',
    'Upsert one captured LinkedIn applicant into the inbound staging register. Idempotent per (linkedinId, projectId).',
    {
      projectId: z.string().min(1),
      linkedin:  z.string().min(1),
      name:      z.string().optional(),
      headline:  z.string().optional(),
      location:  z.string().optional(),
      signals:   LiSignals,
      status:    LiApplicantStatus.default('new'),
      reason:    z.string().optional(),
    },
    async ({ projectId, linkedin, name, headline, location, signals, status, reason }) => {
      try {
        const linkedinId = normalizeLinkedin(linkedin)
        const now        = Date.now()
        const existing   = await listDocs(
          db.collection('liApplicants')
            .where('linkedinId', '==', linkedinId)
            .where('projectId',  '==', projectId),
          1,
        )
        if (existing.length > 0) {
          const updates: Record<string, unknown> = {
            status, updatedAt: now,
            ...(name     !== undefined && { name }),
            ...(headline !== undefined && { headline }),
            ...(location !== undefined && { location }),
            ...(signals  !== undefined && { signals }),
            ...(reason   !== undefined && { reason }),
          }
          await db.collection('liApplicants').doc(existing[0].id).update(updates)
          return toText({ id: existing[0].id, linkedinId, projectId, status, updated: true })
        }
        const docData: Record<string, unknown> = {
          linkedinId, projectId, profileUrl: linkedin, status,
          ...(name     !== undefined && { name }),
          ...(headline !== undefined && { headline }),
          ...(location !== undefined && { location }),
          ...(signals  !== undefined && { signals }),
          ...(reason   !== undefined && { reason }),
          recordedAt: now, updatedAt: now,
        }
        const ref = await db.collection('liApplicants').add(docData)
        return toText({ id: ref.id, linkedinId, projectId, status, created: true })
      } catch (err) {
        return toError(`record_li_applicant failed: ${String(err)}`)
      }
    },
  )

  // ── list_li_applicants ────────────────────────────────────────────────────
  server.tool(
    'list_li_applicants',
    'List inbound LinkedIn applicants from the staging register. Optionally filter by project, status, or linkedinId.',
    {
      projectId:  z.string().optional(),
      status:     LiApplicantStatus.optional(),
      linkedinId: z.string().optional(),
      limit:      z.number().int().min(1).max(500).default(100),
    },
    async ({ projectId, status, linkedinId, limit }) => {
      try {
        const all = await listDocs(
          db.collection('liApplicants').orderBy('recordedAt', 'desc'),
          500,
        )
        const filtered = all
          .filter((a) => (!projectId  || a['projectId']  === projectId))
          .filter((a) => (!status     || a['status']     === status))
          .filter((a) => (!linkedinId || a['linkedinId'] === linkedinId))
          .slice(0, limit)
        return toText({ count: filtered.length, applicants: filtered })
      } catch (err) {
        return toError(`list_li_applicants failed: ${String(err)}`)
      }
    },
  )

  // ── analyze_li_register ───────────────────────────────────────────────────
  server.tool(
    'analyze_li_register',
    'Aggregate cross-JD overlap and credibility analysis over the inbound LinkedIn applicant register.',
    {
      projectIds: z.array(z.string()).optional().describe('Filter to specific project IDs; omit for all'),
    },
    async ({ projectIds }) => {
      try {
        const all    = await listDocs(db.collection('liApplicants'), 5000)
        const scoped = projectIds && projectIds.length > 0
          ? all.filter((a) => projectIds.includes(a['projectId'] as string))
          : all

        // Group by linkedinId
        const byLinkedinId = new Map<string, typeof scoped>()
        for (const a of scoped) {
          const lid   = a['linkedinId'] as string
          const group = byLinkedinId.get(lid) ?? []
          group.push(a)
          byLinkedinId.set(lid, group)
        }

        // perProject counts
        const projectCountMap = new Map<string, { count: number; byStatus: Record<string, number> }>()
        for (const a of scoped) {
          const pid   = a['projectId'] as string
          const entry = projectCountMap.get(pid) ?? { count: 0, byStatus: {} }
          entry.count++
          const s = (a['status'] as string) ?? 'new'
          entry.byStatus[s] = (entry.byStatus[s] ?? 0) + 1
          projectCountMap.set(pid, entry)
        }
        const perProject = Array.from(projectCountMap.entries())
          .map(([pId, stats]) => ({ projectId: pId, ...stats }))

        // crossJdOverlap: linkedinIds present in >=2 distinct projects
        const crossJdOverlap = Array.from(byLinkedinId.entries())
          .filter(([, docs]) => new Set(docs.map((d) => d['projectId'])).size >= 2)
          .map(([lid, docs]) => ({
            linkedinId:   lid,
            name:         docs[0]['name'] as string | undefined,
            projectCount: new Set(docs.map((d) => d['projectId'])).size,
            projects:     docs.map((d) => ({ projectId: d['projectId'] as string, status: d['status'] as string })),
          }))
          .sort((a, b) => b.projectCount - a.projectCount)

        // credibilityBreakdown
        const credibilityBreakdown: Record<string, number> = {
          new: 0, reviewed: 0, shortlisted: 0, rejected: 0, serial_spam: 0,
        }
        for (const a of scoped) {
          const s = (a['status'] as string) ?? 'new'
          if (s in credibilityBreakdown) credibilityBreakdown[s]++
        }

        // flagged: low-credibility signals
        const flagged = scoped
          .filter((a) => {
            const sig = a['signals'] as Record<string, unknown> | undefined
            return !!sig && (
              sig['hasWorkHistory'] === false ||
              sig['aiSummarySuspected'] === true ||
              sig['locationMatchesJD'] === false
            )
          })
          .map((a) => {
            const sig     = a['signals'] as Record<string, unknown>
            const tripped: string[] = []
            if (sig['hasWorkHistory']   === false) tripped.push('hasWorkHistory:false')
            if (sig['aiSummarySuspected'] === true) tripped.push('aiSummarySuspected:true')
            if (sig['locationMatchesJD'] === false) tripped.push('locationMatchesJD:false')
            return {
              linkedinId: a['linkedinId'] as string,
              projectId:  a['projectId']  as string,
              trippedSignals: tripped,
            }
          })

        return toText({
          totalApplications: scoped.length,
          uniqueApplicants:  byLinkedinId.size,
          perProject,
          crossJdOverlap,
          credibilityBreakdown,
          flagged,
        })
      } catch (err) {
        return toError(`analyze_li_register failed: ${String(err)}`)
      }
    },
  )

  // ── promote_li_applicant ──────────────────────────────────────────────────
  server.tool(
    'promote_li_applicant',
    'Promote a staged LinkedIn applicant to the CRM: creates a crmCandidate, adds to project pipeline at phase "reviewed", and marks the register doc as promoted.',
    {
      registerId: z.string().min(1).describe('liApplicants document ID'),
      position:   z.string().min(1).describe('Job position / role title for the CRM candidate'),
      source:     z.enum(['linkedin', 'recru', 'manual', 'portal']).default('linkedin'),
    },
    async ({ registerId, position, source }) => {
      try {
        const regDoc = await getDocById<Record<string, unknown>>('liApplicants', registerId)
        if (!regDoc) return toError(`liApplicants doc ${registerId} not found`)

        if (regDoc['promotedCandidateId']) {
          return toText({ registerId, promotedCandidateId: regDoc['promotedCandidateId'], alreadyPromoted: true })
        }

        const now       = Date.now()
        const fullName  = (regDoc['name'] as string | undefined) ?? ''
        const nameParts = fullName.trim().split(/\s+/)

        // Create CRM candidate
        const candidateDoc: Record<string, unknown> = {
          firstName:    nameParts[0] ?? 'Unknown',
          lastName:     nameParts.slice(1).join(' '),
          position,
          stage:        'new',
          source,
          linkedIn:     regDoc['profileUrl'] as string | undefined,
          linkedinId:   regDoc['linkedinId'] as string,
          stageHistory: [{ stage: 'new', ts: now }],
          createdAt:    now,
          updatedAt:    now,
        }
        const candidateRef = await db.collection('crmCandidates').add(candidateDoc)
        const candidateId  = candidateRef.id
        const projectId    = regDoc['projectId'] as string

        // Add to pipeline (idempotent)
        const existing = await listDocs(
          db.collection('projectCandidates')
            .where('projectId',   '==', projectId)
            .where('candidateId', '==', candidateId),
          1,
        )
        if (existing.length === 0) {
          await db.collection('projectCandidates').add({
            projectId, candidateId, phase: 'reviewed',
            addedAt: now, updatedAt: now,
          })
        }

        // Back-link on register doc
        await db.collection('liApplicants').doc(registerId).update({
          promotedCandidateId: candidateId,
          status:              'reviewed',
          updatedAt:           now,
        })

        return toText({ registerId, candidateId, projectId, promoted: true })
      } catch (err) {
        return toError(`promote_li_applicant failed: ${String(err)}`)
      }
    },
  )
}
