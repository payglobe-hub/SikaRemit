'use client'

import { useState, useEffect } from 'react'
import api from '@/lib/api/axios'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Shield,
  Upload,
  CheckCircle,
  Clock,
  XCircle,
  FileText,
  TrendingUp,
  Award,
  ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { TrustBadgeDisplay } from './TrustBadgeDisplay'

interface VerificationDocument {
  id: number
  document_type: string
  status: 'pending_review' | 'approved' | 'rejected' | 'expired'
  submitted_at: string
  reviewed_at?: string
  rejection_reason?: string
}

interface VerificationLevel {
  level: string
  details: {
    name: string
    requirements: string[]
    benefits: string[]
    badge: string
  }
}

interface MerchantVerificationPortalProps {
  merchantId: number
}

export function MerchantVerificationPortal({ merchantId }: MerchantVerificationPortalProps) {
  const [currentLevel, setCurrentLevel] = useState<string>('unverified')
  const [nextLevel, setNextLevel] = useState<VerificationLevel | null>(null)
  const [documents, setDocuments] = useState<VerificationDocument[]>([])
  const [uploading, setUploading] = useState(false)
  const [selectedDocType, setSelectedDocType] = useState('')
  const [trustScore, setTrustScore] = useState(0)

  useEffect(() => {
    fetchVerificationStatus()
    fetchDocuments()
  }, [merchantId])

  const fetchVerificationStatus = async () => {
    try {
      const response = await api.get(`/api/v1/merchants/${merchantId}/trust/status/`)
      const data = response.data
      
      if (data.success) {
        setCurrentLevel(data.verification_status.trust_level)
        setNextLevel(data.verification_status.next_level)
        setTrustScore(data.verification_status.trust_score)
      }
    } catch (error) {
      console.error('Error fetching verification status:', error)
    }
  }

  const fetchDocuments = async () => {
    try {
      const response = await api.get(`/api/v1/merchants/${merchantId}/documents/`)
      const data = response.data
      
      if (data.success) {
        setDocuments(data.documents)
      }
    } catch (error) {
      console.error('Error fetching documents:', error)
    }
  }

  const handleDocumentUpload = async (file: File) => {
    if (!selectedDocType) {
      alert('Please select a document type')
      return
    }

    try {
      setUploading(true)
      
      const formData = new FormData()
      formData.append('file', file)
      formData.append('document_type', selectedDocType)
      formData.append('merchant_id', merchantId.toString())

      const response = await api.post('/api/v1/merchants/documents/upload/', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })

      const data = response.data
      
      if (data.success) {
        fetchDocuments()
        setSelectedDocType('')
      }
    } catch (error) {
      console.error('Error uploading document:', error)
    } finally {
      setUploading(false)
    }
  }

  const documentTypes = [
    { value: 'business_registration', label: 'Business Registration' },
    { value: 'tax_id', label: 'Tax ID Document' },
    { value: 'bank_statement', label: 'Bank Statement' },
    { value: 'identity_proof', label: 'Identity Proof' },
    { value: 'address_proof', label: 'Address Proof' },
    { value: 'financial_statement', label: 'Financial Statement' }
  ]

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'pending_review':
        return <Clock className="w-5 h-5 text-yellow-500" />
      case 'rejected':
        return <XCircle className="w-5 h-5 text-red-500" />
      default:
        return <FileText className="w-5 h-5 text-gray-500" />
    }
  }

  const getStatusBadge = (status: string) => {
    const variants = {
      approved: 'default',
      pending_review: 'secondary',
      rejected: 'destructive',
      expired: 'outline'
    }
    return variants[status as keyof typeof variants] || 'secondary'
  }

  const getLevelProgress = () => {
    const levels = ['unverified', 'basic', 'verified', 'premium', 'enterprise']
    const currentIndex = levels.indexOf(currentLevel)
    return ((currentIndex + 1) / levels.length) * 100
  }

  return (
    <div className="space-y-6">
      {/* Current Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-sikaremit-primary" />
            Verification Status
          </CardTitle>
          <CardDescription>
            Complete verification to unlock more features and build trust
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Current Level */}
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm text-muted-foreground mb-1">Current Level</div>
              <div className="text-2xl font-bold capitalize">{currentLevel}</div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground mb-1">Trust Score</div>
              <div className="text-2xl font-bold text-sikaremit-primary">{trustScore}/100</div>
            </div>
          </div>

          {/* Progress Bar */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Verification Progress</span>
              <span className="text-sm text-muted-foreground">{getLevelProgress().toFixed(0)}%</span>
            </div>
            <Progress value={getLevelProgress()} className="h-3" />
          </div>

          {/* Trust Badge Preview */}
          <TrustBadgeDisplay merchantId={merchantId} variant="compact" />
        </CardContent>
      </Card>

      {/* Next Level Card */}
      {nextLevel && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-sikaremit-primary" />
              Next Level: {nextLevel.details.name}
            </CardTitle>
            <CardDescription>
              Complete these requirements to upgrade your verification level
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Requirements */}
            <div>
              <div className="text-sm font-medium mb-2">Requirements</div>
              <div className="space-y-2">
                {nextLevel.details.requirements.map((req, index) => (
                  <div key={index} className="flex items-start gap-2">
                    <ChevronRight className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{req}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Benefits */}
            <div>
              <div className="text-sm font-medium mb-2">Benefits</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {nextLevel.details.benefits.map((benefit, index) => (
                  <div key={index} className="flex items-start gap-2 p-2 rounded-lg bg-muted">
                    <Award className="w-4 h-4 text-sikaremit-primary mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{benefit}</span>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5 text-sikaremit-primary" />
            Upload Verification Documents
          </CardTitle>
          <CardDescription>
            Submit required documents for verification review
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Upload Form */}
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="doc-type">Document Type</Label>
              <Select value={selectedDocType} onValueChange={setSelectedDocType}>
                <SelectTrigger id="doc-type">
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  {documentTypes.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="file-upload">Upload File</Label>
              <Input
                id="file-upload"
                type="file"
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) handleDocumentUpload(file)
                }}
                disabled={!selectedDocType || uploading}
                accept=".pdf,.jpg,.jpeg,.png"
              />
              <p className="text-xs text-muted-foreground">
                Accepted formats: PDF, JPG, PNG (Max 10MB)
              </p>
            </div>
          </div>

          {/* Submitted Documents */}
          {documents.length > 0 && (
            <div className="space-y-2 pt-4 border-t">
              <div className="text-sm font-medium mb-3">Submitted Documents</div>
              <div className="space-y-2">
                {documents.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-lg border"
                  >
                    <div className="flex items-center gap-3">
                      {getStatusIcon(doc.status)}
                      <div>
                        <div className="text-sm font-medium">
                          {documentTypes.find(t => t.value === doc.document_type)?.label}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          Submitted {new Date(doc.submitted_at).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <Badge variant={getStatusBadge(doc.status) as any}>
                      {doc.status.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
