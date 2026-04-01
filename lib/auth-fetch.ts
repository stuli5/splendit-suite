'use client'

import { getAuth } from 'firebase/auth'

/**
 * Drop-in replacement for fetch() that automatically attaches
 * the current user's Firebase ID token as a Bearer token.
 *
 * Usage:
 *   const res = await authFetch('/api/ai/bot-chat', { method: 'POST', ... })
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const currentUser = getAuth().currentUser
  const token = currentUser ? await currentUser.getIdToken() : null

  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  })
}
