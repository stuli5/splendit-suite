import Anthropic from '@anthropic-ai/sdk'

export const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export interface AiResult {
  text:         string
  inputTokens:  number
  outputTokens: number
}

export async function askClaude(prompt: string, maxTokens = 1024): Promise<AiResult> {
  const msg = await anthropic.messages.create({
    model:      'claude-haiku-4-5-20251001',
    max_tokens: maxTokens,
    messages:   [{ role: 'user', content: prompt }],
  })
  return {
    text:         msg.content[0].type === 'text' ? msg.content[0].text : '',
    inputTokens:  msg.usage.input_tokens,
    outputTokens: msg.usage.output_tokens,
  }
}

export function extractJson<T>(text: string): T | null {
  const match = text.match(/\{[\s\S]*\}|\[[\s\S]*\]/)
  if (!match) return null
  try { return JSON.parse(match[0]) as T } catch { return null }
}
