import { NextRequest, NextResponse } from 'next/server'
import { askClaude, extractJson } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { project, candidates } = await req.json()
  if (!project || !candidates?.length) return NextResponse.json({ error: 'Missing data' }, { status: 400 })

  const candidateList = candidates
    .map((c: { id: string; firstName: string; lastName: string; position: string }) =>
      `- ID: ${c.id} | ${c.firstName} ${c.lastName} | ${c.position}`)
    .join('\n')

  const prompt = `You are a recruitment expert. Rank these candidates for the position and return ONLY valid JSON array.

Position: ${project.positionName} at ${project.companyName}
Contract: ${project.cooperationType ?? 'HPP'}
Job description: ${project.jobDescription ?? 'Not provided'}

Candidates:
${candidateList}

Return top matches as JSON array (max 5):
[
  {
    "candidateId": "<id>",
    "score": <0-100>,
    "label": "<Poor|Fair|Good|Strong|Excellent>",
    "reason": "<1 sentence>"
  }
]`

  const text = await askClaude(prompt, 600)
  const data = extractJson<{ candidateId: string; score: number; label: string; reason: string }[]>(text)
  if (!data) return NextResponse.json({ error: 'Could not match candidates' }, { status: 422 })
  return NextResponse.json({ ok: true, matches: data })
}
