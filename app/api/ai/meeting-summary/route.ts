import { NextRequest, NextResponse } from 'next/server'
import { askClaude, extractJson } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { transcript, agenda, meetName } = await req.json()
  if (!transcript?.trim()) return NextResponse.json({ error: 'Missing transcript' }, { status: 400 })

  const prompt = `Summarize this meeting and extract action items. Return ONLY valid JSON.

Meeting: ${meetName ?? 'Team meeting'}
Agenda: ${agenda ?? 'Not provided'}

Transcript:
${transcript.slice(0, 6000)}

Return JSON:
{
  "summary": "<2-3 sentence summary>",
  "keyDecisions": ["<decision 1>", "<decision 2>"],
  "actionItems": [
    { "task": "<task>", "assignee": "<name or 'TBD'>", "deadline": "<deadline or 'TBD'>" }
  ],
  "sentiment": "<Positive|Neutral|Negative>",
  "nextSteps": "<1 sentence recommendation>"
}`

  const { text, inputTokens, outputTokens } = await askClaude(prompt, 800)
  const data = extractJson<{
    summary: string
    keyDecisions: string[]
    actionItems: { task: string; assignee: string; deadline: string }[]
    sentiment: string
    nextSteps: string
  }>(text)
  if (!data) return NextResponse.json({ error: 'Could not summarize meeting' }, { status: 422 })
  const { logAiUsage } = await import('@/lib/ai-usage')
  logAiUsage(inputTokens, outputTokens).catch(() => {})
  return NextResponse.json({ ok: true, ...data })
}
