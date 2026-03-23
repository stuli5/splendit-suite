import {
  collection, doc, addDoc, getDocs, setDoc, deleteDoc,
  query, where, orderBy, Timestamp,
} from 'firebase/firestore'
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage'
import { db, storage } from './firebase'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface PortalCandidate {
  id: string
  email: string
  name: string
  active: boolean
  createdAt: Timestamp
}

export type SubmissionType   = 'invoice' | 'timesheet'
export type SubmissionStatus = 'pending' | 'paid' | 'rejected'

export interface PortalSubmission {
  id: string
  candidateId: string
  candidateEmail: string
  candidateName: string
  type: SubmissionType
  fileName: string
  fileUrl: string
  fileSize: number
  month: string          // YYYY-MM
  amount?: number
  note?: string
  status: SubmissionStatus
  uploadedAt: Timestamp
}

// ─── Allowlist ────────────────────────────────────────────────────────────────

export async function checkPortalAllowlist(email: string): Promise<PortalCandidate | null> {
  const q = query(
    collection(db, 'portalCandidates'),
    where('email', '==', email.toLowerCase()),
    where('active', '==', true),
  )
  const snap = await getDocs(q)
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as PortalCandidate
}

export async function getPortalCandidates(): Promise<PortalCandidate[]> {
  const snap = await getDocs(
    query(collection(db, 'portalCandidates'), orderBy('createdAt', 'desc')),
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PortalCandidate))
}

export async function addPortalCandidate(email: string, name: string): Promise<string> {
  const ref = await addDoc(collection(db, 'portalCandidates'), {
    email: email.toLowerCase(),
    name,
    active: true,
    createdAt: Timestamp.now(),
  })
  return ref.id
}

export async function deactivatePortalCandidate(id: string): Promise<void> {
  await setDoc(doc(db, 'portalCandidates', id), { active: false }, { merge: true })
}

export async function deletePortalCandidate(id: string): Promise<void> {
  await deleteDoc(doc(db, 'portalCandidates', id))
}

// ─── Audit log ────────────────────────────────────────────────────────────────

export async function logPortalAccess(
  userId: string,
  email: string,
  action: 'login' | 'upload',
  meta?: Record<string, string>,
): Promise<void> {
  await addDoc(collection(db, 'portalAuditLog'), {
    userId,
    email,
    action,
    timestamp: Timestamp.now(),
    ...(meta && { meta }),
  })
}

// ─── Submissions ──────────────────────────────────────────────────────────────

export async function uploadPortalFile(
  userId: string,
  file: File,
  onProgress?: (pct: number) => void,
): Promise<string> {
  const path = `portal/${userId}/${Date.now()}_${file.name}`
  const storageRef = ref(storage, path)
  return new Promise((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file)
    task.on(
      'state_changed',
      snap => onProgress && onProgress(Math.round(snap.bytesTransferred / snap.totalBytes * 100)),
      reject,
      async () => resolve(await getDownloadURL(task.snapshot.ref)),
    )
  })
}

export async function createPortalSubmission(
  data: Omit<PortalSubmission, 'id' | 'uploadedAt' | 'status'>,
): Promise<string> {
  const docRef = await addDoc(collection(db, 'portalSubmissions'), {
    ...data,
    status: 'pending',
    uploadedAt: Timestamp.now(),
  })
  return docRef.id
}

export async function getCandidateSubmissions(candidateId: string): Promise<PortalSubmission[]> {
  const q = query(
    collection(db, 'portalSubmissions'),
    where('candidateId', '==', candidateId),
    orderBy('uploadedAt', 'desc'),
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PortalSubmission))
}

export async function getAllPortalSubmissions(): Promise<PortalSubmission[]> {
  const q = query(collection(db, 'portalSubmissions'), orderBy('uploadedAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as PortalSubmission))
}

export async function updateSubmissionStatus(id: string, status: SubmissionStatus): Promise<void> {
  await setDoc(doc(db, 'portalSubmissions', id), { status }, { merge: true })
}
