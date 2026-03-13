'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface LoadingSkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'text' | 'circular' | 'rectangular'
  width?: string | number
  height?: string | number
  lines?: number
}

export function LoadingSkeleton({
  className,
  variant = 'text',
  width,
  height,
  lines = 1,
  ...props
}: LoadingSkeletonProps) {
  const getSkeletonClasses = () => {
    const baseClasses = 'animate-pulse rounded-md bg-gray-200'
    
    switch (variant) {
      case 'text':
        return cn(baseClasses, 'h-4', width ? `w-[${width}]` : 'w-full', className)
      case 'circular':
        return cn(baseClasses, 'rounded-full', width || 'w-10', height || 'h-10', className)
      case 'rectangular':
        return cn(baseClasses, width || 'w-full', height || 'h-20', className)
      default:
        return cn(baseClasses, className)
    }
  }

  if (variant === 'text' && lines > 1) {
    return (
      <div className="space-y-2" {...props}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={cn(
              'animate-pulse rounded-md bg-gray-200 h-4',
              index === lines - 1 ? 'w-3/4' : 'w-full',
              className
            )}
            style={{
              width: index === lines - 1 && width ? width : undefined
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      className={getSkeletonClasses()}
      style={{
        width: typeof width === 'number' ? `${width}px` : width,
        height: typeof height === 'number' ? `${height}px` : height,
      }}
      role="status"
      aria-label="Loading..."
      {...props}
    />
  )
}

// Dashboard skeleton components
export function DashboardStatsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white rounded-lg shadow-sm p-6">
          <LoadingSkeleton variant="text" width="60%" className="mb-4" />
          <LoadingSkeleton variant="text" width="40%" height="h-8" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            {Array.from({ length: columns }).map((_, index) => (
              <th key={index} className="px-6 py-3">
                <LoadingSkeleton variant="text" height="h-4" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {Array.from({ length: rows }).map((_, rowIndex) => (
            <tr key={rowIndex}>
              {Array.from({ length: columns }).map((_, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  <LoadingSkeleton variant="text" height="h-4" />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function CardSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="bg-white rounded-lg shadow-sm p-6">
      <LoadingSkeleton variant="text" width="40%" className="mb-4" />
      <LoadingSkeleton variant="text" lines={lines} />
    </div>
  )
}
