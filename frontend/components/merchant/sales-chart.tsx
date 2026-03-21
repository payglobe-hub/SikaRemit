'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import api from '@/lib/api/axios'

export default function SalesChart() {
  const { data: salesData, isLoading } = useQuery({
    queryKey: ['merchant-sales-trend'],
    queryFn: async () => {
      const response = await api.get('/api/v1/merchants/dashboard/sales_trend/')
      return response.data
    }
  })

  const [isChartReady, setIsChartReady] = useState(false)
  
  // Set chart ready after component mounts and container is rendered
  useEffect(() => {
    const timer = setTimeout(() => setIsChartReady(true), 100)
    return () => clearTimeout(timer)
  }, [])

  if (isLoading || !isChartReady) {
    return (
      <div className="h-80 w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  const formattedData = salesData?.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    sales: item.total || item.sales || 0,
    transactions: item.count || item.transactions || 0
  })) || []

  return (
    <div className="h-80 w-full">
      <ResponsiveContainer width={800} height={320}>
        <BarChart data={formattedData}>
          <CartesianGrid strokeDasharray="3 3" className="stroke-gray-200 dark:stroke-gray-700" />
          <XAxis
            dataKey="date"
            className="text-gray-600 dark:text-gray-400 text-xs"
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            className="text-gray-600 dark:text-gray-400 text-xs"
            axisLine={false}
            tickLine={false}
            tickFormatter={(value) => `$${value}`}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'white',
              border: '1px solid #e5e7eb',
              borderRadius: '8px',
              boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
            }}
            formatter={(value: any, name: string) => [
              name === 'sales' ? `$${value}` : value,
              name === 'sales' ? 'Revenue' : 'Transactions'
            ]}
            labelStyle={{ color: '#374151' }}
          />
          <Bar
            dataKey="sales"
            fill="#3b82f6"
            radius={[4, 4, 0, 0]}
            name="sales"
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
