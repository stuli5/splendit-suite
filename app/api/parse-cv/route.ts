import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const EXTRACT_PROMPT = `Extract candidate information from this CV/resume. Return ONLY a valid JSON object with these fields (use null for missing fields):

{
  "firstName": string | null,
  "lastName": string | null,
  "position": string | null,
  "email": string | null,
  "phone": string | null,
  "linkedIn": string | null,
  "gitHub": string | null,
  "skills": string[] | null
}

For "skills", extract a concise list of up to 20 technical and professional skills (programming languages, frameworks, tools, methodologies, soft skills). Each skill should be a short label (1-3 words).`

export async function POST(req: NextRequest) {
  const formData = await req.formData().catch(() => null)
  if (!formData) return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  const allowedTypes = [
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/msword',
  ]
  if (!allowedTypes.includes(file.type) && !file.name.match(/\.(pdf|docx|doc)$/i)) {
    return NextResponse.json({ error: 'Only PDF and Word documents are supported' }, { status: 400 })
  }

  if (file.size > 10 * 1024 * 1024) {
    return NextResponse.json({ error: 'File too large (max 10 MB)' }, { status: 400 })
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer())
    const isPdf  = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let message: Anthropic.Message

    if (isPdf) {
      // Send PDF directly to Claude — no local parsing needed
      const base64 = buffer.toString('base64')
      message = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role:    'user',
          content: [
            { type: 'document', source: { type: 'base64', media_type: 'application/pdf', data: base64 } } as Anthropic.DocumentBlockParam,
            { type: 'text', text: EXTRACT_PROMPT },
          ],
        }],
      })
    } else {
      // Extract text from docx first, then send as plain text
      const mammoth = await import('mammoth')
      const { value: cvText } = await mammoth.extractRawText({ buffer })

      if (!cvText.trim()) {
        return NextResponse.json({ error: 'Could not extract text from the file' }, { status: 422 })
      }

      message = await anthropic.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 1024,
        messages: [{
          role:    'user',
          content: `${EXTRACT_PROMPT}\n\nCV text:\n${cvText.slice(0, 6000)}`,
        }],
      })
    }

    const raw  = message.content[0].type === 'text' ? message.content[0].text : ''
    const json = raw.match(/\{[\s\S]*\}/)
    if (!json) return NextResponse.json({ error: 'Could not parse CV data' }, { status: 422 })

    const data = JSON.parse(json[0])
    const { logAiUsage } = await import('@/lib/ai-usage')
    logAiUsage(message.usage.input_tokens, message.usage.output_tokens).catch(() => {})
    return NextResponse.json({ ok: true, data })

  } catch (err) {
    console.error('[parse-cv]', err)
    return NextResponse.json({ error: 'Failed to parse CV' }, { status: 500 })
  }
}
