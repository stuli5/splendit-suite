import { initializeApp, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

function init() {
  if (getApps().length > 0) return getApps()[0]

  const projectId = process.env.FIREBASE_PROJECT_ID
  if (!projectId) {
    throw new Error(
      'FIREBASE_PROJECT_ID env var is required. ' +
      'Copy .env.example to .env and fill in the values.'
    )
  }

  // GOOGLE_APPLICATION_CREDENTIALS is picked up automatically by the Admin SDK.
  // On Cloud Run / App Hosting the default service account is used instead.
  return initializeApp({ projectId })
}

export const db = getFirestore(init())
