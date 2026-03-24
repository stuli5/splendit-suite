import { NextRequest, NextResponse } from 'next/server'
import { askClaude } from '@/lib/ai'

export async function POST(req: NextRequest) {
  const { positionName, companyName, type, cooperationType } = await req.json()
  if (!positionName) return NextResponse.json({ error: 'Missing positionName' }, { status: 400 })

  const prompt = `Write a professional job description for a recruitment posting.

Position: ${positionName}
Company: ${companyName ?? 'a technology company'}
Type: ${type ?? 'recruitment'}
Contract: ${cooperationType ?? 'HPP'}

Write in English. Include:
- Short intro (2 sentences)
- Key responsibilities (5-6 bullet points)
- Requirements (5-6 bullet points)
- Nice to have (3 bullet points)

Keep it concise and professional. Plain text, use • for bullets.`

  const text = await askClaude(prompt, 800)
  return NextResponse.json({ ok: true, text })
}
