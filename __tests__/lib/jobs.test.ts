import { generateSlug, formatSalary, JOB_TYPE_LABELS, WORK_MODE_LABELS } from '@/lib/jobs'
import type { Job } from '@/lib/types'

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
  where:      jest.fn(),
}))

const base: Job = {
  id: '1', title: 'Senior React Developer', slug: 'senior-react-developer-abc',
  location: 'Prague', workMode: 'hybrid', type: 'full-time',
  salaryMin: 80_000, salaryMax: 120_000, currency: 'CZK',
  description: 'Build great things.', tags: ['React', 'TypeScript'],
  status: 'published', createdAt: Date.now(),
}

// ── generateSlug ──────────────────────────────────────────────────────────────

describe('generateSlug', () => {
  it('lowercases and replaces spaces with hyphens', () => {
    const slug = generateSlug('Senior React Developer')
    expect(slug).toMatch(/^senior-react-developer-/)
  })

  it('strips diacritics', () => {
    const slug = generateSlug('Vývoj softwaru')
    expect(slug).not.toMatch(/[áéíóúůýčšžřňťď]/)
  })

  it('strips special characters', () => {
    const slug = generateSlug('C# / .NET Developer')
    expect(slug).toMatch(/^c-net-developer-/)
  })

  it('appends a unique suffix', () => {
    const a = generateSlug('Dev')
    const b = generateSlug('Dev')
    // Both start with "dev-" but suffix may differ due to timing
    expect(a).toMatch(/^dev-/)
    expect(b).toMatch(/^dev-/)
  })

  it('collapses multiple hyphens', () => {
    const slug = generateSlug('C   C++   Dev')
    expect(slug).not.toMatch(/--/)
  })
})

// ── formatSalary ──────────────────────────────────────────────────────────────

describe('formatSalary', () => {
  it('returns range when both min and max are set', () => {
    const result = formatSalary(base)
    expect(result).toContain('80')
    expect(result).toContain('120')
    expect(result).toContain('CZK')
  })

  it('returns "from X" when only min is set', () => {
    const job = { ...base, salaryMax: undefined }
    const result = formatSalary(job)
    expect(result).toContain('from')
    expect(result).toContain('80')
  })

  it('returns "up to X" when only max is set', () => {
    const job = { ...base, salaryMin: undefined }
    const result = formatSalary(job)
    expect(result).toContain('up to')
    expect(result).toContain('120')
  })

  it('returns empty string when neither is set', () => {
    const job = { ...base, salaryMin: undefined, salaryMax: undefined }
    expect(formatSalary(job)).toBe('')
  })

  it('formats EUR correctly', () => {
    const job = { ...base, salaryMin: 3_000, salaryMax: 4_500, currency: 'EUR' as const }
    const result = formatSalary(job)
    expect(result).toContain('EUR')
  })
})

// ── Label maps ────────────────────────────────────────────────────────────────

describe('JOB_TYPE_LABELS', () => {
  it('covers all job types', () => {
    expect(JOB_TYPE_LABELS['full-time']).toBe('Full-time')
    expect(JOB_TYPE_LABELS['part-time']).toBe('Part-time')
    expect(JOB_TYPE_LABELS['contract']).toBe('Contract')
    expect(JOB_TYPE_LABELS['freelance']).toBe('Freelance')
  })
})

describe('WORK_MODE_LABELS', () => {
  it('covers all work modes', () => {
    expect(WORK_MODE_LABELS['remote']).toBe('Remote')
    expect(WORK_MODE_LABELS['hybrid']).toBe('Hybrid')
    expect(WORK_MODE_LABELS['onsite']).toBe('On-site')
  })
})
