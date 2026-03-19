import {
  collection, addDoc, updateDoc, deleteDoc,
  doc, getDocs, query, where, orderBy, Timestamp
} from 'firebase/firestore'
import { db } from './firebase'
import type { Contract, Worklog, Currency, ContractStatus } from './types'

// ─── Contracts ───────────────────────────────────────────────────────────────

export async function getContracts(): Promise<Contract[]> {
  const snap = await getDocs(query(collection(db, 'contracts'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Contract))
}

export async function createContract(data: Omit<Contract, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'contracts'), {
    ...data,
    createdAt: Date.now(),
  })
  return ref.id
}

export async function updateContract(id: string, data: Partial<Contract>): Promise<void> {
  await updateDoc(doc(db, 'contracts', id), data)
}

export async function deleteContract(id: string): Promise<void> {
  await deleteDoc(doc(db, 'contracts', id))
}

// ─── Worklogs ─────────────────────────────────────────────────────────────────

export async function getWorklogs(contractId: string): Promise<Worklog[]> {
  const snap = await getDocs(
    query(collection(db, 'worklogs'), where('contractId', '==', contractId))
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as Worklog))
    .sort((a, b) => b.month.localeCompare(a.month))
}

export async function getAllWorklogs(): Promise<Worklog[]> {
  const snap = await getDocs(query(collection(db, 'worklogs'), orderBy('month', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Worklog))
}

export async function upsertWorklog(
  contractId: string,
  month: string,
  daysWorked: number,
  mdRateClient: number,
  mdRateContractor: number,
  existingId?: string
): Promise<void> {
  const revenue = daysWorked * mdRateClient
  const cost    = daysWorked * mdRateContractor
  const profit  = revenue - cost

  const data = { contractId, month, daysWorked, revenue, cost, profit, createdAt: Date.now() }

  if (existingId) {
    await updateDoc(doc(db, 'worklogs', existingId), data)
  } else {
    await addDoc(collection(db, 'worklogs'), data)
  }
}

export async function deleteWorklog(id: string): Promise<void> {
  await deleteDoc(doc(db, 'worklogs', id))
}

export async function clearAllWorklogs(): Promise<void> {
  const snap = await getDocs(collection(db, 'worklogs'))
  await Promise.all(snap.docs.map(d => deleteDoc(d.ref)))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function marginPercent(mdRateClient: number, mdRateContractor: number): number {
  if (mdRateClient === 0) return 0
  return Math.round(((mdRateClient - mdRateContractor) / mdRateClient) * 100)
}

export function formatCurrency(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}

export function monthLabel(month: string): string {
  const [y, m] = month.split('-')
  return new Date(Number(y), Number(m) - 1).toLocaleString('cs-CZ', { month: 'long', year: 'numeric' })
}
