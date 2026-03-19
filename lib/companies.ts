import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, orderBy, query } from 'firebase/firestore'
import { db } from './firebase'
import type { Company } from './types'

// ─── Firestore ────────────────────────────────────────────────────────────────

export async function getCompanies(): Promise<Company[]> {
  const snap = await getDocs(query(collection(db, 'companies'), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Company))
}

export async function createCompany(data: Omit<Company, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, 'companies'), { ...data, createdAt: Date.now() })
  return ref.id
}

export async function updateCompany(id: string, data: Partial<Company>): Promise<void> {
  await updateDoc(doc(db, 'companies', id), data)
}

export async function deleteCompany(id: string): Promise<void> {
  await deleteDoc(doc(db, 'companies', id))
}

// ─── ARES API ─────────────────────────────────────────────────────────────────

export interface AresResult {
  ico: string
  name: string
  legalForm: string
  street: string
  city: string
  zip: string
}

export async function lookupIco(ico: string): Promise<AresResult | null> {
  try {
    const res = await fetch(`https://ares.gov.cz/ekonomicke-subjekty-v-be/rest/ekonomicke-subjekty/${ico.trim()}`)
    if (!res.ok) return null
    const data = await res.json()

    const sidlo = data.sidlo ?? {}
    const street = [sidlo.nazevUlice, sidlo.cisloDomovni, sidlo.cisloOrientacni]
      .filter(Boolean).join(' ')

    return {
      ico:       data.ico ?? ico,
      name:      data.obchodniJmeno ?? '',
      legalForm: data.pravniForma ?? '',
      street,
      city:      sidlo.nazevObce ?? '',
      zip:       sidlo.psc ? String(sidlo.psc) : '',
    }
  } catch {
    return null
  }
}
