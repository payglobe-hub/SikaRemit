// Modern Admin Card Components - Enterprise Dashboard Cards
import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { adminStyles, cn } from '@/lib/design-system/admin-components'
import {
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Clock,
  CheckCircle,
  AlertCircle,
  XCircle,
  MoreHorizontal
} from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  change?: {
    value: number
    label: string
    trend: 'up' | 'down' | 'neutral'
  }
  icon?: React.ReactNode
  description?: string
  variant?: 'base' | 'elevated' | 'flat' | 'glass'
  size?: 'sm' | 'md' | 'lg'
  className?: string
  onClick?: () => void
}

export function StatCard({
  title,
  value,
  change,
  icon,
  description,
  variant = 'base',
  size = 'md',
  className,
  onClick
}: StatCardProps) {
  const sizeClasses = {
    sm: 'p-4',
    md: 'p-6',
    lg: 'p-8'
  }

  const titleSizeClasses = {
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg'
  }

  const valueSizeClasses = {
    sm: 'text-xl',
    md: 'text-2xl',
    lg: 'text-3xl'
  }

  return (
    <Card
      className={cn(
        adminStyles.card[variant],
        sizeClasses[size],
        onClick && 'cursor-pointer hover:scale-[1.02] transition-transform duration-200',
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className={cn(
            'font-semibold text-gray-900 dark:text-white',
            titleSizeClasses[size]
          )}>
            {title}
          </CardTitle>
          {icon && (
            <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
              {icon}
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div className={cn(
            'font-bold text-gray-900 dark:text-white',
            valueSizeClasses[size]
          )}>
            {typeof value === 'number' ? value.toLocaleString() : value}
          </div>

          {change && (
            <div className="flex items-center gap-1">
              {change.trend === 'up' && (
                <ArrowUpRight className="h-4 w-4 text-emerald-500" />
              )}
              {change.trend === 'down' && (
                <ArrowDownRight className="h-4 w-4 text-red-500" />
              )}
              <span className={cn(
                'text-sm font-medium',
                change.trend === 'up' && 'text-emerald-600 dark:text-emerald-400',
                change.trend === 'down' && 'text-red-600 dark:text-red-400',
                change.trend === 'neutral' && 'text-gray-600 dark:text-gray-400'
              )}>
                {change.trend === 'up' ? '+' : ''}{change.value}% {change.label}
              </span>
            </div>
          )}

          {description && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {description}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

interface MetricCardProps {
  title: string
  metrics: Array<{
    label: string
    value: string | number
    change?: number
    status?: 'success' | 'warning' | 'error' | 'info'
  }>
  icon?: React.ReactNode
  variant?: 'base' | 'elevated' | 'flat' | 'glass'
  className?: string
}

export function MetricCard({
  title,
  metrics,
  icon,
  variant = 'base',
  className
}: MetricCardProps) {
  return (
    <Card className={cn(adminStyles.card[variant], className)}>
      <CardHeader>
        <CardTitle className="flex items-center gap-3 text-lg font-semibold text-gray-900 dark:text-white">
          {icon}
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index} className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <span className="text-gray-600 dark:text-gray-400 text-sm">
                  {metric.label}
                </span>
                {metric.status && (
                  <Badge variant={
                    metric.status === 'success' ? 'default' :
                    metric.status === 'warning' ? 'secondary' :
                    metric.status === 'error' ? 'destructive' :
                    metric.status === 'info' ? 'outline' : 'default'
                  }>
                    {metric.status}
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold text-gray-900 dark:text-white">
                  {typeof metric.value === 'number' ? metric.value.toLocaleString() : metric.value}
                </span>
                {metric.change !== undefined && (
                  <span className={cn(
                    'text-sm font-medium flex items-center gap-1',
                    metric.change >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  )}>
                    {metric.change >= 0 ? (
                      <TrendingUp className="h-3 w-3" />
                    ) : (
                      <TrendingDown className="h-3 w-3" />
                    )}
                    {Math.abs(metric.change)}%
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

interface ActivityCardProps {
  title: string
  activities: Array<{
    id: string
    title: string
    description: string
    timestamp: string
    status?: 'success' | 'warning' | 'error' | 'info'
    user?: string
  }>
  variant?: 'base' | 'elevated' | 'flat' | 'glass'
  className?: string
  maxItems?: number
  showHeader?: boolean
}

export function ActivityCard({
  title,
  activities,
  variant = 'base',
  className,
  maxItems = 5,
  showHeader = true
}: ActivityCardProps) {
  const getStatusIcon = (status?: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-emerald-500" />
      case 'warning':
        return <AlertCircle className="h-4 w-4 text-orange-500" />
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />
      default:
        return <Activity className="h-4 w-4 text-blue-500" />
    }
  }

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60))

    if (diffInHours < 1) return 'Just now'
    if (diffInHours < 24) return `${diffInHours}h ago`
    if (diffInHours < 168) return `${Math.floor(diffInHours / 24)}d ago`
    return date.toLocaleDateString()
  }

  return (
    <Card className={cn(adminStyles.card[variant], className)}>
      {showHeader && (
        <CardHeader>
          <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </CardTitle>
        </CardHeader>
      )}
      <CardContent>
        {activities.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            <Activity className="h-10 w-10 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No recent activities</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activities.slice(0, maxItems).map((activity) => (
              <div key={activity.id} className="flex gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                <div className="flex-shrink-0 mt-0.5">
                  {getStatusIcon(activity.status)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {activity.title}
                    </p>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">
                      {formatTimestamp(activity.timestamp)}
                    </span>
                  </div>
                  {activity.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">
                      {activity.description}
                    </p>
                  )}
                  {activity.user && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      by {activity.user}
                    </p>
                  )}
                </div>
              </div>
            ))}

            {activities.length > maxItems && (
              <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                <Button variant="ghost" size="sm" className="w-full text-sm">
                  <MoreHorizontal className="h-4 w-4 mr-2" />
                  View all activities
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  )
}

interface QuickActionCardProps {
  title: string
  actions: Array<{
    id: string
    label: string
    description?: string
    icon: React.ReactNode
    variant?: 'primary' | 'secondary' | 'danger'
    onClick: () => void
  }>
  variant?: 'base' | 'elevated' | 'flat' | 'glass'
  className?: string
}

export function QuickActionCard({
  title,
  actions,
  variant = 'base',
  className
}: QuickActionCardProps) {
  const getButtonVariant = (variant: string) => {
    switch (variant) {
      case 'primary':
        return 'bg-blue-600 hover:bg-blue-700 text-white'
      case 'secondary':
        return 'bg-gray-100 hover:bg-gray-200 text-gray-900 dark:bg-gray-800 dark:hover:bg-gray-700 dark:text-white'
      case 'danger':
        return 'bg-red-600 hover:bg-red-700 text-white'
      default:
        return 'bg-blue-600 hover:bg-blue-700 text-white'
    }
  }

  return (
    <Card className={cn(adminStyles.card[variant], className)}>
      <CardHeader>
        <CardTitle className="text-lg font-semibold text-gray-900 dark:text-white">
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3">
          {actions.map((action) => (
            <Button
              key={action.id}
              variant="ghost"
              className={cn(
                'h-auto p-4 justify-start text-left',
                'hover:scale-[1.02] transition-all duration-200'
              )}
              onClick={action.onClick}
            >
              <div className="flex items-start gap-3 w-full">
                <div className={cn(
                  'p-2 rounded-lg flex-shrink-0',
                  getButtonVariant(action.variant || 'primary')
                )}>
                  {action.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 dark:text-white text-sm">
                    {action.label}
                  </p>
                  {action.description && (
                    <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {action.description}
                    </p>
                  )}
                </div>
              </div>
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}

// Export all card components
export const AdminCards = {
  StatCard,
  MetricCard,
  ActivityCard,
  QuickActionCard
}
