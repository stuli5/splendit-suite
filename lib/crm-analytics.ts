import type { CRMCandidate, CRMStage, CandidateSource } from './types'

// ─── Stage order ────────────────────────────────────────────────────────────

export const STAGE_ORDER: CRMStage[] = ['new', 'screening', 'interview', 'offer']

// ─── Types ──────────────────────────────────────────────────────────────────

export interface StageMetrics {
  stage:          CRMStage
  count:          number
  conversionRate: number   // % of previous stage that reached this stage (0–100)
}

export interface SourceMetrics {
  source:     CandidateSource | 'unknown'
  count:      number
  percentage: number   // 0–100
}

export interface TimeInStageMetrics {
  stage:          CRMStage
  avgDays:        number
  candidateCount: number
}

export interface FunnelMetrics {
  total:       number
  stages:      StageMetrics[]
  sources:     SourceMetrics[]
  timeInStage: TimeInStageMetrics[]
}

// ─── Helpers ────────────────────────────────────────────────────────────────

const MS_PER_DAY = 1000 * 60 * 60 * 24

/** Effective stage for a candidate — falls back to 'new' when unset. */
function effectiveStage(c: CRMCandidate): CRMStage {
  return c.stage ?? 'new'
}

// ─── Stage funnel ────────────────────────────────────────────────────────────

/**
 * Returns stage metrics for each stage in STAGE_ORDER.
 * conversionRate is the fraction of the previous stage that reached this stage.
 * The first stage (new) always has conversionRate = 100.
 */
export function computeStageMetrics(candidates: CRMCandidate[]): StageMetrics[] {
  const stageCounts = new Map<CRMStage, number>(STAGE_ORDER.map(s => [s, 0]))

  for (const c of candidates) {
    const idx = STAGE_ORDER.indexOf(effectiveStage(c))
    // Credit every stage up to and including current (cumulative funnel)
    for (let i = 0; i <= idx; i++) {
      stageCounts.set(STAGE_ORDER[i], (stageCounts.get(STAGE_ORDER[i]) ?? 0) + 1)
    }
  }

  return STAGE_ORDER.map((stage, i) => {
    const count = stageCounts.get(stage) ?? 0
    const prevCount = i === 0 ? candidates.length : (stageCounts.get(STAGE_ORDER[i - 1]) ?? 0)
    const conversionRate = prevCount === 0 ? 0 : Math.round((count / prevCount) * 100)
    return { stage, count, conversionRate }
  })
}

// ─── Source breakdown ────────────────────────────────────────────────────────

export function computeSourceMetrics(candidates: CRMCandidate[]): SourceMetrics[] {
  const counts = new Map<CandidateSource | 'unknown', number>()

  for (const c of candidates) {
    const src: CandidateSource | 'unknown' = c.source ?? 'unknown'
    counts.set(src, (counts.get(src) ?? 0) + 1)
  }

  const total = candidates.length || 1

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([source, count]) => ({
      source,
      count,
      percentage: Math.round((count / total) * 100),
    }))
}

// ─── Time in stage ───────────────────────────────────────────────────────────

/**
 * For each candidate that has stageHistory, compute how many ms were spent
 * in each stage (from entry ts to next entry ts, or to Date.now() for current).
 * Returns avg days per stage across all candidates with data for that stage.
 */
export function computeTimeInStage(candidates: CRMCandidate[], now = Date.now()): TimeInStageMetrics[] {
  const totalMs  = new Map<CRMStage, number>(STAGE_ORDER.map(s => [s, 0]))
  const counts   = new Map<CRMStage, number>(STAGE_ORDER.map(s => [s, 0]))

  for (const c of candidates) {
    const history = c.stageHistory
    if (!history || history.length === 0) continue

    const sorted = [...history].sort((a, b) => a.ts - b.ts)

    for (let i = 0; i < sorted.length; i++) {
      const { stage, ts } = sorted[i]
      if (!STAGE_ORDER.includes(stage)) continue

      const endTs = i + 1 < sorted.length ? sorted[i + 1].ts : now
      const duration = endTs - ts

      totalMs.set(stage, (totalMs.get(stage) ?? 0) + duration)
      counts.set(stage, (counts.get(stage) ?? 0) + 1)
    }
  }

  return STAGE_ORDER.map(stage => {
    const n      = counts.get(stage) ?? 0
    const total  = totalMs.get(stage) ?? 0
    const avgMs  = n === 0 ? 0 : total / n
    return { stage, avgDays: Math.round(avgMs / MS_PER_DAY * 10) / 10, candidateCount: n }
  })
}

// ─── Main entry point ────────────────────────────────────────────────────────

export function computeFunnelMetrics(candidates: CRMCandidate[], now?: number): FunnelMetrics {
  return {
    total:       candidates.length,
    stages:      computeStageMetrics(candidates),
    sources:     computeSourceMetrics(candidates),
    timeInStage: computeTimeInStage(candidates, now),
  }
}
