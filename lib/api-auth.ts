import { NextRequest, NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase-admin'

type AuthResult =
  | { uid: string; error?: never }
  | { uid?: never; error: NextResponse }

/**
 * Verifies the Firebase ID token from the Authorization header.
 * Returns { uid } on success or { error: NextResponse } on failure.
 *
 * Usage in a route handler:
 *   const auth = await requireAuth(req)
 *   if (auth.error) return auth.error
 */
export async function requireAuth(req: NextRequest): Promise<AuthResult> {
  const token = req.headers.get('authorization')?.replace('Bearer ', '').trim()
  if (!token) {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token)
    return { uid: decoded.uid }
  } catch {
    return { error: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }
}
