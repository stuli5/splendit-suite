import { marginPercent, formatCurrency, monthLabel } from '@/lib/bodyshop'

jest.mock('@/lib/firebase', () => ({ db: {} }))
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(), addDoc: jest.fn(), updateDoc: jest.fn(),
  deleteDoc: jest.fn(), doc: jest.fn(), getDocs: jest.fn(),
  query: jest.fn(), where: jest.fn(), orderBy: jest.fn(),
}))

describe('marginPercent', () => {
  it('calculates margin correctly', () => {
    expect(marginPercent(1000, 750)).toBe(25)
  })

  it('returns 0 when client rate is 0', () => {
    expect(marginPercent(0, 500)).toBe(0)
  })

  it('returns 0 when rates are equal', () => {
    expect(marginPercent(1000, 1000)).toBe(0)
  })

  it('handles 100% margin (zero cost)', () => {
    expect(marginPercent(1000, 0)).toBe(100)
  })

  it('rounds to nearest integer', () => {
    expect(marginPercent(1000, 333)).toBe(67)
  })

  it('returns negative margin when cost exceeds rate', () => {
    expect(marginPercent(500, 600)).toBe(-20)
  })
})

describe('formatCurrency', () => {
  it('formats CZK', () => {
    const result = formatCurrency(50_000, 'CZK')
    expect(result).toContain('50')
    expect(result).toContain('Kč')
  })

  it('formats EUR', () => {
    const result = formatCurrency(2_000, 'EUR')
    expect(result).toContain('2')
    expect(result).toContain('€')
  })

  it('formats zero', () => {
    const result = formatCurrency(0, 'CZK')
    expect(result).toContain('0')
  })

  it('does not show decimals', () => {
    const result = formatCurrency(1234, 'CZK')
    expect(result).not.toContain(',00')
    expect(result).not.toContain('.00')
  })
})

describe('monthLabel', () => {
  it('returns month and year label', () => {
    const result = monthLabel('2024-01')
    expect(result).toContain('2024')
  })

  it('handles December', () => {
    const result = monthLabel('2024-12')
    expect(result).toContain('2024')
  })
})
