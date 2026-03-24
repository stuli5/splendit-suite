import { NextRequest, NextResponse } from 'next/server'
import { askClaude, extractJson } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { candidate, project } = await req.json()
  if (!candidate || !project) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  const prompt = `Evaluate how well this candidate fits the project position. Return ONLY valid JSON.

Candidate:
- Name: ${candidate.firstName} ${candidate.lastName}
- Current position: ${candidate.position}

Project:
- Position: ${project.positionName}
- Company: ${project.companyName}
- Type: ${project.cooperationType ?? 'HPP'}
- Job description: ${project.jobDescription ?? 'Not provided'}

Return JSON:
{
  "score": <number 0-100>,
  "label": "<Poor|Fair|Good|Strong|Excellent>",
  "reason": "<1 sentence explanation>"
}`

  const text  = await askClaude(prompt, 200)
  const data  = extractJson<{ score: number; label: string; reason: string }>(text)
  if (!data)  return NextResponse.json({ error: 'Could not evaluate' }, { status: 422 })
  return NextResponse.json({ ok: true, ...data })
}
