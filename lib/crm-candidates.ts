import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import type { CRMCandidate } from './types'

export async function getCRMCandidates(): Promise<CRMCandidate[]> {
  const snap = await getDocs(query(collection(db, 'crmCandidates'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CRMCandidate))
}

export async function createCRMCandidate(data: Omit<CRMCandidate, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'crmCandidates'), { ...data, createdAt: Date.now() })
  return ref.id
}

export async function updateCRMCandidate(id: string, data: Partial<CRMCandidate>): Promise<void> {
  await updateDoc(doc(db, 'crmCandidates', id), data)
}

export async function deleteCRMCandidate(id: string): Promise<void> {
  await deleteDoc(doc(db, 'crmCandidates', id))
}
