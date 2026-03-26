import { logActivity } from './activity-log'
import { createNotification } from './notifications'
import { getTeamMembers } from './team'
import type { ActivityAction, ActivityEntityType, ActorInfo, NotificationType } from './types'

const ACTION_LABELS: Record<ActivityAction, string> = {
  'candidate.created':              'Added candidate',
  'candidate.updated':              'Updated candidate',
  'candidate.stage_changed':        'Changed stage',
  'candidate.deleted':              'Deleted candidate',
  'project.created':                'Created project',
  'project.updated':                'Updated project',
  'project.deleted':                'Deleted project',
  'project_candidate.added':        'Added to project',
  'project_candidate.phase_changed':'Moved in pipeline',
  'project_candidate.removed':      'Removed from project',
}

const ACTION_TYPES: Record<ActivityAction, NotificationType> = {
  'candidate.created':              'success',
  'candidate.updated':              'info',
  'candidate.stage_changed':        'info',
  'candidate.deleted':              'warning',
  'project.created':                'success',
  'project.updated':                'info',
  'project.deleted':                'warning',
  'project_candidate.added':        'success',
  'project_candidate.phase_changed':'info',
  'project_candidate.removed':      'warning',
}

interface NotifyParams {
  action:     ActivityAction
  entityType: ActivityEntityType
  entityId:   string
  entityName: string
  actor:      ActorInfo
  metadata?:  Record<string, string | number | boolean | null>
}

export async function notify(params: NotifyParams): Promise<void> {
  const { action, entityType, entityId, entityName, actor, metadata } = params

  await logActivity({ action, entityType, entityId, entityName, actor, metadata })

  const members    = await getTeamMembers()
  const recipients = members.filter(m => m.uid !== actor.uid)
  if (recipients.length === 0) return

  const title = ACTION_LABELS[action]
  const body  = `${actor.displayName} — ${entityName}`
  const type  = ACTION_TYPES[action]

  await Promise.all(
    recipients.map(m =>
      createNotification({
        userId: m.uid, title, body, entityType, entityId,
        type, actorUid: actor.uid,
      }),
    ),
  )
}
