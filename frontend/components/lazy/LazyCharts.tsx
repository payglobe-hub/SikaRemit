'use client'

import dynamic from 'next/dynamic'
import { Suspense } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { BarChart3 } from 'lucide-react'

// Loading component for charts
const ChartLoadingSkeleton = () => (
  <div className="h-80 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800">
    <div className="text-center space-y-4">
      <BarChart3 className="h-12 w-12 text-blue-400 mx-auto animate-pulse" />
      <div className="text-sm text-gray-600 dark:text-gray-400">Loading chart...</div>
    </div>
  </div>
)

// Lazy loaded RevenueChart
export const RevenueChart = dynamic(
  () => import('@/components/merchant/revenue-chart').then(mod => ({ default: mod.default })),
  {
    loading: ChartLoadingSkeleton,
    ssr: false
  }
)

// Lazy loaded SalesChart
export const SalesChart = dynamic(
  () => import('@/components/merchant/sales-chart').then(mod => ({ default: mod.default })),
  {
    loading: ChartLoadingSkeleton,
    ssr: false
  }
)

// Placeholder for PerformanceChart - to be implemented
export const PerformanceChart = dynamic(
  () => Promise.resolve({
    default: () => (
      <div className="h-80 flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/10 dark:to-indigo-900/10 rounded-xl border-2 border-dashed border-blue-200 dark:border-blue-800">
        <div className="text-center space-y-4">
          <BarChart3 className="h-12 w-12 text-blue-400 mx-auto" />
          <div className="text-sm text-gray-600 dark:text-gray-400">Performance Chart Coming Soon</div>
        </div>
      </div>
    )
  }),
  {
    loading: ChartLoadingSkeleton,
    ssr: false
  }
)

// Chart wrapper with proper error boundary
export function ChartWrapper({ children, title }: { children: React.ReactNode; title: string }) {
  return (
    <div className="space-y-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
      <Suspense fallback={<ChartLoadingSkeleton />}>
        {children}
      </Suspense>
    </div>
  )
}
