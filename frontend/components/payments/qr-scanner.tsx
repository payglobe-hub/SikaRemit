'use client'

import React, { useRef, useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Loader2, QrCode, Camera, X } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { validateQRPayment, initiatePayment } from '@/lib/api/payments'
import { TransactionContext } from '@/lib/types/payments'

interface QRScannerProps {
  transactionContext: TransactionContext
  onSuccess?: (result: any) => void
  onCancel?: () => void
  onScanComplete?: (qrData: any) => void
}

export function QRScanner({ transactionContext, onSuccess, onCancel, onScanComplete }: QRScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [scanned, setScanned] = useState(false)
  const [scannedData, setScannedData] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const { toast } = useToast()

  // Load QR scanner library dynamically
  const [QrcodeScanner, setQrcodeScanner] = useState<any>(null)

  useEffect(() => {
    // Dynamically import QR scanner library
    const loadQRScanner = async () => {
      try {
        // Import real QR scanner library
        const { default: QrScanner } = await import('qr-scanner')
        setQrcodeScanner(QrScanner)
      } catch (error) {
        
        setError('QR scanner not available')
      }
    }

    loadQRScanner()

    return () => {
      // Cleanup camera stream
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop())
      }
    }
  }, [])

  const startScanning = async () => {
    try {
      setError(null)
      setIsScanning(true)

      // Request camera permission
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' } // Use back camera on mobile
      })

      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.play()

        // Start scanning for QR codes
        scanQRCode()
      }
    } catch (error) {
      
      setError('Camera access denied. Please allow camera permission to scan QR codes.')
      setIsScanning(false)
    }
  }

  const stopScanning = () => {
    setIsScanning(false)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop())
      streamRef.current = null
    }
  }

  const scanQRCode = async () => {
    if (!QrcodeScanner) return

    try {
      // Set up real QR scanner
      const qrScanner = new QrcodeScanner(
        videoRef.current!,
        (result: any) => handleQRResult(result)
      )

      await qrScanner.start()
      
      // Store scanner instance for cleanup
      ;(window as any).currentQRScanner = qrScanner
    } catch (error) {
      
      setError('Failed to start QR scanner')
    }
  }

  const handleQRResult = async (result: any) => {
    if (scanned || isProcessing) return
    
    try {
      setScanned(true)
      setIsProcessing(true)
      
      // Haptic feedback if available
      if ('vibrate' in navigator) {
        navigator.vibrate(100)
      }

      // Validate the QR code
      const validationResult = await validateQRPayment({ qr_data: result.data })

      if (validationResult.valid) {
        setScannedData(validationResult.payment_details)
        onScanComplete?.(validationResult.payment_details)
        stopScanning()

        toast({
          title: 'QR Code Scanned',
          description: `Valid payment QR found for ${validationResult.payment_details?.merchant_name}`
        })
      } else {
        toast({
          title: 'Invalid QR Code',
          description: validationResult.error || 'This QR code is not valid for payment',
          variant: 'destructive'
        })
        // Continue scanning
        setTimeout(() => {
          setScanned(false)
          setIsProcessing(false)
        }, 2000)
      }
    } catch (error: any) {
      toast({
        title: 'Scan Failed',
        description: error.message || 'Failed to process QR code',
        variant: 'destructive'
      })
      setTimeout(() => {
        setScanned(false)
        setIsProcessing(false)
      }, 2000)
    }
  }

  const processPayment = async () => {
    if (!scannedData) return

    setIsProcessing(true)
    try {
      const result = await initiatePayment({
        qr_reference: scannedData.reference,
        payment_method_id: undefined // Use default payment method
      })

      if (result.success) {
        toast({
          title: 'Payment Successful',
          description: `Paid ${result.currency} ${result.amount} to ${result.merchant}`
        })

        onSuccess?.(result)
      } else {
        toast({
          title: 'Payment Failed',
          description: result.error || 'Payment processing failed',
          variant: 'destructive'
        })
      }
    } catch (error: any) {
      toast({
        title: 'Payment Error',
        description: error.message || 'An error occurred during payment',
        variant: 'destructive'
      })
    } finally {
      setIsProcessing(false)
    }
  }

  const resetScanner = () => {
    setScannedData(null)
    setError(null)
    setIsProcessing(false)
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <QrCode className="h-5 w-5" />
            QR Payment Scanner
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!scannedData ? (
            <>
              {/* Camera View */}
              <div className="relative">
                <video
                  ref={videoRef}
                  className="w-full h-64 bg-black rounded-lg"
                  playsInline
                  muted
                />
                <canvas
                  ref={canvasRef}
                  className="hidden"
                />

                {/* Overlay with scanning frame */}
                {isScanning && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-48 h-48 border-2 border-primary rounded-lg relative">
                      <div className="absolute -top-1 -left-1 w-6 h-6 border-l-2 border-t-2 border-primary"></div>
                      <div className="absolute -top-1 -right-1 w-6 h-6 border-r-2 border-t-2 border-primary"></div>
                      <div className="absolute -bottom-1 -left-1 w-6 h-6 border-l-2 border-b-2 border-primary"></div>
                      <div className="absolute -bottom-1 -right-1 w-6 h-6 border-r-2 border-b-2 border-primary"></div>

                      {/* Scanning animation */}
                      <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary animate-pulse"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Control Buttons */}
              <div className="flex gap-2">
                {!isScanning ? (
                  <Button onClick={startScanning} className="flex-1">
                    <Camera className="h-4 w-4 mr-2" />
                    Start Scanning
                  </Button>
                ) : (
                  <Button onClick={stopScanning} variant="outline" className="flex-1">
                    <X className="h-4 w-4 mr-2" />
                    Stop Scanning
                  </Button>
                )}

                {onCancel && (
                  <Button onClick={onCancel} variant="outline">
                    Cancel
                  </Button>
                )}
              </div>

              {/* Status */}
              {isScanning && (
                <div className="text-center text-sm text-muted-foreground">
                  {isProcessing ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Processing QR code...
                    </div>
                  ) : (
                    'Point camera at QR code to scan'
                  )}
                </div>
              )}

              {/* Error Display */}
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
            </>
          ) : (
            <>
              {/* Scanned QR Details */}
              <div className="space-y-3">
                <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
                  <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                    <QrCode className="h-5 w-5" />
                    <span className="font-medium">QR Code Scanned Successfully</span>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Merchant:</span>
                    <span className="font-medium">{scannedData.merchant_name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Amount:</span>
                    <span className="font-medium">
                      {scannedData.currency} {scannedData.amount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Reference:</span>
                    <span className="font-mono text-sm">{scannedData.reference}</span>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                <Button onClick={processPayment} disabled={isProcessing} className="flex-1">
                  {isProcessing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  Pay {scannedData.currency} {scannedData.amount}
                </Button>
                <Button onClick={resetScanner} variant="outline">
                  Scan Another
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

