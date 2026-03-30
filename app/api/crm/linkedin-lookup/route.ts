import { NextRequest, NextResponse } from 'next/server'
import { adminDb } from '@/lib/firebase-admin'

export async function GET(req: NextRequest) {
  const importKey = (process.env.LINKEDIN_IMPORT_KEY ?? '').trim()
  if (!importKey) {
    return NextResponse.json({ error: 'Import key not configured on server.' }, { status: 500 })
  }

  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${importKey}`) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 })
  }

  const url = req.nextUrl.searchParams.get('url')
  if (!url) {
    return NextResponse.json({ error: 'url query param is required.' }, { status: 400 })
  }

  try {
    const snap = await adminDb
      .collection('crmCandidates')
      .where('linkedIn', '==', url)
      .limit(1)
      .get()

    if (snap.empty) {
      return NextResponse.json({ found: false })
    }

    const docSnap = snap.docs[0]
    return NextResponse.json({ found: true, id: docSnap.id, candidate: docSnap.data() })
  } catch (err) {
    console.error('[linkedin-lookup] Firestore query failed:', err)
    return NextResponse.json({ error: 'Failed to look up candidate.' }, { status: 500 })
  }
}
