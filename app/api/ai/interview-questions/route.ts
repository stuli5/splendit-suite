import { NextRequest, NextResponse } from 'next/server'
import { askClaude, extractJson } from '@/lib/ai'
import { requireAuth } from '@/lib/api-auth'

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const { position, difficulty, count = 5 } = await req.json()
  if (!position) return NextResponse.json({ error: 'Missing position' }, { status: 400 })

  const prompt = `Generate ${count} interview questions for a ${position} candidate.
Difficulty: ${difficulty ?? 'medium'}

Return ONLY valid JSON array:
[
  {
    "question": "<question text>",
    "category": "<Technical|Behavioral|Situational|Cultural>",
    "difficulty": "${difficulty ?? 'medium'}",
    "hint": "<what a good answer should include, 1 sentence>"
  }
]`

  const { text, inputTokens, outputTokens } = await askClaude(prompt, 800)
  const data = extractJson<{ question: string; category: string; difficulty: string; hint: string }[]>(text)
  if (!data) return NextResponse.json({ error: 'Could not generate questions' }, { status: 422 })
  const { logAiUsage } = await import('@/lib/ai-usage')
  logAiUsage(inputTokens, outputTokens).catch(() => {})
  return NextResponse.json({ ok: true, questions: data })
}
