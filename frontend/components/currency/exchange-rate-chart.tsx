'use client'

import * as React from 'react'
import { useState, useEffect } from 'react'
import api from '@/lib/api/axios'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { getCurrencies, getExchangeRates, CurrencyWebSocketService } from '@/lib/api/currency'
import { Currency, ExchangeRateUpdate } from '@/lib/types/currency'
import { TrendingUp, TrendingDown, Minus, Activity } from 'lucide-react'

// Simple chart component using HTML5 Canvas
function RateChart({ data, fromCurrency, toCurrency }: {
  data: Array<{ timestamp: string; rate: number }>
  fromCurrency: string
  toCurrency: string
}) {
  const canvasRef = React.useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current || !data.length) return

    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height)

    // Set canvas size
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * window.devicePixelRatio
    canvas.height = rect.height * window.devicePixelRatio
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio)

    // Chart dimensions
    const width = rect.width
    const height = rect.height
    const padding = 40

    // Find min/max values
    const rates = data.map(d => d.rate)
    const minRate = Math.min(...rates)
    const maxRate = Math.max(...rates)
    const range = maxRate - minRate || 1

    // Draw grid
    ctx.strokeStyle = '#f0f0f0'
    ctx.lineWidth = 1

    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = padding + (height - 2 * padding) * (i / 5)
      ctx.beginPath()
      ctx.moveTo(padding, y)
      ctx.lineTo(width - padding, y)
      ctx.stroke()

      // Y-axis labels
      const value = maxRate - (range * i / 5)
      ctx.fillStyle = '#666'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'right'
      ctx.fillText(value.toFixed(4), padding - 5, y + 3)
    }

    // Draw line
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.beginPath()

    data.forEach((point, index) => {
      const x = padding + (width - 2 * padding) * (index / (data.length - 1))
      const y = padding + (height - 2 * padding) * (1 - (point.rate - minRate) / range)

      if (index === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }

      // Draw points
      ctx.fillStyle = '#3b82f6'
      ctx.beginPath()
      ctx.arc(x, y, 3, 0, 2 * Math.PI)
      ctx.fill()
    })

    ctx.stroke()

    // Draw X-axis labels (dates)
    ctx.fillStyle = '#666'
    ctx.font = '10px sans-serif'
    ctx.textAlign = 'center'

    const labelCount = Math.min(5, data.length)
    for (let i = 0; i < labelCount; i++) {
      const index = Math.floor((data.length - 1) * i / (labelCount - 1))
      const point = data[index]
      const x = padding + (width - 2 * padding) * (index / (data.length - 1))

      const date = new Date(point.timestamp)
      const label = date.toLocaleDateString()
      ctx.fillText(label, x, height - 10)
    }

  }, [data, fromCurrency, toCurrency])

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No historical data available
      </div>
    )
  }

  return (
    <div className="w-full">
      <canvas
        ref={canvasRef}
        className="w-full h-64 border border-gray-200 rounded"
        style={{ width: '100%', height: '256px' }}
      />
    </div>
  )
}

interface ExchangeRateChartProps {
  initialFromCurrency?: string
  initialToCurrency?: string
  showLiveUpdates?: boolean
}

export function ExchangeRateChart({
  initialFromCurrency = 'USD',
  initialToCurrency = 'EUR',
  showLiveUpdates = true
}: ExchangeRateChartProps) {
  const [currencies, setCurrencies] = useState<Currency[]>([])
  const [fromCurrency, setFromCurrency] = useState(initialFromCurrency)
  const [toCurrency, setToCurrency] = useState(initialToCurrency)
  const [currentRate, setCurrentRate] = useState<number | null>(null)
  const [historicalData, setHistoricalData] = useState<Array<{ timestamp: string; rate: number }>>([])
  const [loading, setLoading] = useState(false)
  const [wsService, setWsService] = useState<CurrencyWebSocketService | null>(null)
  const { toast } = useToast()

  useEffect(() => {
    loadCurrencies()
    return () => {
      if (wsService) {
        wsService.disconnect()
      }
    }
  }, [])

  useEffect(() => {
    if (currencies?.length > 0) {
      loadCurrentRate()
      loadHistoricalData()

      if (showLiveUpdates) {
        setupWebSocket()
      }
    }
  }, [fromCurrency, toCurrency, currencies])

  const loadCurrencies = async () => {
    try {
      const response = await getCurrencies()
      setCurrencies(response.data)
    } catch (error) {
      
    }
  }

  const loadCurrentRate = async () => {
    try {
      const response = await getExchangeRates({
        base: fromCurrency,
        target: toCurrency
      })

      // Handle both response types: ExchangeRate object or rates object
      let rate: number | undefined
      if ('rate' in response.data) {
        // ExchangeRate type
        rate = response.data.rate
      } else if ('rates' in response.data && response.data.rates[toCurrency]) {
        // Rates object type
        rate = response.data.rates[toCurrency]
      }

      if (rate) {
        setCurrentRate(rate)
      }
    } catch (error) {
      
    }
  }

  const loadHistoricalData = async () => {
    setLoading(true)
    try {
      // Fetch real historical data from API
      const response = await api.get('/api/v1/currencies/historical/', {
        params: { from_currency: fromCurrency, to_currency: toCurrency, days: 30 }
      })
      const data = response.data
      
      // Transform API response to chart format
      const chartData = data.data.map((item: any) => ({
        timestamp: item.date + 'T00:00:00.000Z', // Convert date to ISO string
        rate: item.rate
      }))
      
      setHistoricalData(chartData)
    } catch (error) {
      
      toast({
        title: 'Error',
        description: 'Failed to load historical exchange rate data',
        variant: 'destructive',
      })
    } finally {
      setLoading(false)
    }
  }

  const setupWebSocket = () => {
    if (wsService) {
      wsService.disconnect()
    }

    const service = new CurrencyWebSocketService(
      (rates) => {
        // Update current rate if available
        if (rates[toCurrency]) {
          setCurrentRate(rates[toCurrency])
        }
      },
      undefined,
      (error) => {
        toast({
          title: 'Connection Error',
          description: error,
          variant: 'destructive',
        })
      }
    )

    service.connect()
    setWsService(service)
  }

  const getRateChange = () => {
    if (historicalData.length < 2) return null

    const latest = historicalData[historicalData.length - 1]
    const previous = historicalData[historicalData.length - 2]
    const change = ((latest.rate - previous.rate) / previous.rate) * 100

    return {
      value: change,
      direction: change > 0 ? 'up' : change < 0 ? 'down' : 'stable'
    }
  }

  const rateChange = getRateChange()

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Exchange Rate Chart
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Currency Selectors */}
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="text-sm font-medium">From Currency</label>
            <Select value={fromCurrency} onValueChange={setFromCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies?.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <span>{currency.flag_emoji}</span>
                      <span>{currency.code} - {currency.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1">
            <label className="text-sm font-medium">To Currency</label>
            <Select value={toCurrency} onValueChange={setToCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {currencies?.map((currency) => (
                  <SelectItem key={currency.code} value={currency.code}>
                    <div className="flex items-center gap-2">
                      <span>{currency.flag_emoji}</span>
                      <span>{currency.code} - {currency.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Current Rate Display */}
        {currentRate && (
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div>
              <div className="text-2xl font-bold">
                1 {fromCurrency} = {currentRate.toFixed(4)} {toCurrency}
              </div>
              <div className="text-sm text-gray-600">
                Last updated: {new Date().toLocaleTimeString()}
              </div>
            </div>

            {rateChange && (
              <div className="flex items-center gap-2">
                {rateChange.direction === 'up' && <TrendingUp className="h-4 w-4 text-green-600" />}
                {rateChange.direction === 'down' && <TrendingDown className="h-4 w-4 text-red-600" />}
                {rateChange.direction === 'stable' && <Minus className="h-4 w-4 text-gray-600" />}

                <Badge variant={rateChange.direction === 'up' ? 'default' : rateChange.direction === 'down' ? 'destructive' : 'secondary'}>
                  {rateChange.value > 0 ? '+' : ''}{rateChange.value.toFixed(2)}%
                </Badge>
              </div>
            )}
          </div>
        )}

        {/* Chart */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">30-Day Trend</h3>
            {loading && <div className="text-sm text-gray-600">Loading...</div>}
          </div>

          <RateChart
            data={historicalData}
            fromCurrency={fromCurrency}
            toCurrency={toCurrency}
          />
        </div>

        {/* Live Updates Status */}
        {showLiveUpdates && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className={`w-2 h-2 rounded-full ${wsService ? 'bg-green-500' : 'bg-red-500'}`} />
            {wsService ? 'Live updates active' : 'Live updates disconnected'}
          </div>
        )}
      </CardContent>
    </Card>
  )
}
