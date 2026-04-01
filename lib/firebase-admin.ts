import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'

function getAdminApp() {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID

  // On App Hosting / Cloud Run the default service account has Firestore access
  // so we can initialize without explicit credentials.
  return initializeApp({ projectId })
}

export const adminDb   = getFirestore(getAdminApp())
export const adminAuth = getAuth(getAdminApp())
