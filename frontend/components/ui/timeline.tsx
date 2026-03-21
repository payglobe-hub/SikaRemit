import * as React from 'react'
import { ActivityIcon, CheckCircleIcon, AlertCircleIcon, UserIcon, LockIcon, CreditCardIcon } from 'lucide-react'

type TimelineEvent = {
  id: string
  event_type: string
  event_type_display: string
  created_at: string
  metadata?: Record<string, any>
}

const getEventIcon = (eventType: string) => {
  switch(eventType) {
    case 'LOGIN':
      return <ActivityIcon className="h-4 w-4 text-blue-500" />
    case 'LOGOUT':
      return <ActivityIcon className="h-4 w-4 text-gray-500" />
    case 'PROFILE_UPDATE':
      return <UserIcon className="h-4 w-4 text-green-500" />
    case 'PASSWORD_CHANGE':
      return <LockIcon className="h-4 w-4 text-purple-500" />
    case 'TRANSACTION':
      return <CreditCardIcon className="h-4 w-4 text-yellow-500" />
    case 'VERIFICATION':
      return <CheckCircleIcon className="h-4 w-4 text-teal-500" />
    default:
      return <AlertCircleIcon className="h-4 w-4 text-red-500" />
  }
}

export function Timeline({ events }: { events: TimelineEvent[] }) {
  return (
    <div className="space-y-4">
      {events.map((event) => (
        <div key={event.id} className="flex items-start gap-3">
          <div className="mt-1">
            {getEventIcon(event.event_type)}
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">{event.event_type_display}</h3>
              <span className="text-xs text-gray-500">
                {new Date(event.created_at).toLocaleString()}
              </span>
            </div>
            {event.metadata && (
              <div className="mt-1 text-sm text-gray-600">
                {event.event_type === 'PROFILE_UPDATE' && (
                  <p>Changed: {Object.keys(event.metadata.changed_fields || {}).join(', ')}</p>
                )}
                {event.event_type === 'LOGIN' && (
                  <p>From: {event.metadata.user_agent}</p>
                )}
                {event.event_type === 'TRANSACTION' && (
                  <p>Amount: {event.metadata.amount}</p>
                )}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
