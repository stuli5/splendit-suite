import { NextRequest, NextResponse } from 'next/server'
import { createCRMCandidate } from '@/lib/crm-candidates'
import type { CRMStage } from '@/lib/types'

const VALID_STAGES = new Set<CRMStage>(['new', 'screening', 'interview', 'offer'])

function validateStage(s: unknown): CRMStage {
  if (typeof s === 'string' && VALID_STAGES.has(s as CRMStage)) return s as CRMStage
  return 'new'
}

export async function POST(req: NextRequest) {
  // ── Auth ────────────────────────────────────────────────────────────────
  const importKey = process.env.LINKEDIN_IMPORT_KEY
  if (!importKey) {
    return NextResponse.json({ error: 'Import key not configured on server.' }, { status: 500 })
  }

  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${importKey}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  // ── Parse body ───────────────────────────────────────────────────────────
  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName  = typeof body.lastName  === 'string' ? body.lastName.trim()  : ''
  const position  = typeof body.position  === 'string' ? body.position.trim()  : ''

  if (!firstName || !lastName) {
    return NextResponse.json({ error: 'firstName and lastName are required.' }, { status: 422 })
  }
  if (!position) {
    return NextResponse.json({ error: 'position is required.' }, { status: 422 })
  }

  const skills: string[] = Array.isArray(body.skills)
    ? body.skills.filter((s): s is string => typeof s === 'string').slice(0, 30)
    : []

  const candidate = {
    firstName,
    lastName,
    position,
    stage:    validateStage(body.stage),
    ...(typeof body.email   === 'string' && body.email   && { email:   body.email.trim() }),
    ...(typeof body.phone   === 'string' && body.phone   && { phone:   body.phone.trim() }),
    ...(typeof body.linkedIn === 'string' && body.linkedIn && { linkedIn: body.linkedIn.trim() }),
    ...(typeof body.note    === 'string' && body.note    && { note:    body.note.trim() }),
    ...(skills.length && { skills }),
  }

  // ── Save ─────────────────────────────────────────────────────────────────
  try {
    const id = await createCRMCandidate(candidate)
    return NextResponse.json({ ok: true, id }, { status: 201 })
  } catch (err) {
    console.error('[linkedin-import] createCRMCandidate failed:', err)
    return NextResponse.json({ error: 'Failed to save candidate.' }, { status: 500 })
  }
}
