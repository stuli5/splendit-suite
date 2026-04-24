import type {
  CollectionReference,
  Query,
  DocumentData,
} from 'firebase-admin/firestore'
import { db } from '../firebase.js'

export type WithId<T> = T & { id: string }

/** Fetch up to `limit` docs from a collection ref or query, attaching doc id. */
export async function listDocs<T extends DocumentData>(
  ref: CollectionReference<DocumentData> | Query<DocumentData>,
  limit = 50,
): Promise<WithId<T>[]> {
  const snap = await ref.limit(limit).get()
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as WithId<T>))
}

/** Fetch a single document by id. Returns null if not found. */
export async function getDocById<T extends DocumentData>(
  collectionName: string,
  id: string,
): Promise<WithId<T> | null> {
  const snap = await db.collection(collectionName).doc(id).get()
  if (!snap.exists) return null
  return { id: snap.id, ...snap.data() } as WithId<T>
}

/** Serialise a result to MCP text content. */
export function toText(data: unknown): { content: [{ type: 'text'; text: string }] } {
  return { content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }] }
}

/** Serialise an error to MCP text content with isError flag. */
export function toError(message: string): {
  content: [{ type: 'text'; text: string }]
  isError: true
} {
  return {
    content: [{ type: 'text' as const, text: message }],
    isError: true,
  }
}
