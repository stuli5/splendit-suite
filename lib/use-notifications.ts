'use client'

import { useEffect, useState } from 'react'
import { subscribeToNotifications, markNotificationRead, markAllNotificationsRead } from './notifications'
import type { AppNotification } from './types'

export function useNotifications(userId: string | undefined) {
  const [notifications, setNotifications] = useState<AppNotification[]>([])

  useEffect(() => {
    if (!userId) return
    return subscribeToNotifications(userId, setNotifications)
  }, [userId])

  const unreadCount = notifications.filter(n => !n.read).length

  return {
    notifications,
    unreadCount,
    markRead:    (id: string)  => markNotificationRead(id),
    markAllRead: ()            => userId ? markAllNotificationsRead(userId) : Promise.resolve(),
  }
}
