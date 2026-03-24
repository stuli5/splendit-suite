import { extractJson } from '@/lib/ai'

// Mock Anthropic SDK — we only test pure helpers here
jest.mock('@anthropic-ai/sdk', () => {
  const mock = jest.fn().mockImplementation(() => ({
    messages: { create: jest.fn() },
  }))
  return { default: mock, __esModule: true }
})

describe('extractJson', () => {
  it('extracts a JSON object from plain text', () => {
    const text = 'Here is the result: {"name": "Jan", "score": 85}'
    const result = extractJson<{ name: string; score: number }>(text)
    expect(result).toEqual({ name: 'Jan', score: 85 })
  })

  it('extracts a JSON array', () => {
    const text = 'Results: [{"q": "Q1"}, {"q": "Q2"}]'
    const result = extractJson<{ q: string }[]>(text)
    expect(result).toHaveLength(2)
    expect(result?.[0].q).toBe('Q1')
  })

  it('returns null when no JSON found', () => {
    expect(extractJson('No JSON here at all')).toBeNull()
  })

  it('returns null for malformed JSON', () => {
    expect(extractJson('{ broken json :')).toBeNull()
  })

  it('handles nested objects', () => {
    const text = '{"a": {"b": {"c": 42}}}'
    const result = extractJson<{ a: { b: { c: number } } }>(text)
    expect(result?.a.b.c).toBe(42)
  })

  it('handles JSON with surrounding whitespace and newlines', () => {
    const text = `
      Some preamble text
      {"key": "value", "num": 123}
      Some trailing text
    `
    const result = extractJson<{ key: string; num: number }>(text)
    expect(result?.key).toBe('value')
    expect(result?.num).toBe(123)
  })
})
