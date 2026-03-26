import {
  collection, addDoc, updateDoc, doc,
  getDocs, query, where, onSnapshot,
} from 'firebase/firestore'
import { db } from './firebase'
import type { AppNotification, NotificationType, ActivityEntityType } from './types'

interface CreateNotificationParams {
  userId:     string
  title:      string
  body:       string
  entityType: ActivityEntityType
  entityId:   string
  type:       NotificationType
  actorUid:   string
}

export async function createNotification(params: CreateNotificationParams): Promise<void> {
  await addDoc(collection(db, 'notifications'), { ...params, read: false, ts: Date.now() })
}

export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(db, 'notifications', id), { read: true })
}

export async function markAllNotificationsRead(userId: string): Promise<void> {
  const snap = await getDocs(
    query(
      collection(db, 'notifications'),
      where('userId', '==', userId),
      where('read',   '==', false),
    ),
  )
  await Promise.all(snap.docs.map(d => updateDoc(d.ref, { read: true })))
}

export function subscribeToNotifications(
  userId:   string,
  callback: (notifications: AppNotification[]) => void,
): () => void {
  const q = query(
    collection(db, 'notifications'),
    where('userId', '==', userId),
  )
  return onSnapshot(q, snap => {
    const sorted = snap.docs
      .map(d => ({ id: d.id, ...d.data() } as AppNotification))
      .sort((a, b) => b.ts - a.ts)
    callback(sorted)
  })
}
