import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where } from 'firebase/firestore'
import { db } from './firebase'
import type { ProjectCandidate, ProjectPhase } from './types'

export async function getProjectCandidates(projectId: string): Promise<ProjectCandidate[]> {
  const snap = await getDocs(query(collection(db, 'projectCandidates'), where('projectId', '==', projectId)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectCandidate))
}

export async function addCandidateToProject(data: Omit<ProjectCandidate, 'id' | 'addedAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'projectCandidates'), { ...data, addedAt: Date.now() })
  return ref.id
}

export async function updateCandidatePhase(id: string, phase: ProjectPhase): Promise<void> {
  await updateDoc(doc(db, 'projectCandidates', id), { phase })
}

export async function removeCandidateFromProject(id: string): Promise<void> {
  await deleteDoc(doc(db, 'projectCandidates', id))
}
