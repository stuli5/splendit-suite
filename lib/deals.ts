import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import type { Deal } from './types'

export async function getDeals(): Promise<Deal[]> {
  const snap = await getDocs(query(collection(db, 'deals'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Deal))
}

export async function createDeal(data: Omit<Deal, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'deals'), { ...data, createdAt: Date.now() })
  return ref.id
}

export async function updateDeal(id: string, data: Partial<Deal>): Promise<void> {
  await updateDoc(doc(db, 'deals', id), data)
}

export async function deleteDeal(id: string): Promise<void> {
  await deleteDoc(doc(db, 'deals', id))
}

/** Compute estimated fee value in currency units */
export function estimatedFee(deal: Deal): number {
  if (deal.feeType === 'fixed') return deal.feeValue
  const salary = deal.salaryCzk ?? 0
  return Math.round(salary * (deal.feeValue / 100))
}

/** Weighted fee = fee × probability */
export function weightedFee(deal: Deal): number {
  return Math.round(estimatedFee(deal) * (deal.probability / 100))
}

export function formatFee(amount: number, currency: string): string {
  return new Intl.NumberFormat('cs-CZ', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount)
}
