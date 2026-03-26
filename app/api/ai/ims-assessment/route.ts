import { NextRequest, NextResponse } from 'next/server'
import { askClaude } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { name, position, experience, score, easyScore, mediumScore, hardScore, conclusion } = await req.json()
  if (!position) return NextResponse.json({ error: 'Missing position' }, { status: 400 })

  const prompt = `You are a senior technical recruiter. Write a concise AI assessment for this interview candidate.

Candidate: ${name ?? 'Unknown'}
Position: ${position}
Experience: ${experience ?? 'not specified'}
Overall score: ${score}%
Easy questions: ${easyScore ?? 0} pts
Medium questions: ${mediumScore ?? 0} pts
Hard questions: ${hardScore ?? 0} pts
Interviewer notes: ${conclusion ?? 'none'}

Write 3-4 sentences covering:
1. Overall performance summary
2. Technical strengths based on scores
3. Areas to probe further
4. Hiring recommendation (Strong Yes / Yes / Maybe / No)

Be direct and professional. Plain text only.`

  const { text: assessment, inputTokens, outputTokens } = await askClaude(prompt, 300)
  const { logAiUsage } = await import('@/lib/ai-usage')
  logAiUsage(inputTokens, outputTokens).catch(() => {})
  return NextResponse.json({ ok: true, assessment })
}
