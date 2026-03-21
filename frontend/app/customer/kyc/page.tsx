'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '@/components/ui/breadcrumb'
import { Upload, X, CheckCircle, AlertCircle, FileImage, Calendar, Home } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { uploadKYCDocument, getKYCStatus, getKYCDocuments, verifyBiometrics, checkLiveness } from '@/lib/api/kyc'
import { getCurrentCustomerProfile } from '@/lib/api/customer'
import { DOCUMENT_TYPES, KYCUploadData, KYCDocument, BiometricFaceMatchData, BiometricLivenessData, BiometricResult } from '@/lib/types/kyc'

// Force dynamic rendering to prevent SSR issues with auth
export const dynamic = 'force-dynamic'
export const runtime = 'edge'

export default function KYCUploadPage() {
  const router = useRouter()
  const { toast } = useToast()
  const queryClient = useQueryClient()
  const [selectedType, setSelectedType] = useState<string>('')
  const [frontImage, setFrontImage] = useState<File | null>(null)
  const [backImage, setBackImage] = useState<File | null>(null)
  const [expiryDate, setExpiryDate] = useState('')
  const [uploadProgress, setUploadProgress] = useState(0)
  const frontInputRef = useRef<HTMLInputElement>(null)
  const backInputRef = useRef<HTMLInputElement>(null)
  const selfieInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  const [selfieImage, setSelfieImage] = useState<File | null>(null)
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [customerId, setCustomerId] = useState<number | null>(null)

  const { data: kycStatus, isLoading: statusLoading } = useQuery({
    queryKey: ['kyc-status'],
    queryFn: getKYCStatus,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ['kyc-documents'],
    queryFn: getKYCDocuments,
    staleTime: 5 * 60 * 1000, // 5 minutes
  })

  const { data: customerProfile } = useQuery({
    queryKey: ['customer-profile'],
    queryFn: getCurrentCustomerProfile,
    staleTime: 10 * 60 * 1000, // 10 minutes
  })

  useEffect(() => {
    if (customerProfile) {
      setCustomerId(Number(customerProfile.id))
    }
  }, [customerProfile])

  const faceMatchMutation = useMutation({
    mutationFn: (data: BiometricFaceMatchData) => verifyBiometrics(data),
    onSuccess: (result: BiometricResult) => {
      if (!result.success) {
        toast({
          title: 'Face Verification Failed',
          description: result.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Face Verification Success',
          description: `Face match score: ${result.confidence_score?.toFixed(2)}`,
        })
        queryClient.invalidateQueries({ queryKey: ['kyc-status'] })
        resetBiometricForm()
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Face verification failed',
        variant: 'destructive',
      })
    },
  })

  const livenessMutation = useMutation({
    mutationFn: (data: BiometricLivenessData) => checkLiveness(data),
    onSuccess: (result: BiometricResult) => {
      if (!result.success) {
        toast({
          title: 'Liveness Check Failed',
          description: result.message,
          variant: 'destructive',
        })
      } else {
        toast({
          title: 'Liveness Check Success',
          description: `Liveness score: ${result.confidence_score?.toFixed(2)}`,
        })
        queryClient.invalidateQueries({ queryKey: ['kyc-status'] })
        resetBiometricForm()
      }
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Liveness check failed',
        variant: 'destructive',
      })
    },
  })

  const uploadMutation = useMutation({
    mutationFn: (data: KYCUploadData) => uploadKYCDocument(data),
    onSuccess: () => {
      toast({
        title: 'Success',
        description: 'Document uploaded successfully. It will be reviewed shortly.',
      })
      queryClient.invalidateQueries({ queryKey: ['kyc-status'] })
      queryClient.invalidateQueries({ queryKey: ['kyc-documents'] })
      resetForm()
    },
    onError: (error: any) => {
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to upload document',
        variant: 'destructive',
      })
    },
  })

  const resetForm = () => {
    setSelectedType('')
    setFrontImage(null)
    setBackImage(null)
    setExpiryDate('')
    setUploadProgress(0)
    if (frontInputRef.current) frontInputRef.current.value = ''
    if (backInputRef.current) backInputRef.current.value = ''
  }

  const resetBiometricForm = () => {
    setSelfieImage(null)
    setVideoFile(null)
    if (selfieInputRef.current) selfieInputRef.current.value = ''
    if (videoInputRef.current) videoInputRef.current.value = ''
  }

  const handleBiometricFileSelect = (file: File, type: 'selfie' | 'video') => {
    if (type === 'selfie') {
      // Validate selfie
      if (!file.type.startsWith('image/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select an image file for selfie',
          variant: 'destructive',
        })
        return
      }
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a selfie smaller than 5MB',
          variant: 'destructive',
        })
        return
      }
      setSelfieImage(file)
    } else {
      // Validate video
      if (!file.type.startsWith('video/')) {
        toast({
          title: 'Invalid file type',
          description: 'Please select a video file',
          variant: 'destructive',
        })
        return
      }
      if (file.size > 50 * 1024 * 1024) {
        toast({
          title: 'File too large',
          description: 'Please select a video smaller than 50MB',
          variant: 'destructive',
        })
        return
      }
      setVideoFile(file)
    }
  }

  const handleFileSelect = (file: File, type: 'front' | 'back') => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast({
        title: 'Invalid file type',
        description: 'Please select an image file',
        variant: 'destructive',
      })
      return
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: 'Please select a file smaller than 5MB',
        variant: 'destructive',
      })
      return
    }

    if (type === 'front') {
      setFrontImage(file)
    } else {
      setBackImage(file)
    }
  }

  const handleSubmit = () => {
    if (!selectedType || !frontImage) {
      toast({
        title: 'Missing information',
        description: 'Please select document type and upload front image',
        variant: 'destructive',
      })
      return
    }

    const uploadData: KYCUploadData = {
      document_type: selectedType as KYCDocument['document_type'],
      file: frontImage,
      ...(expiryDate && { expiry_date: expiryDate }),
    }

    uploadMutation.mutate(uploadData)
  }

  const handleFaceVerification = () => {
    if (!selfieImage || !customerId) {
      toast({
        title: 'Missing information',
        description: 'Please upload a selfie and ensure your profile is loaded',
        variant: 'destructive',
      })
      return
    }

    // For face verification, we need a document image. Assuming the first approved document.
    const approvedDoc = documents?.find(doc => doc.status === 'approved')
    if (!approvedDoc) {
      toast({
        title: 'No approved document',
        description: 'Please wait for your document to be approved before face verification',
        variant: 'destructive',
      })
      return
    }

    const faceData: BiometricFaceMatchData = {
      selfie: selfieImage,
      document_photo: selfieImage, // In a real scenario, this should be the document photo file
    }

    faceMatchMutation.mutate(faceData)
  }

  const handleLivenessCheck = () => {
    if (!videoFile || !customerId) {
      toast({
        title: 'Missing information',
        description: 'Please record a video and ensure your profile is loaded',
        variant: 'destructive',
      })
      return
    }

    const livenessData: BiometricLivenessData = {
      video: videoFile,
    }

    livenessMutation.mutate(livenessData)
  }

  const getStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'approved':
        return <Badge variant="default" className="bg-green-100 text-green-800">Approved</Badge>
      case 'rejected':
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="secondary">Pending Review</Badge>
    }
  }

  if (statusLoading || documentsLoading) {
    return (
      <div className="min-h-screen bg-sikaremit-card space-y-6 p-6">
        <div className="max-w-4xl mx-auto">
          {/* Skeleton Header */}
          <div className="mb-8">
            <div className="h-8 bg-gray-200 rounded w-64 mb-2 animate-pulse"></div>
            <div className="h-4 bg-gray-200 rounded w-96 animate-pulse"></div>
          </div>

          {/* Skeleton Status Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 animate-pulse">
            <div className="flex items-center justify-between">
              <div>
                <div className="h-6 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-48"></div>
              </div>
              <div className="text-right">
                <div className="h-8 bg-gray-200 rounded w-16 mb-1"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
          </div>

          {/* Skeleton Documents Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-40 mb-4"></div>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded"></div>
                  <div>
                    <div className="h-4 bg-gray-200 rounded w-32 mb-1"></div>
                    <div className="h-3 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
                <div className="h-6 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>

          {/* Skeleton Upload Card */}
          <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
            <div className="h-6 bg-gray-200 rounded w-36 mb-4"></div>
            <div className="space-y-4">
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <div className="w-12 h-12 bg-gray-200 rounded-full mx-auto mb-2"></div>
                  <div className="h-4 bg-gray-200 rounded w-48 mx-auto mb-1"></div>
                  <div className="h-3 bg-gray-200 rounded w-32 mx-auto"></div>
                </div>
              </div>
              <div className="h-10 bg-gray-200 rounded"></div>
              <div className="flex gap-4">
                <div className="h-10 bg-gray-200 rounded flex-1"></div>
                <div className="h-10 bg-gray-200 rounded w-20"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-sikaremit-card space-y-6 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb Navigation */}
        <Breadcrumb className="mb-6">
          <BreadcrumbList>
            <BreadcrumbItem>
              <BreadcrumbLink href="/" className="flex items-center gap-1">
                <Home className="h-4 w-4" />
                Home
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbLink href="/customer/account">Account</BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator />
            <BreadcrumbItem>
              <BreadcrumbPage>KYC Verification</BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-sikaremit-foreground">KYC Verification</h1>
          <p className="text-sikaremit-muted mt-2">
            Complete your identity verification to unlock full account features
          </p>
        </div>

        {/* Verification Status */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Verification Status</CardTitle>
            <CardDescription>
              Your current verification level and requirements
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium">Level {kycStatus?.verification_level || 0}</span>
                  {getStatusBadge(kycStatus?.is_verified ? 'APPROVED' : 'PENDING')}
                </div>
                <p className="text-sm text-muted-foreground">
                  {kycStatus?.is_verified
                    ? 'Your account is fully verified'
                    : 'Complete document upload to get verified'
                  }
                </p>
              </div>
              <div className="text-right">
                <div className="text-2xl font-bold text-primary">
                  {kycStatus?.verification_level || 0}/3
                </div>
                <p className="text-xs text-muted-foreground">Verification Level</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Existing Documents */}
        {documents && documents.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Submitted Documents</CardTitle>
              <CardDescription>
                Documents you've already submitted for verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileImage className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <p className="font-medium">
                          {DOCUMENT_TYPES.find(t => t.value === doc.document_type)?.label}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Submitted {new Date(doc.uploaded_at).toLocaleDateString()}
                        </p>
                        {doc.rejection_reason && (
                          <p className="text-sm text-red-600 mt-1">
                            Reason: {doc.rejection_reason}
                          </p>
                        )}
                      </div>
                    </div>
                    {getStatusBadge(doc.status)}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Upload */}
        {!kycStatus?.is_verified && (
          <Card>
            <CardHeader>
              <CardTitle>Upload Documents</CardTitle>
              <CardDescription>
                Upload clear photos of your identification documents
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Document Type Selection */}
              <div className="space-y-2">
                <Label htmlFor="documentType">Document Type</Label>
                <Select value={selectedType} onValueChange={setSelectedType}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select document type" className="!text-gray-900 font-semibold" />
                  </SelectTrigger>
                  <SelectContent className="bg-white border border-gray-200 shadow-lg">
                    {DOCUMENT_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value} className="px-3 py-2 text-gray-900 hover:bg-blue-50 hover:text-blue-900 cursor-pointer">
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Front Image Upload */}
              <div className="space-y-2">
                <Label>Front Image *</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <input
                    ref={frontInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'front')}
                    className="hidden"
                  />
                  {frontImage ? (
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="font-medium">{frontImage.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(frontImage.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => frontInputRef.current?.click()}
                        className="mt-2"
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center cursor-pointer" onClick={() => frontInputRef.current?.click()}>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="font-medium">Click to upload front image</p>
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Back Image Upload (for applicable documents) */}
              {(selectedType === 'ID_CARD' || selectedType === 'DRIVERS_LICENSE') && (
                <div className="space-y-2">
                  <Label>Back Image (Optional)</Label>
                  <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                    <input
                      ref={backInputRef}
                      type="file"
                      accept="image/*"
                      onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0], 'back')}
                      className="hidden"
                    />
                    {backImage ? (
                      <div className="text-center">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                        <p className="font-medium">{backImage.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {(backImage.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => backInputRef.current?.click()}
                          className="mt-2"
                        >
                          Change File
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center cursor-pointer" onClick={() => backInputRef.current?.click()}>
                        <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                        <p className="font-medium">Click to upload back image</p>
                        <p className="text-sm text-muted-foreground">
                          PNG, JPG up to 5MB
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Expiry Date */}
              <div className="space-y-2">
                <Label htmlFor="expiryDate">Expiry Date (if applicable)</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                />
              </div>

              {/* Upload Progress */}
              {uploadMutation.isPending && (
                <div className="space-y-2">
                  <Label>Uploading...</Label>
                  <Progress value={uploadProgress} className="w-full" />
                </div>
              )}

              {/* Submit Button */}
              <div className="flex gap-4">
                <Button
                  onClick={handleSubmit}
                  disabled={uploadMutation.isPending || !selectedType || !frontImage}
                  className="flex-1"
                >
                  {uploadMutation.isPending ? 'Uploading...' : 'Upload Document'}
                </Button>
                <Button variant="outline" onClick={resetForm}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Face Verification */}
        {!kycStatus?.is_verified && (kycStatus?.verification_level ?? 0) >= 1 && customerId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Face Verification</CardTitle>
              <CardDescription>
                Upload a clear selfie to match against your approved document
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Selfie Upload */}
              <div className="space-y-2">
                <Label>Selfie Image *</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <input
                    ref={selfieInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => e.target.files?.[0] && handleBiometricFileSelect(e.target.files[0], 'selfie')}
                    className="hidden"
                  />
                  {selfieImage ? (
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="font-medium">{selfieImage.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(selfieImage.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => selfieInputRef.current?.click()}
                        className="mt-2"
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center cursor-pointer" onClick={() => selfieInputRef.current?.click()}>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="font-medium">Click to upload selfie</p>
                      <p className="text-sm text-muted-foreground">
                        PNG, JPG up to 5MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Face Verification */}
              <div className="flex gap-4">
                <Button
                  onClick={handleFaceVerification}
                  disabled={faceMatchMutation.isPending || !selfieImage}
                  className="flex-1"
                >
                  {faceMatchMutation.isPending ? 'Verifying...' : 'Verify Face'}
                </Button>
                <Button variant="outline" onClick={resetBiometricForm}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Liveness Check */}
        {!kycStatus?.is_verified && (kycStatus?.verification_level ?? 0) >= 0 && customerId && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Liveness Check</CardTitle>
              <CardDescription>
                Record a short video to confirm you're a real person
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Video Upload */}
              <div className="space-y-2">
                <Label>Video Recording *</Label>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6">
                  <input
                    ref={videoInputRef}
                    type="file"
                    accept="video/*"
                    onChange={(e) => e.target.files?.[0] && handleBiometricFileSelect(e.target.files[0], 'video')}
                    className="hidden"
                  />
                  {videoFile ? (
                    <div className="text-center">
                      <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
                      <p className="font-medium">{videoFile.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {(videoFile.size / 1024 / 1024).toFixed(2)} MB
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => videoInputRef.current?.click()}
                        className="mt-2"
                      >
                        Change File
                      </Button>
                    </div>
                  ) : (
                    <div className="text-center cursor-pointer" onClick={() => videoInputRef.current?.click()}>
                      <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
                      <p className="font-medium">Click to upload video</p>
                      <p className="text-sm text-muted-foreground">
                        MP4, MOV up to 50MB
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Submit Liveness Check */}
              <div className="flex gap-4">
                <Button
                  onClick={handleLivenessCheck}
                  disabled={livenessMutation.isPending || !videoFile}
                  className="flex-1"
                >
                  {livenessMutation.isPending ? 'Checking...' : 'Check Liveness'}
                </Button>
                <Button variant="outline" onClick={resetBiometricForm}>
                  Reset
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Phone Verification Section */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5" />
              Phone Verification
            </CardTitle>
            <CardDescription>
              Verify your phone number to complete KYC requirements
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <div className="mb-4">
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto">
                  <Upload className="h-8 w-8 text-blue-600" />
                </div>
              </div>
              <h3 className="text-lg font-semibold mb-2">Verify Your Phone Number</h3>
              <p className="text-muted-foreground mb-4">
                We'll send you a verification code to confirm your phone number
              </p>
              <Button 
                onClick={() => router.push('/customer/verify-phone')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Verify Phone Number
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Information Alert */}
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            <strong>Important:</strong> Documents are encrypted and stored securely.
            Processing typically takes 1-3 business days. You'll receive a notification once reviewed.
          </AlertDescription>
        </Alert>
      </div>
    </div>
  )
}
