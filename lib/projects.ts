import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import type { Project } from './types'

export async function getProject(id: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, 'projects', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Project
}

export async function getProjects(): Promise<Project[]> {
  const snap = await getDocs(query(collection(db, 'projects'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
}

export async function createProject(data: Omit<Project, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'projects'), { ...data, createdAt: Date.now() })
  return ref.id
}

export async function updateProject(id: string, data: Partial<Project>): Promise<void> {
  await updateDoc(doc(db, 'projects', id), data)
}

export async function deleteProject(id: string): Promise<void> {
  await deleteDoc(doc(db, 'projects', id))
}
