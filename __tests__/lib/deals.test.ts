import { estimatedFee, weightedFee, formatFee } from '@/lib/deals'
import type { Deal } from '@/lib/types'

// ── Mock Firebase so imports don't crash ──────────────────────────────────────
jest.mock('@/lib/firebase', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  addDoc:     jest.fn(),
  updateDoc:  jest.fn(),
  deleteDoc:  jest.fn(),
  doc:        jest.fn(),
  getDocs:    jest.fn(),
  orderBy:    jest.fn(),
  query:      jest.fn(),
}))

const base: Deal = {
  id: '1', title: 'Senior Dev', companyName: 'Acme', companyId: undefined,
  stage: 'search', feeType: 'percentage', feeValue: 18,
  salaryCzk: 1_200_000, currency: 'CZK', probability: 50,
  createdAt: Date.now(),
}

describe('estimatedFee', () => {
  it('calculates percentage fee correctly', () => {
    expect(estimatedFee(base)).toBe(216_000) // 18% of 1 200 000
  })

  it('returns fixed fee directly', () => {
    const deal = { ...base, feeType: 'fixed' as const, feeValue: 90_000 }
    expect(estimatedFee(deal)).toBe(90_000)
  })

  it('returns 0 when salary is missing for percentage deal', () => {
    const deal = { ...base, salaryCzk: undefined }
    expect(estimatedFee(deal)).toBe(0)
  })

  it('handles 0% fee', () => {
    const deal = { ...base, feeValue: 0 }
    expect(estimatedFee(deal)).toBe(0)
  })

  it('handles 100% fee', () => {
    const deal = { ...base, feeValue: 100 }
    expect(estimatedFee(deal)).toBe(1_200_000)
  })
})

describe('weightedFee', () => {
  it('applies probability correctly', () => {
    expect(weightedFee(base)).toBe(108_000) // 216 000 × 50%
  })

  it('returns full fee at 100% probability', () => {
    const deal = { ...base, probability: 100 }
    expect(weightedFee(deal)).toBe(216_000)
  })

  it('returns 0 at 0% probability', () => {
    const deal = { ...base, probability: 0 }
    expect(weightedFee(deal)).toBe(0)
  })

  it('works with fixed fee deals', () => {
    const deal = { ...base, feeType: 'fixed' as const, feeValue: 100_000, probability: 75 }
    expect(weightedFee(deal)).toBe(75_000)
  })
})

describe('formatFee', () => {
  it('formats CZK currency', () => {
    const result = formatFee(216_000, 'CZK')
    expect(result).toContain('216')
    expect(result).toContain('Kč')
  })

  it('formats EUR currency', () => {
    const result = formatFee(8_000, 'EUR')
    expect(result).toContain('8')
    expect(result).toContain('€')
  })

  it('formats zero correctly', () => {
    const result = formatFee(0, 'CZK')
    expect(result).toContain('0')
  })
})
