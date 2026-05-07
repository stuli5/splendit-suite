import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, orderBy, query, where,
} from 'firebase/firestore'
import { db } from './firebase'
import type { Job, JobApplication } from './types'

// ── Slug ──────────────────────────────────────────────────────────────────────

export function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
  return `${base}-${Date.now().toString(36)}`
}

// ── Jobs CRUD ─────────────────────────────────────────────────────────────────

export async function getJobs(): Promise<Job[]> {
  const snap = await getDocs(query(collection(db, 'jobs'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Job))
}

export async function getPublishedJobs(): Promise<Job[]> {
  const all = await getJobs()
  return all.filter(j => j.status === 'published')
}

export async function getJobBySlug(slug: string): Promise<Job | null> {
  const snap = await getDocs(query(collection(db, 'jobs'), where('slug', '==', slug)))
  if (snap.empty) return null
  const d = snap.docs[0]
  return { id: d.id, ...d.data() } as Job
}

export async function createJob(data: Omit<Job, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'jobs'), { ...data, createdAt: Date.now() })
  return ref.id
}

export async function updateJob(id: string, data: Partial<Job>): Promise<void> {
  await updateDoc(doc(db, 'jobs', id), { ...data, updatedAt: Date.now() })
}

export async function deleteJob(id: string): Promise<void> {
  await deleteDoc(doc(db, 'jobs', id))
}

export async function publishJob(id: string): Promise<void> {
  await updateDoc(doc(db, 'jobs', id), {
    status: 'published',
    publishedAt: Date.now(),
    updatedAt: Date.now(),
  })
}

export async function unpublishJob(id: string): Promise<void> {
  await updateDoc(doc(db, 'jobs', id), {
    status: 'draft',
    updatedAt: Date.now(),
  })
}

// ── Applications ──────────────────────────────────────────────────────────────

export async function submitApplication(
  data: Omit<JobApplication, 'id' | 'createdAt'>,
): Promise<string> {
  const ref = await addDoc(collection(db, 'job_applications'), {
    ...data,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function getApplicationsForJob(jobId: string): Promise<JobApplication[]> {
  const snap = await getDocs(
    query(
      collection(db, 'job_applications'),
      where('jobId', '==', jobId),
      orderBy('createdAt', 'desc'),
    ),
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as JobApplication))
}

// ── Formatters ────────────────────────────────────────────────────────────────

export function formatSalary(job: Job): string {
  if (!job.salaryMin && !job.salaryMax) return ''
  const fmt = (n: number) =>
    new Intl.NumberFormat('cs-CZ', { maximumFractionDigits: 0 }).format(n)
  if (job.salaryMin && job.salaryMax)
    return `${fmt(job.salaryMin)} – ${fmt(job.salaryMax)} ${job.currency}`
  if (job.salaryMin) return `from ${fmt(job.salaryMin)} ${job.currency}`
  return `up to ${fmt(job.salaryMax!)} ${job.currency}`
}

export const JOB_TYPE_LABELS: Record<string, string> = {
  'full-time':  'Full-time',
  'part-time':  'Part-time',
  'contract':   'Contract',
  'freelance':  'Freelance',
}

export const WORK_MODE_LABELS: Record<string, string> = {
  remote:  'Remote',
  hybrid:  'Hybrid',
  onsite:  'On-site',
}

export const WORK_MODE_COLORS: Record<string, string> = {
  remote:  '#00a87a',
  hybrid:  '#0091c7',
  onsite:  '#6b46a8',
}
