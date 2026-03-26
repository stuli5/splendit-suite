import { doc, setDoc, getDocs, collection } from 'firebase/firestore'
import { db } from './firebase'
import type { TeamMember, ActorInfo } from './types'

export async function upsertTeamMember(actor: ActorInfo): Promise<void> {
  await setDoc(
    doc(db, 'users', actor.uid),
    { displayName: actor.displayName, email: actor.email, updatedAt: Date.now() },
    { merge: true },
  )
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  const snap = await getDocs(collection(db, 'users'))
  return snap.docs.map(d => ({ uid: d.id, ...d.data() } as TeamMember))
}
