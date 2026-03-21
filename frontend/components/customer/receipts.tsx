'use client'

import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useQuery } from '@tanstack/react-query'
import { getCustomerReceipts } from '@/lib/api/customer'
import { Receipt } from '@/lib/types/customer'
import { Download, AlertCircle, RefreshCw, Receipt as ReceiptIcon, Calendar, DollarSign, CheckCircle, Clock } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

export function Receipts() {
  const {
    data: receipts,
    isLoading,
    error,
    refetch,
    isRefetching
  } = useQuery<Receipt[]>({
    queryKey: ['customer-receipts'],
    queryFn: getCustomerReceipts,
    retry: 3,
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  if (isLoading) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium">Receipts</h3>
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex justify-between items-center border p-4 rounded animate-pulse">
              <div className="space-y-2 flex-1">
                <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                <div className="h-3 bg-gray-200 rounded w-1/4"></div>
              </div>
              <div className="h-8 bg-gray-200 rounded w-20"></div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="space-y-4">
        <h3 className="font-medium">Receipts</h3>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="flex items-center justify-between">
            <span>Failed to load receipts. Please try again.</span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="font-medium flex items-center gap-2">
          <ReceiptIcon className="h-5 w-5" />
          Payment Receipts
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isRefetching}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isRefetching ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {!receipts || receipts.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ReceiptIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <h4 className="font-medium mb-2">No receipts found</h4>
            <p className="text-sm text-muted-foreground text-center">
              Your payment receipts will appear here after successful transactions
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {receipts.map(receipt => (
            <Card key={receipt.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-green-100 rounded-full">
                      <CheckCircle className="h-6 w-6 text-green-600" />
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-muted-foreground" />
                        <span className="text-2xl font-bold">₵{receipt.amount.toFixed(2)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {new Date(receipt.date).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          Receipt #{receipt.id.slice(-8).toUpperCase()}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild>
                      <a
                        href={receipt.download_url}
                        download={`receipt-${receipt.id}.pdf`}
                        className="flex items-center gap-2"
                      >
                        <Download className="h-4 w-4" />
                        Download PDF
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-muted">
                  <div className="text-sm text-muted-foreground">
                    <strong>Transaction Details:</strong> Payment processed successfully through sikaremit.
                    This receipt serves as proof of payment and can be used for accounting purposes.
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
