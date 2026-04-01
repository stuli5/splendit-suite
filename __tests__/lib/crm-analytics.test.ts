import {
  computeStageMetrics,
  computeSourceMetrics,
  computeTimeInStage,
  computeFunnelMetrics,
  STAGE_ORDER,
} from '@/lib/crm-analytics'
import type { CRMCandidate } from '@/lib/types'

// ─── Fixtures ────────────────────────────────────────────────────────────────

function makeCandidate(overrides: Partial<CRMCandidate> = {}): CRMCandidate {
  return {
    id:        'test-id',
    firstName: 'Test',
    lastName:  'User',
    position:  'Dev',
    stage:     'new',
    createdAt: 1_000_000,
    ...overrides,
  }
}

// ─── computeStageMetrics ─────────────────────────────────────────────────────

describe('computeStageMetrics', () => {
  it('returns zero counts for empty list', () => {
    const result = computeStageMetrics([])
    expect(result.every(s => s.count === 0)).toBe(true)
  })

  it('counts all candidates in new stage', () => {
    const candidates = [
      makeCandidate({ stage: 'new' }),
      makeCandidate({ stage: 'new' }),
    ]
    const result = computeStageMetrics(candidates)
    const newMetric = result.find(s => s.stage === 'new')!
    expect(newMetric.count).toBe(2)
    expect(newMetric.conversionRate).toBe(100)
  })

  it('counts cumulative — candidate in offer counts for all stages', () => {
    const candidates = [makeCandidate({ stage: 'offer' })]
    const result = computeStageMetrics(candidates)
    for (const s of result) {
      expect(s.count).toBe(1)
    }
  })

  it('computes conversion rate correctly', () => {
    const candidates = [
      makeCandidate({ stage: 'new' }),
      makeCandidate({ stage: 'new' }),
      makeCandidate({ stage: 'screening' }),
    ]
    const result = computeStageMetrics(candidates)
    const newM       = result.find(s => s.stage === 'new')!
    const screeningM = result.find(s => s.stage === 'screening')!
    // 3 candidates reached new, 1 reached screening
    expect(newM.count).toBe(3)
    expect(newM.conversionRate).toBe(100)
    expect(screeningM.count).toBe(1)
    expect(screeningM.conversionRate).toBe(Math.round((1 / 3) * 100))
  })

  it('returns stages in STAGE_ORDER', () => {
    const result = computeStageMetrics([])
    expect(result.map(s => s.stage)).toEqual(STAGE_ORDER)
  })

  it('treats missing stage as new', () => {
    const c = makeCandidate({ stage: undefined })
    const result = computeStageMetrics([c])
    const newM = result.find(s => s.stage === 'new')!
    expect(newM.count).toBe(1)
  })
})

// ─── computeSourceMetrics ────────────────────────────────────────────────────

describe('computeSourceMetrics', () => {
  it('returns empty array for no candidates', () => {
    expect(computeSourceMetrics([])).toEqual([])
  })

  it('groups by source correctly', () => {
    const candidates = [
      makeCandidate({ source: 'linkedin' }),
      makeCandidate({ source: 'linkedin' }),
      makeCandidate({ source: 'manual' }),
    ]
    const result = computeSourceMetrics(candidates)
    const li = result.find(s => s.source === 'linkedin')!
    const ma = result.find(s => s.source === 'manual')!
    expect(li.count).toBe(2)
    expect(li.percentage).toBe(67)
    expect(ma.count).toBe(1)
    expect(ma.percentage).toBe(33)
  })

  it('treats missing source as unknown', () => {
    const c = makeCandidate({ source: undefined })
    const result = computeSourceMetrics([c])
    expect(result[0].source).toBe('unknown')
    expect(result[0].count).toBe(1)
    expect(result[0].percentage).toBe(100)
  })

  it('sorts by count descending', () => {
    const candidates = [
      makeCandidate({ source: 'manual' }),
      makeCandidate({ source: 'linkedin' }),
      makeCandidate({ source: 'linkedin' }),
    ]
    const result = computeSourceMetrics(candidates)
    expect(result[0].source).toBe('linkedin')
  })
})

// ─── computeTimeInStage ──────────────────────────────────────────────────────

describe('computeTimeInStage', () => {
  const DAY = 1000 * 60 * 60 * 24

  it('returns zero counts for candidates without stageHistory', () => {
    const candidates = [makeCandidate()]
    const result = computeTimeInStage(candidates)
    expect(result.every(t => t.candidateCount === 0)).toBe(true)
  })

  it('computes time from entry to next entry', () => {
    const now = 10 * DAY
    const c = makeCandidate({
      stageHistory: [
        { stage: 'new',       ts: 0 },
        { stage: 'screening', ts: 2 * DAY },
      ],
    })
    const result = computeTimeInStage([c], now)
    const newT = result.find(t => t.stage === 'new')!
    const scrT = result.find(t => t.stage === 'screening')!
    // new: 0 → 2*DAY = 2 days
    expect(newT.avgDays).toBe(2)
    expect(newT.candidateCount).toBe(1)
    // screening: 2*DAY → now(10*DAY) = 8 days
    expect(scrT.avgDays).toBe(8)
    expect(scrT.candidateCount).toBe(1)
  })

  it('averages across multiple candidates', () => {
    const now = 10 * DAY
    const c1 = makeCandidate({ stageHistory: [{ stage: 'new', ts: 0 }] })
    const c2 = makeCandidate({ stageHistory: [{ stage: 'new', ts: 4 * DAY }] })
    const result = computeTimeInStage([c1, c2], now)
    const newT = result.find(t => t.stage === 'new')!
    // c1: 10d, c2: 6d → avg 8d
    expect(newT.avgDays).toBe(8)
    expect(newT.candidateCount).toBe(2)
  })

  it('handles unsorted stageHistory', () => {
    const now = 6 * DAY
    const c = makeCandidate({
      stageHistory: [
        { stage: 'screening', ts: 3 * DAY },
        { stage: 'new',       ts: 0 },
      ],
    })
    const result = computeTimeInStage([c], now)
    const newT = result.find(t => t.stage === 'new')!
    // new: 0 → 3*DAY = 3 days
    expect(newT.avgDays).toBe(3)
  })
})

// ─── computeFunnelMetrics ────────────────────────────────────────────────────

describe('computeFunnelMetrics', () => {
  it('returns correct total', () => {
    const candidates = [makeCandidate(), makeCandidate()]
    const m = computeFunnelMetrics(candidates)
    expect(m.total).toBe(2)
  })

  it('returns all three metric types', () => {
    const m = computeFunnelMetrics([])
    expect(m.stages).toBeDefined()
    expect(m.sources).toBeDefined()
    expect(m.timeInStage).toBeDefined()
  })
})
