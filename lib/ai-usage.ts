import { doc, setDoc, getDoc, increment } from 'firebase/firestore'
import { db } from './firebase'

// Claude Haiku 4.5 pricing (USD per token, as of 2025)
const INPUT_PRICE  = 0.80 / 1_000_000   // $0.80 per 1M input tokens
const OUTPUT_PRICE = 4.00 / 1_000_000   // $4.00 per 1M output tokens

export function calcCost(inputTokens: number, outputTokens: number): number {
  return inputTokens * INPUT_PRICE + outputTokens * OUTPUT_PRICE
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7) // YYYY-MM
}

export async function logAiUsage(inputTokens: number, outputTokens: number): Promise<void> {
  const month = currentMonth()
  const ref   = doc(db, 'aiUsage', month)
  await setDoc(ref, {
    month,
    inputTokens:  increment(inputTokens),
    outputTokens: increment(outputTokens),
    calls:        increment(1),
    updatedAt:    Date.now(),
  }, { merge: true })
}

export interface MonthlyUsage {
  month:        string
  inputTokens:  number
  outputTokens: number
  calls:        number
  cost:         number
}

export async function getMonthlyUsage(month = currentMonth()): Promise<MonthlyUsage | null> {
  const snap = await getDoc(doc(db, 'aiUsage', month))
  if (!snap.exists()) return null
  const d = snap.data()
  return {
    month:        d.month        as string,
    inputTokens:  d.inputTokens  as number,
    outputTokens: d.outputTokens as number,
    calls:        d.calls        as number,
    cost:         calcCost(d.inputTokens as number, d.outputTokens as number),
  }
}

export function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`
  return `${n}`
}
