import { getUpcomingBirthdays } from '@/components/crm-candidates/BirthdayAlert'
import type { CRMCandidate } from '@/lib/types'

function makeCandidate(overrides: Partial<CRMCandidate> & { id: string }): CRMCandidate {
  return {
    firstName: 'Test',
    lastName:  'User',
    position:  'Developer',
    createdAt: Date.now(),
    ...overrides,
  }
}

function dobInDays(days: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  // Same month/day but use a past year so it's a valid birth date
  const year = d.getFullYear() - 25
  return `${year}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

describe('getUpcomingBirthdays', () => {
  it('returns empty array when no candidates have dateOfBirth', () => {
    const candidates = [makeCandidate({ id: '1' })]
    expect(getUpcomingBirthdays(candidates)).toHaveLength(0)
  })

  it('includes candidate with birthday today (0 days)', () => {
    const candidates = [makeCandidate({ id: '1', dateOfBirth: dobInDays(0) })]
    const result = getUpcomingBirthdays(candidates)
    expect(result).toHaveLength(1)
    expect(result[0].daysUntil).toBe(0)
  })

  it('includes candidate with birthday in 7 days', () => {
    const candidates = [makeCandidate({ id: '1', dateOfBirth: dobInDays(7) })]
    const result = getUpcomingBirthdays(candidates)
    expect(result).toHaveLength(1)
    expect(result[0].daysUntil).toBe(7)
  })

  it('excludes candidate with birthday in 8 days', () => {
    const candidates = [makeCandidate({ id: '1', dateOfBirth: dobInDays(8) })]
    expect(getUpcomingBirthdays(candidates)).toHaveLength(0)
  })

  it('sorts by days until birthday ascending', () => {
    const candidates = [
      makeCandidate({ id: '1', dateOfBirth: dobInDays(5) }),
      makeCandidate({ id: '2', dateOfBirth: dobInDays(1) }),
      makeCandidate({ id: '3', dateOfBirth: dobInDays(3) }),
    ]
    const result = getUpcomingBirthdays(candidates)
    expect(result.map(r => r.daysUntil)).toEqual([1, 3, 5])
  })

  it('skips candidates without dateOfBirth', () => {
    const candidates = [
      makeCandidate({ id: '1' }),
      makeCandidate({ id: '2', dateOfBirth: dobInDays(2) }),
    ]
    const result = getUpcomingBirthdays(candidates)
    expect(result).toHaveLength(1)
    expect(result[0].candidate.id).toBe('2')
  })
})
