import {
  collection, addDoc, getDocs,
  query, where, orderBy, limit,
} from 'firebase/firestore'
import { db } from './firebase'
import type {
  ActivityLogEntry, ActivityAction,
  ActivityEntityType, ActorInfo,
} from './types'

interface LogActivityParams {
  action:     ActivityAction
  entityType: ActivityEntityType
  entityId:   string
  entityName: string
  actor:      ActorInfo
  metadata?:  Record<string, string | number | boolean | null>
}

export async function logActivity(params: LogActivityParams): Promise<void> {
  await addDoc(collection(db, 'activityLog'), { ...params, ts: Date.now() })
}

export async function getEntityActivity(
  entityType: ActivityEntityType,
  entityId:   string,
): Promise<ActivityLogEntry[]> {
  const snap = await getDocs(
    query(
      collection(db, 'activityLog'),
      where('entityType', '==', entityType),
      where('entityId',   '==', entityId),
    ),
  )
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() } as ActivityLogEntry))
    .sort((a, b) => b.ts - a.ts)
    .slice(0, 50)
}

export async function getRecentActivity(count = 20): Promise<ActivityLogEntry[]> {
  const snap = await getDocs(
    query(collection(db, 'activityLog'), orderBy('ts', 'desc'), limit(count)),
  )
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as ActivityLogEntry))
}
