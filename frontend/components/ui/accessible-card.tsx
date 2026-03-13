'use client'

import React from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { cn } from '@/lib/utils'

interface AccessibleCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  children: React.ReactNode
  ariaLabel?: string
  role?: string
}

export function AccessibleCard({
  title,
  description,
  children,
  className,
  ariaLabel,
  role = 'region',
  ...props
}: AccessibleCardProps) {
  const titleId = `card-title-${React.useId()}`
  const descriptionId = `card-description-${React.useId()}`

  return (
    <Card
      className={cn('focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2', className)}
      role={role}
      aria-labelledby={titleId}
      aria-describedby={description ? descriptionId : undefined}
      aria-label={ariaLabel}
      tabIndex={0}
      {...props}
    >
      <CardHeader>
        <CardTitle id={titleId} className="sr-only">
          {title}
        </CardTitle>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold leading-none tracking-tight">
            {title}
          </h3>
        </div>
        {description && (
          <CardDescription id={descriptionId}>
            {description}
          </CardDescription>
        )}
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  )
}
