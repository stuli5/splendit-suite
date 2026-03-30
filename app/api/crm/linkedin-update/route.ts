import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'
import type { CRMStage } from '@/lib/types'

const VALID_STAGES = new Set<CRMStage>(['new', 'screening', 'interview', 'offer'])

function validateStage(s: unknown): CRMStage | undefined {
  if (typeof s === 'string' && VALID_STAGES.has(s as CRMStage)) return s as CRMStage
  return undefined
}

export async function PATCH(req: NextRequest) {
  const importKey = (process.env.LINKEDIN_IMPORT_KEY ?? '').trim()
  if (!importKey) {
    return NextResponse.json({ error: 'Import key not configured on server.' }, { status: 500 })
  }

  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${importKey}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 })
  }

  const id        = typeof body.id        === 'string' ? body.id.trim()        : ''
  const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
  const lastName  = typeof body.lastName  === 'string' ? body.lastName.trim()  : ''

  if (!id)                    return NextResponse.json({ error: 'id is required.' }, { status: 422 })
  if (!firstName || !lastName) return NextResponse.json({ error: 'firstName and lastName are required.' }, { status: 422 })

  const skills: string[] = Array.isArray(body.skills)
    ? body.skills.filter((s): s is string => typeof s === 'string').slice(0, 30)
    : []

  const stage = validateStage(body.stage)

  const update: Record<string, unknown> = {
    firstName,
    lastName,
    updatedAt: Date.now(),
    ...(typeof body.position === 'string' && body.position && { position: body.position.trim() }),
    ...(typeof body.email    === 'string' && body.email    && { email:    body.email.trim() }),
    ...(typeof body.phone    === 'string' && body.phone    && { phone:    body.phone.trim() }),
    ...(typeof body.linkedIn === 'string' && body.linkedIn && { linkedIn: body.linkedIn.trim() }),
    ...(typeof body.note     === 'string' && body.note     && { note:     body.note.trim() }),
    ...(stage                                              && { stage }),
    ...(skills.length                                      && { skills }),
  }

  try {
    await adminDb.collection('crmCandidates').doc(id).update(update)
    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[linkedin-update] Firestore update failed:', err)
    return NextResponse.json({ error: 'Failed to update candidate.' }, { status: 500 })
  }
}
