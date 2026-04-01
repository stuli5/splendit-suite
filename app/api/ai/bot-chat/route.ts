import { NextRequest, NextResponse } from 'next/server'
import { askClaude } from '@/lib/ai'
import { requireAuth } from '@/lib/api-auth'

const SYSTEM = `You are SplenditBot, the AI assistant for SplenditSuite — an internal IT recruitment platform used by Splendit, a Czech IT staffing company.

The platform has the following modules:
- CRM Candidates: IT professionals tracked by the recruiters (name, position, LinkedIn, GitHub, CV)
- CRM Companies: Client and partner companies
- CRM Projects: Open positions/orders (position name, company, phases, HPP/BS type, salary range)
- IMS (Interview Management System): Candidate interviews with scoring and AI assessments
- Meet Visualizer: Meeting records, org charts, and network visualization
- Deal Radar: Commercial pipeline tracking (deals by stage with fee and probability)
- Bodyshop: IT contractor management with monthly revenue/cost/margin tracking
- Bodyshop Portal: Self-service portal for contractors to upload invoices and timesheets

You can help with:
- Explaining how to use the platform
- Recruitment strategy and best practices for IT hiring
- Writing job descriptions, interview questions, or candidate assessments
- Interpreting data and pipeline metrics
- Czech/Slovak labor law basics for IT staffing (HPP vs. freelance/BS)
- General IT recruitment industry knowledge

Be concise, professional, and helpful. Respond in the same language the user writes in (Czech, Slovak, or English).`

export async function POST(req: NextRequest) {
  const auth = await requireAuth(req)
  if (auth.error) return auth.error

  const { messages } = await req.json()
  if (!messages || !Array.isArray(messages)) {
    return NextResponse.json({ error: 'Missing messages' }, { status: 400 })
  }

  // Build conversation-aware prompt
  const history = messages.slice(-10) // last 10 messages for context
  const lastUser = history.filter((m: { role: string }) => m.role === 'user').at(-1)
  if (!lastUser) return NextResponse.json({ error: 'No user message' }, { status: 400 })

  // Format conversation history as context
  const conversationText = history.slice(0, -1).map((m: { role: string; content: string }) =>
    `${m.role === 'user' ? 'User' : 'SplenditBot'}: ${m.content}`
  ).join('\n')

  const prompt = conversationText
    ? `${SYSTEM}\n\nConversation so far:\n${conversationText}\n\nUser: ${lastUser.content}\n\nSplenditBot:`
    : `${SYSTEM}\n\nUser: ${lastUser.content}\n\nSplenditBot:`

  const { text: reply, inputTokens, outputTokens } = await askClaude(prompt, 600)
  const { logAiUsage } = await import('@/lib/ai-usage')
  logAiUsage(inputTokens, outputTokens).catch(() => {})
  return NextResponse.json({ ok: true, reply })
}
