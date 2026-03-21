import * as React from 'react'
import { cn } from '@/lib/utils'
import { type Notification } from '@/lib/api/notifications'

type NotificationItemProps = {
  notification: Notification
  onClick?: (id: string) => void
}

export function NotificationItem({ notification, onClick }: NotificationItemProps) {
  const handleClick = () => {
    if (onClick && !notification.is_read) {
      onClick(notification.id.toString())
    }
  }

  return (
    <div 
      className={cn(
        'p-4 hover:bg-accent/50 transition-colors cursor-pointer border-l-2',
        !notification.is_read 
          ? 'bg-accent/30 border-l-blue-500' 
          : 'border-l-transparent'
      )}
      onClick={handleClick}
    >
      <div className="flex justify-between items-start gap-2">
        <div className="flex-1 min-w-0">
          <h3 className={cn(
            "font-medium text-sm leading-tight truncate",
            !notification.is_read ? "text-foreground" : "text-muted-foreground"
          )}>
            {notification.title}
          </h3>
          <p className="text-xs text-muted-foreground mt-1 overflow-hidden text-ellipsis">
            {notification.message.length > 80 
              ? `${notification.message.substring(0, 80)}...` 
              : notification.message}
          </p>
        </div>
        <span className="text-xs text-muted-foreground flex-shrink-0">
          {new Date(notification.created_at).toLocaleTimeString([], { 
            hour: '2-digit', 
            minute: '2-digit' 
          })}
        </span>
      </div>
      {!notification.is_read && (
        <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
      )}
    </div>
  )
}
