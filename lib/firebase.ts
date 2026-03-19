import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'

const firebaseConfig = {
  apiKey:            process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain:        process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId:         process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket:     process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId:             process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Only initialize if config is present (avoids SSR build errors without .env)
const hasConfig = !!firebaseConfig.apiKey && !!firebaseConfig.projectId

let app: FirebaseApp
let auth: Auth
let db: Firestore

if (hasConfig) {
  app  = getApps().length ? getApps()[0] : initializeApp(firebaseConfig as Record<string, string>)
  auth = getAuth(app)
  db   = getFirestore(app)
} else {
  // Stubs for build-time — will not be called client-side without real config
  app  = {} as FirebaseApp
  auth = {} as Auth
  db   = {} as Firestore
}

export { auth, db }
export default app
