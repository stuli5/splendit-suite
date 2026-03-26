import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore'
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage'
import { db, storage } from './firebase'
import type { CRMCandidate, ActorInfo } from './types'
import { notify } from './notify'

interface ActivityMeta {
  actor:      ActorInfo
  entityName: string
}

export async function getCRMCandidates(): Promise<CRMCandidate[]> {
  const snap = await getDocs(query(collection(db, 'crmCandidates'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as CRMCandidate))
}

export async function createCRMCandidate(
  data:   Omit<CRMCandidate, 'id' | 'createdAt'>,
  actor?: ActorInfo,
): Promise<string> {
  const docRef = await addDoc(collection(db, 'crmCandidates'), { ...data, createdAt: Date.now() })
  if (actor) {
    const entityName = `${data.firstName} ${data.lastName}`
    notify({ action: 'candidate.created', entityType: 'candidate', entityId: docRef.id, entityName, actor })
      .catch(() => {})
  }
  return docRef.id
}

export async function updateCRMCandidate(
  id:   string,
  data: Partial<CRMCandidate>,
  meta?: ActivityMeta,
): Promise<void> {
  await updateDoc(doc(db, 'crmCandidates', id), data)
  if (meta) {
    const action = 'stage' in data ? 'candidate.stage_changed' : 'candidate.updated'
    notify({ action, entityType: 'candidate', entityId: id, entityName: meta.entityName, actor: meta.actor })
      .catch(() => {})
  }
}

export async function deleteCRMCandidate(id: string, meta?: ActivityMeta): Promise<void> {
  await deleteDoc(doc(db, 'crmCandidates', id))
  if (meta) {
    notify({ action: 'candidate.deleted', entityType: 'candidate', entityId: id, entityName: meta.entityName, actor: meta.actor })
      .catch(() => {})
  }
}

export async function uploadCandidateCV(candidateId: string, file: File): Promise<{ cvUrl: string; cvName: string }> {
  const storageRef = ref(storage, `cvs/${candidateId}/${file.name}`)
  await uploadBytes(storageRef, file)
  const cvUrl = await getDownloadURL(storageRef)
  return { cvUrl, cvName: file.name }
}

export async function deleteCandidateCV(candidateId: string, cvName: string): Promise<void> {
  const storageRef = ref(storage, `cvs/${candidateId}/${cvName}`)
  await deleteObject(storageRef)
}
