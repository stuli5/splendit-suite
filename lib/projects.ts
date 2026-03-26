import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, getDoc, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import type { Project, ActorInfo } from './types'
import { notify } from './notify'

interface ActivityMeta {
  actor:      ActorInfo
  entityName: string
}

export async function getProject(id: string): Promise<Project | null> {
  const snap = await getDoc(doc(db, 'projects', id))
  if (!snap.exists()) return null
  return { id: snap.id, ...snap.data() } as Project
}

export async function getProjects(): Promise<Project[]> {
  const snap = await getDocs(query(collection(db, 'projects'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Project))
}

export async function createProject(
  data:   Omit<Project, 'id' | 'createdAt'>,
  actor?: ActorInfo,
): Promise<string> {
  const docRef = await addDoc(collection(db, 'projects'), { ...data, createdAt: Date.now() })
  if (actor) {
    notify({ action: 'project.created', entityType: 'project', entityId: docRef.id, entityName: data.positionName, actor })
      .catch(() => {})
  }
  return docRef.id
}

export async function updateProject(
  id:    string,
  data:  Partial<Project>,
  meta?: ActivityMeta,
): Promise<void> {
  await updateDoc(doc(db, 'projects', id), data)
  if (meta) {
    notify({ action: 'project.updated', entityType: 'project', entityId: id, entityName: meta.entityName, actor: meta.actor })
      .catch(() => {})
  }
}

export async function deleteProject(id: string, meta?: ActivityMeta): Promise<void> {
  await deleteDoc(doc(db, 'projects', id))
  if (meta) {
    notify({ action: 'project.deleted', entityType: 'project', entityId: id, entityName: meta.entityName, actor: meta.actor })
      .catch(() => {})
  }
}
