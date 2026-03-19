import { db } from './firebase'
import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, query, orderBy, onSnapshot,
  type Unsubscribe,
} from 'firebase/firestore'
import type { Meet, Person, Tribe, ActionItem } from './types'

const MEETS  = 'meets'
const PEOPLE = 'people'
const TRIBES = 'tribes'

// ─── Action item serialization ────────────────────────────────────────────────

export function parseActions(raw: string): ActionItem[] {
  return (raw || '').split('\n')
    .filter(l => l.trim())
    .map(l => {
      const done  = /^\s*-\s*\[x\]/i.test(l)
      const rest  = l.replace(/^\s*-\s*\[.\]\s*/i, '')
      const parts = rest.split('|').map(s => s.trim())
      return { done, task: parts[0] || '', assignee: parts[1] || '', deadline: parts[2] || '' }
    })
}

export function serializeActions(acts: ActionItem[]): string {
  return acts.map(a => `- [${a.done ? 'x' : ' '}] ${a.task}|${a.assignee}|${a.deadline}`).join('\n')
}

// ─── Meets ────────────────────────────────────────────────────────────────────

export function subscribeMeets(cb: (meets: Meet[]) => void): Unsubscribe {
  const q = query(collection(db, MEETS), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Meet)))
  })
}

export async function getMeets(): Promise<Meet[]> {
  const snap = await getDocs(query(collection(db, MEETS), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Meet))
}

export async function createMeet(data: Omit<Meet, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, MEETS), { ...data, createdAt: Date.now() })
  return ref.id
}

export async function updateMeet(id: string, data: Partial<Omit<Meet, 'id'>>): Promise<void> {
  await updateDoc(doc(db, MEETS, id), data as Record<string, unknown>)
}

export async function deleteMeet(id: string): Promise<void> {
  await deleteDoc(doc(db, MEETS, id))
}

// ─── People ───────────────────────────────────────────────────────────────────

export function subscribePeople(cb: (people: Person[]) => void): Unsubscribe {
  const q = query(collection(db, PEOPLE), orderBy('createdAt', 'desc'))
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Person)))
  })
}

export async function getPeople(): Promise<Person[]> {
  const snap = await getDocs(query(collection(db, PEOPLE), orderBy('createdAt', 'desc')))
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Person))
}

export async function createPerson(data: Omit<Person, 'id' | 'createdAt'>): Promise<string> {
  const ref = await addDoc(collection(db, PEOPLE), { ...data, createdAt: Date.now() })
  return ref.id
}

export async function updatePerson(id: string, data: Partial<Omit<Person, 'id'>>): Promise<void> {
  await updateDoc(doc(db, PEOPLE, id), data as Record<string, unknown>)
}

export async function deletePerson(id: string): Promise<void> {
  await deleteDoc(doc(db, PEOPLE, id))
}

// ─── Tribes ───────────────────────────────────────────────────────────────────

export function subscribeTribes(cb: (tribes: Tribe[]) => void): Unsubscribe {
  const q = query(collection(db, TRIBES), orderBy('createdAt', 'asc'))
  return onSnapshot(q, snap => {
    cb(snap.docs.map(d => ({ id: d.id, ...d.data() } as Tribe)))
  })
}

export async function createTribe(name: string, color: string): Promise<string> {
  const ref = await addDoc(collection(db, TRIBES), { name, color, createdAt: Date.now() })
  return ref.id
}

export async function deleteTribe(id: string): Promise<void> {
  await deleteDoc(doc(db, TRIBES, id))
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function initials(name: string): string {
  return (name || '?').split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
}

export function shortName(name: string): string {
  const parts = (name || '').split(' ')
  return parts.length > 1 ? parts[0] + ' ' + parts[parts.length - 1][0] + '.' : parts[0]
}
