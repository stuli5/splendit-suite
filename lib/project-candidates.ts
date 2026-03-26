import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, where, arrayUnion } from 'firebase/firestore'
import { db } from './firebase'
import type { ProjectCandidate, ProjectPhase, ActorInfo } from './types'
import { notify } from './notify'

interface ActivityMeta {
  actor:      ActorInfo
  entityName: string
}

export async function getProjectCandidates(projectId: string): Promise<ProjectCandidate[]> {
  const snap = await getDocs(query(collection(db, 'projectCandidates'), where('projectId', '==', projectId)))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ProjectCandidate))
}

export async function getCandidateProjectHistory(candidateId: string): Promise<ProjectCandidate[]> {
  const snap = await getDocs(query(collection(db, 'projectCandidates'), where('candidateId', '==', candidateId)))
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ProjectCandidate))
    .sort((a, b) => a.addedAt - b.addedAt)
}

export async function addCandidateToProject(
  data:   Omit<ProjectCandidate, 'id' | 'addedAt'>,
  actor?: ActorInfo,
): Promise<string> {
  const docRef = await addDoc(collection(db, 'projectCandidates'), {
    ...data,
    addedAt:      Date.now(),
    phaseHistory: [{ phase: data.phase, ts: Date.now() }],
  })
  if (actor) {
    const entityName = `${data.candidateFirstName} ${data.candidateLastName}`
    notify({ action: 'project_candidate.added', entityType: 'project_candidate', entityId: docRef.id, entityName, actor })
      .catch(() => {})
  }
  return docRef.id
}

export async function updateCandidatePhase(
  id:    string,
  phase: ProjectPhase,
  meta?: ActivityMeta,
): Promise<void> {
  await updateDoc(doc(db, 'projectCandidates', id), {
    phase,
    phaseHistory: arrayUnion({ phase, ts: Date.now() }),
  })
  if (meta) {
    notify({
      action: 'project_candidate.phase_changed',
      entityType: 'project_candidate', entityId: id,
      entityName: meta.entityName, actor: meta.actor,
      metadata: { phase },
    }).catch(() => {})
  }
}

export async function updateProjectCandidate(id: string, data: Partial<ProjectCandidate>): Promise<void> {
  await updateDoc(doc(db, 'projectCandidates', id), data)
}

export async function removeCandidateFromProject(id: string, meta?: ActivityMeta): Promise<void> {
  await deleteDoc(doc(db, 'projectCandidates', id))
  if (meta) {
    notify({ action: 'project_candidate.removed', entityType: 'project_candidate', entityId: id, entityName: meta.entityName, actor: meta.actor })
      .catch(() => {})
  }
}
