import { NextRequest, NextResponse } from 'next/server'
import { askClaude, extractJson } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { stats } = await req.json()
  if (!stats) return NextResponse.json({ error: 'Missing stats' }, { status: 400 })

  const prompt = `You are a recruitment business analyst. Analyze these stats and provide insights. Return ONLY valid JSON.

Stats:
- Active projects: ${stats.activeProjects}
- Total candidates: ${stats.totalCandidates}
- Candidates in pipeline: ${stats.candidatesInPipeline}
- Interviews scheduled: ${stats.interviews}
- Active contracts (Bodyshop): ${stats.activeContracts}
- New candidates this week: ${stats.newCandidatesWeek}

Return JSON:
{
  "headline": "<1 sentence overall status>",
  "insights": [
    "<insight 1>",
    "<insight 2>",
    "<insight 3>"
  ],
  "alerts": [
    "<alert or recommendation if any>"
  ],
  "focus": "<what to focus on today, 1 sentence>"
}`

  const { text, inputTokens, outputTokens } = await askClaude(prompt, 400)
  const data = extractJson<{
    headline: string
    insights: string[]
    alerts: string[]
    focus: string
  }>(text)
  if (!data) return NextResponse.json({ error: 'Could not generate insights' }, { status: 422 })
  const { logAiUsage } = await import('@/lib/ai-usage')
  logAiUsage(inputTokens, outputTokens).catch(() => {})
  return NextResponse.json({ ok: true, ...data })
}
